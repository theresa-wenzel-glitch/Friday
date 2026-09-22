"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, datenAbgleichen, einstellungSetzen } from "./db";
import { POSITIONEN, type Position } from "./datenquelle/typen";
import { punktesystemLesen, STANDARD_PUNKTESYSTEM, type Punktesystem } from "./punkte";
import {
  adminAnmelden,
  aktuellerNutzer,
  istAdmin,
  sitzungBeenden,
  sitzungSetzen,
} from "./sitzung";

/*
 * Alle schreibenden Vorgänge. Jede Aktion prüft die Regeln hier auf dem Server
 * noch einmal, unabhängig davon, was die Oberfläche anzeigt oder verhindert.
 */

export interface Zustand {
  ok?: string;
  fehler?: string;
}

function text(formData: FormData, feld: string): string {
  return String(formData.get(feld) ?? "").trim();
}

function zahl(formData: FormData, feld: string): number | null {
  const roh = text(formData, feld);
  if (roh === "") return null;
  const n = Number(roh);
  return Number.isInteger(n) ? n : null;
}

/* --- Anmeldung ----------------------------------------------------------- */

export async function anmeldenAktion(_zustand: Zustand, formData: FormData): Promise<Zustand> {
  const name = text(formData, "name");
  if (name.length < 2) return { fehler: "Bitte gib einen Namen mit mindestens zwei Zeichen ein." };
  if (name.length > 24) return { fehler: "Der Name darf höchstens 24 Zeichen haben." };

  const vorhanden = db().prepare("SELECT id FROM nutzer WHERE name = ?").get(name) as
    | { id: number }
    | undefined;

  let id = vorhanden?.id;
  if (!id) {
    const ergebnis = db()
      .prepare(
        "INSERT INTO nutzer (name, zeichen, rolle, erstellt) VALUES (?, ?, 'nutzer', ?)",
      )
      .run(name, `zeichen-${randomInt(1, 7)}`, new Date().toISOString());
    id = Number(ergebnis.lastInsertRowid);
  }

  await sitzungSetzen(id);
  redirect("/");
}

export async function abmeldenAktion(): Promise<void> {
  await sitzungBeenden();
  redirect("/anmelden");
}

/* --- Tippabgabe ----------------------------------------------------------- */

interface SpielRegel {
  id: string;
  anstoss: string;
  status: string;
  heim_id: string;
  gast_id: string;
}

/**
 * Die einzige Stelle, an der entschieden wird, ob noch getippt werden darf.
 * Maßgeblich ist die Serverzeit, nicht die Uhr des Geräts.
 */
function tippfristOffen(spiel: SpielRegel): boolean {
  return spiel.status === "geplant" && new Date(spiel.anstoss).getTime() > Date.now();
}

export async function tippSpeichern(_zustand: Zustand, formData: FormData): Promise<Zustand> {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) return { fehler: "Bitte melde dich zuerst an." };

  const spielId = text(formData, "spielId");
  const toreHeim = zahl(formData, "toreHeim");
  const toreGast = zahl(formData, "toreGast");

  if (toreHeim === null || toreGast === null) {
    return { fehler: "Bitte trage für beide Mannschaften eine Torzahl ein." };
  }
  if (toreHeim < 0 || toreGast < 0 || toreHeim > 20 || toreGast > 20) {
    return { fehler: "Torzahlen müssen zwischen 0 und 20 liegen." };
  }

  const spiel = db()
    .prepare("SELECT id, anstoss, status, heim_id, gast_id FROM spiel WHERE id = ?")
    .get(spielId) as SpielRegel | undefined;
  if (!spiel) return { fehler: "Dieses Spiel gibt es nicht." };
  if (!tippfristOffen(spiel)) return { fehler: "Die Tippfrist ist abgelaufen." };

  db()
    .prepare(
      `INSERT INTO tipp (nutzer_id, spiel_id, tore_heim, tore_gast, abgegeben)
       VALUES (@nutzer, @spiel, @heim, @gast, @zeit)
       ON CONFLICT(nutzer_id, spiel_id) DO UPDATE SET
         tore_heim = excluded.tore_heim,
         tore_gast = excluded.tore_gast,
         abgegeben = excluded.abgegeben`,
    )
    .run({
      nutzer: nutzer.id,
      spiel: spielId,
      heim: toreHeim,
      gast: toreGast,
      zeit: new Date().toISOString(),
    });

  revalidatePath("/");
  revalidatePath("/spiele");
  revalidatePath(`/spiele/${spielId}`);
  revalidatePath("/tipps");
  return { ok: "Dein Tipp wurde gespeichert." };
}

export async function spielerTippSpeichern(
  _zustand: Zustand,
  formData: FormData,
): Promise<Zustand> {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) return { fehler: "Bitte melde dich zuerst an." };

  const spielId = text(formData, "spielId");
  const spiel = db()
    .prepare("SELECT id, anstoss, status, heim_id, gast_id FROM spiel WHERE id = ?")
    .get(spielId) as SpielRegel | undefined;
  if (!spiel) return { fehler: "Dieses Spiel gibt es nicht." };
  if (!tippfristOffen(spiel)) return { fehler: "Die Tippfrist ist abgelaufen." };

  const auswahl: Array<{ position: Position; spielerId: string }> = [];
  for (const position of POSITIONEN) {
    const spielerId = text(formData, `spieler-${position}`);
    if (spielerId === "") continue;

    const spieler = db()
      .prepare("SELECT id, position, mannschaft_id FROM spieler WHERE id = ?")
      .get(spielerId) as { id: string; position: Position; mannschaft_id: string } | undefined;

    if (!spieler) return { fehler: "Ein ausgewählter Spieler ist unbekannt." };
    if (spieler.position !== position) {
      return { fehler: `${spieler.id} spielt nicht auf der Position ${position}.` };
    }
    if (spieler.mannschaft_id !== spiel.heim_id && spieler.mannschaft_id !== spiel.gast_id) {
      return { fehler: "Es sind nur Spieler der beiden beteiligten Mannschaften erlaubt." };
    }
    auswahl.push({ position, spielerId });
  }

  const zeit = new Date().toISOString();
  const schreiben = db().transaction(() => {
    db().prepare("DELETE FROM spieler_tipp WHERE nutzer_id = ? AND spiel_id = ?")
      .run(nutzer.id, spielId);
    const einfuegen = db().prepare(
      `INSERT INTO spieler_tipp (nutzer_id, spiel_id, position, spieler_id, abgegeben)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const a of auswahl) einfuegen.run(nutzer.id, spielId, a.position, a.spielerId, zeit);
  });
  schreiben();

  revalidatePath(`/spiele/${spielId}`);
  return {
    ok:
      auswahl.length === 0
        ? "Deine Spielerauswahl wurde zurückgesetzt."
        : `Spielerauswahl gespeichert (${auswahl.length} von 4 Positionen).`,
  };
}

/* --- Ligen ---------------------------------------------------------------- */

const CODE_ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne I, O, 0, 1

function codeErzeugen(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ZEICHEN[randomInt(0, CODE_ZEICHEN.length)];
  return code;
}

function freierCode(): string {
  for (let versuch = 0; versuch < 25; versuch++) {
    const code = codeErzeugen();
    const belegt = db().prepare("SELECT 1 FROM liga WHERE code = ?").get(code);
    if (!belegt) return code;
  }
  throw new Error("Es konnte kein freier Beitrittscode erzeugt werden.");
}

function punktesystemAusFormular(formData: FormData): Punktesystem {
  const nimm = (feld: string, standard: number) => {
    const wert = zahl(formData, feld);
    if (wert === null) return standard;
    return Math.min(50, Math.max(0, wert));
  };
  return {
    exakt: nimm("p-exakt", STANDARD_PUNKTESYSTEM.exakt),
    differenz: nimm("p-differenz", STANDARD_PUNKTESYSTEM.differenz),
    tendenz: nimm("p-tendenz", STANDARD_PUNKTESYSTEM.tendenz),
    falsch: nimm("p-falsch", STANDARD_PUNKTESYSTEM.falsch),
    spielerTor: nimm("p-spieler-tor", STANDARD_PUNKTESYSTEM.spielerTor),
    spielerVorlage: nimm("p-spieler-vorlage", STANDARD_PUNKTESYSTEM.spielerVorlage),
    torwartZuNull: nimm("p-torwart", STANDARD_PUNKTESYSTEM.torwartZuNull),
  };
}

export async function ligaErstellen(_zustand: Zustand, formData: FormData): Promise<Zustand> {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) return { fehler: "Bitte melde dich zuerst an." };

  const name = text(formData, "name");
  if (name.length < 3) return { fehler: "Der Liganame braucht mindestens drei Zeichen." };
  if (name.length > 40) return { fehler: "Der Liganame darf höchstens 40 Zeichen haben." };

  const wettbewerbId = text(formData, "wettbewerb");
  const wettbewerb = db().prepare("SELECT id FROM wettbewerb WHERE id = ?").get(wettbewerbId);
  if (!wettbewerb) return { fehler: "Bitte wähle einen Wettbewerb aus." };

  const oeffentlich = text(formData, "sichtbarkeit") === "oeffentlich";
  const passcode = text(formData, "passcode");
  if (passcode && passcode.length < 4) {
    return { fehler: "Ein Liga-Passwort braucht mindestens vier Zeichen." };
  }

  const zeichen = text(formData, "zeichen") || "zeichen-1";
  const beschreibung = text(formData, "beschreibung").slice(0, 280);
  const sprache = text(formData, "sprache") || "de";
  const code = freierCode();

  const ergebnis = db()
    .prepare(
      `INSERT INTO liga (name, beschreibung, oeffentlich, code, passcode, zeichen,
                         punktesystem, wettbewerb_id, sprache, gruender_id, erstellt)
       VALUES (@name, @beschreibung, @oeffentlich, @code, @passcode, @zeichen,
               @punktesystem, @wettbewerb, @sprache, @gruender, @erstellt)`,
    )
    .run({
      name,
      beschreibung,
      oeffentlich: oeffentlich ? 1 : 0,
      code,
      passcode: passcode || null,
      zeichen,
      punktesystem: JSON.stringify(punktesystemAusFormular(formData)),
      wettbewerb: wettbewerbId,
      sprache,
      gruender: nutzer.id,
      erstellt: new Date().toISOString(),
    });

  const ligaId = Number(ergebnis.lastInsertRowid);
  db()
    .prepare("INSERT INTO mitglied (liga_id, nutzer_id, beigetreten) VALUES (?, ?, ?)")
    .run(ligaId, nutzer.id, new Date().toISOString());

  revalidatePath("/ligen");
  redirect(`/ligen/${ligaId}`);
}

export async function ligaBeitreten(_zustand: Zustand, formData: FormData): Promise<Zustand> {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) return { fehler: "Bitte melde dich zuerst an." };

  const code = text(formData, "code").replace(/\s|-/g, "");
  if (code.length === 0) return { fehler: "Bitte gib einen Beitrittscode ein." };

  const liga = db()
    .prepare("SELECT id, passcode, gesperrt FROM liga WHERE UPPER(code) = UPPER(?)")
    .get(code) as { id: number; passcode: string | null; gesperrt: number } | undefined;

  if (!liga) return { fehler: "Zu diesem Code gibt es keine Liga." };
  if (liga.gesperrt === 1) return { fehler: "Diese Liga ist gesperrt." };

  if (liga.passcode) {
    const eingabe = text(formData, "passcode");
    if (eingabe !== liga.passcode) return { fehler: "Das Liga-Passwort stimmt nicht." };
  }

  const drin = db()
    .prepare("SELECT 1 FROM mitglied WHERE liga_id = ? AND nutzer_id = ?")
    .get(liga.id, nutzer.id);
  if (drin) redirect(`/ligen/${liga.id}`);

  db()
    .prepare("INSERT INTO mitglied (liga_id, nutzer_id, beigetreten) VALUES (?, ?, ?)")
    .run(liga.id, nutzer.id, new Date().toISOString());

  revalidatePath("/ligen");
  redirect(`/ligen/${liga.id}`);
}

export async function ligaVerlassen(_zustand: Zustand, formData: FormData): Promise<Zustand> {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) return { fehler: "Bitte melde dich zuerst an." };

  const ligaId = zahl(formData, "ligaId");
  if (ligaId === null) return { fehler: "Liga nicht gefunden." };

  const liga = db().prepare("SELECT id, gruender_id FROM liga WHERE id = ?").get(ligaId) as
    | { id: number; gruender_id: number }
    | undefined;
  if (!liga) return { fehler: "Liga nicht gefunden." };

  const verlassen = db().transaction(() => {
    db().prepare("DELETE FROM mitglied WHERE liga_id = ? AND nutzer_id = ?")
      .run(ligaId, nutzer.id);

    if (liga.gruender_id === nutzer.id) {
      // Die Liga soll nicht führungslos zurückbleiben: das dienstälteste
      // verbliebene Mitglied übernimmt, sonst wird die Liga aufgelöst.
      const naechster = db()
        .prepare("SELECT nutzer_id FROM mitglied WHERE liga_id = ? ORDER BY beigetreten LIMIT 1")
        .get(ligaId) as { nutzer_id: number } | undefined;
      if (naechster) {
        db().prepare("UPDATE liga SET gruender_id = ? WHERE id = ?").run(naechster.nutzer_id, ligaId);
      } else {
        db().prepare("DELETE FROM liga WHERE id = ?").run(ligaId);
      }
    }
  });
  verlassen();

  revalidatePath("/ligen");
  redirect("/ligen");
}

export async function ligaSichtbarkeit(_zustand: Zustand, formData: FormData): Promise<Zustand> {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) return { fehler: "Bitte melde dich zuerst an." };

  const ligaId = zahl(formData, "ligaId");
  const liga = db().prepare("SELECT id, gruender_id, oeffentlich FROM liga WHERE id = ?").get(ligaId) as
    | { id: number; gruender_id: number; oeffentlich: number }
    | undefined;
  if (!liga) return { fehler: "Liga nicht gefunden." };
  if (liga.gruender_id !== nutzer.id) {
    return { fehler: "Das darf nur die Person, die die Liga gegründet hat." };
  }

  const neu = liga.oeffentlich === 1 ? 0 : 1;
  db().prepare("UPDATE liga SET oeffentlich = ? WHERE id = ?").run(neu, liga.id);
  revalidatePath(`/ligen/${liga.id}`);
  revalidatePath("/ligen/entdecken");
  return { ok: neu === 1 ? "Die Liga ist jetzt öffentlich." : "Die Liga ist jetzt privat." };
}

export async function ligaMelden(_zustand: Zustand, formData: FormData): Promise<Zustand> {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) return { fehler: "Bitte melde dich zuerst an." };

  const ligaId = zahl(formData, "ligaId");
  const grund = text(formData, "grund").slice(0, 500);
  if (!ligaId || grund.length < 5) return { fehler: "Bitte beschreibe kurz, was das Problem ist." };

  db()
    .prepare("INSERT INTO meldung (liga_id, melder_id, grund, erstellt) VALUES (?, ?, ?, ?)")
    .run(ligaId, nutzer.id, grund, new Date().toISOString());

  return { ok: "Danke, die Meldung ist bei der Moderation eingegangen." };
}

/* --- Profil ---------------------------------------------------------------- */

export async function profilSpeichern(_zustand: Zustand, formData: FormData): Promise<Zustand> {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) return { fehler: "Bitte melde dich zuerst an." };

  const name = text(formData, "name");
  if (name.length < 2 || name.length > 24) {
    return { fehler: "Der Name braucht zwischen 2 und 24 Zeichen." };
  }
  const belegt = db().prepare("SELECT id FROM nutzer WHERE name = ? AND id <> ?").get(name, nutzer.id);
  if (belegt) return { fehler: "Diesen Namen gibt es schon." };

  const thema = ["dunkel", "hell", "system"].includes(text(formData, "thema"))
    ? text(formData, "thema")
    : "dunkel";
  const sprache = text(formData, "sprache") || "de";
  const zeichen = text(formData, "zeichen") || nutzer.zeichen;
  const hinweise = formData.get("hinweise") === "an" ? 1 : 0;

  db()
    .prepare("UPDATE nutzer SET name = ?, zeichen = ?, thema = ?, sprache = ?, hinweise = ? WHERE id = ?")
    .run(name, zeichen, thema, sprache, hinweise, nutzer.id);

  revalidatePath("/", "layout");
  return { ok: "Deine Einstellungen wurden gespeichert." };
}

export async function kontoLoeschen(_zustand: Zustand, formData: FormData): Promise<Zustand> {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) return { fehler: "Bitte melde dich zuerst an." };
  if (text(formData, "bestaetigung") !== nutzer.name) {
    return { fehler: "Bitte tippe zur Bestätigung deinen Namen genau so ein, wie er oben steht." };
  }

  const loeschen = db().transaction(() => {
    db().prepare("DELETE FROM tipp WHERE nutzer_id = ?").run(nutzer.id);
    db().prepare("DELETE FROM spieler_tipp WHERE nutzer_id = ?").run(nutzer.id);
    db().prepare("DELETE FROM mitglied WHERE nutzer_id = ?").run(nutzer.id);
    db().prepare("UPDATE meldung SET melder_id = NULL WHERE melder_id = ?").run(nutzer.id);
    // Ligen, die sonst führungslos wären, gehen an ein verbliebenes Mitglied.
    const eigene = db().prepare("SELECT id FROM liga WHERE gruender_id = ?").all(nutzer.id) as Array<{
      id: number;
    }>;
    for (const liga of eigene) {
      const naechster = db()
        .prepare("SELECT nutzer_id FROM mitglied WHERE liga_id = ? ORDER BY beigetreten LIMIT 1")
        .get(liga.id) as { nutzer_id: number } | undefined;
      if (naechster) {
        db().prepare("UPDATE liga SET gruender_id = ? WHERE id = ?").run(naechster.nutzer_id, liga.id);
      } else {
        db().prepare("DELETE FROM liga WHERE id = ?").run(liga.id);
      }
    }
    db().prepare("DELETE FROM nutzer WHERE id = ?").run(nutzer.id);
  });
  loeschen();

  await sitzungBeenden();
  redirect("/anmelden");
}

/* --- Adminbereich ----------------------------------------------------------- */

export async function adminAnmeldenAktion(_zustand: Zustand, formData: FormData): Promise<Zustand> {
  const passwort = text(formData, "passwort");
  if (!process.env.ADMIN_PASSWORT) {
    return { fehler: "Es ist kein ADMIN_PASSWORT gesetzt. Trage es in .env.local ein." };
  }
  const geschafft = await adminAnmelden(passwort);
  if (!geschafft) return { fehler: "Das Passwort stimmt nicht." };
  redirect("/admin");
}

async function adminPruefen(): Promise<Zustand | null> {
  if (!(await istAdmin())) return { fehler: "Dafür fehlt dir die Berechtigung." };
  return null;
}

export async function ergebnisSpeichern(_zustand: Zustand, formData: FormData): Promise<Zustand> {
  const verweigert = await adminPruefen();
  if (verweigert) return verweigert;

  const spielId = text(formData, "spielId");
  const status = text(formData, "status");
  if (!["geplant", "laeuft", "beendet", "abgesagt"].includes(status)) {
    return { fehler: "Unbekannter Spielstatus." };
  }

  const toreHeim = zahl(formData, "toreHeim");
  const toreGast = zahl(formData, "toreGast");
  if (status === "beendet" && (toreHeim === null || toreGast === null)) {
    return { fehler: "Für ein beendetes Spiel braucht es beide Torzahlen." };
  }
  if ((toreHeim !== null && toreHeim < 0) || (toreGast !== null && toreGast < 0)) {
    return { fehler: "Torzahlen können nicht negativ sein." };
  }

  const vorhanden = db().prepare("SELECT id FROM spiel WHERE id = ?").get(spielId);
  if (!vorhanden) return { fehler: "Dieses Spiel gibt es nicht." };

  db()
    .prepare(
      "UPDATE spiel SET status = ?, tore_heim = ?, tore_gast = ?, korrigiert = 1 WHERE id = ?",
    )
    .run(status, toreHeim, toreGast, spielId);

  revalidatePath("/", "layout");
  return {
    ok: "Ergebnis gespeichert. Alle Punktestände sind sofort neu gerechnet.",
  };
}

export async function abgleichStarten(): Promise<Zustand> {
  const verweigert = await adminPruefen();
  if (verweigert) return verweigert;
  const bericht = await datenAbgleichen();
  revalidatePath("/", "layout");
  return {
    ok:
      `Abgleich mit "${bericht.quelle}" fertig: ${bericht.spiele} Spiele, ` +
      `${bericht.mannschaften} Mannschaften, ${bericht.spieler} Spieler. ` +
      `${bericht.uebersprungen} von Hand korrigierte Spiele blieben unverändert.`,
  };
}

export async function standardPunktesystemSpeichern(
  _zustand: Zustand,
  formData: FormData,
): Promise<Zustand> {
  const verweigert = await adminPruefen();
  if (verweigert) return verweigert;
  const system = punktesystemAusFormular(formData);
  einstellungSetzen("punktesystem", JSON.stringify(system));
  revalidatePath("/", "layout");
  return { ok: "Standard-Punktesystem gespeichert. Es gilt für neu gegründete Ligen." };
}

export async function ligaSperren(_zustand: Zustand, formData: FormData): Promise<Zustand> {
  const verweigert = await adminPruefen();
  if (verweigert) return verweigert;

  const ligaId = zahl(formData, "ligaId");
  const grund = text(formData, "grund").slice(0, 200);
  const liga = db().prepare("SELECT id, gesperrt FROM liga WHERE id = ?").get(ligaId) as
    | { id: number; gesperrt: number }
    | undefined;
  if (!liga) return { fehler: "Liga nicht gefunden." };

  const neu = liga.gesperrt === 1 ? 0 : 1;
  db()
    .prepare("UPDATE liga SET gesperrt = ?, sperrgrund = ? WHERE id = ?")
    .run(neu, neu === 1 ? grund || "Ohne Angabe" : null, liga.id);

  revalidatePath("/admin");
  revalidatePath("/ligen/entdecken");
  return { ok: neu === 1 ? "Liga gesperrt." : "Sperre aufgehoben." };
}

export async function meldungErledigen(_zustand: Zustand, formData: FormData): Promise<Zustand> {
  const verweigert = await adminPruefen();
  if (verweigert) return verweigert;
  const id = zahl(formData, "meldungId");
  if (id === null) return { fehler: "Meldung nicht gefunden." };
  db().prepare("UPDATE meldung SET erledigt = 1 WHERE id = ?").run(id);
  revalidatePath("/admin");
  return { ok: "Meldung als erledigt abgehakt." };
}

export async function standardPunktesystemLesen(): Promise<Punktesystem> {
  const roh = db().prepare("SELECT wert FROM einstellung WHERE schluessel = 'punktesystem'").get() as
    | { wert: string }
    | undefined;
  return punktesystemLesen(roh?.wert);
}

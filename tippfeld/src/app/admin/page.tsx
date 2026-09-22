import Link from "next/link";
import {
  AbgleichKnopf,
  ErgebnisFormular,
  MeldungKnopf,
  PunktesystemFormular,
  SperrFormular,
} from "@/components/AdminFormulare";
import { Kopfleiste } from "@/components/Kopfleiste";
import { Symbol } from "@/components/Symbol";
import { aktuellerSpieltag, spieltage } from "@/lib/abfragen";
import { standardPunktesystemLesen } from "@/lib/aktionen";
import { aktiveQuelle } from "@/lib/datenquelle";
import { db, letzterAbgleich } from "@/lib/db";
import { adminErforderlich } from "@/lib/sitzung";
import { anstossKurz } from "@/lib/zeit";

export const dynamic = "force-dynamic";

interface AdminSpiel {
  id: string;
  status: string;
  tore_heim: number | null;
  tore_gast: number | null;
  korrigiert: number;
  anstoss: string;
  heim: string;
  gast: string;
}

export default async function AdminSeite({
  searchParams,
}: {
  searchParams: Promise<{ spieltag?: string }>;
}) {
  await adminErforderlich();
  const p = await searchParams;

  const alle = spieltage();
  const gewuenscht = Number(p.spieltag);
  const spieltag =
    Number.isFinite(gewuenscht) && alle.some((s) => s.spieltag === gewuenscht)
      ? gewuenscht
      : aktuellerSpieltag();

  const spiele = db()
    .prepare(
      `SELECT sp.id, sp.status, sp.tore_heim, sp.tore_gast, sp.korrigiert, sp.anstoss,
              h.name AS heim, g.name AS gast
         FROM spiel sp
         JOIN mannschaft h ON h.id = sp.heim_id
         JOIN mannschaft g ON g.id = sp.gast_id
        WHERE sp.spieltag = ? ORDER BY sp.anstoss`,
    )
    .all(spieltag) as AdminSpiel[];

  const ligen = db()
    .prepare(
      `SELECT l.id, l.name, l.oeffentlich, l.gesperrt, l.sperrgrund,
              (SELECT COUNT(*) FROM mitglied m WHERE m.liga_id = l.id) AS mitglieder
         FROM liga l ORDER BY l.gesperrt DESC, mitglieder DESC, l.name`,
    )
    .all() as Array<{
    id: number;
    name: string;
    oeffentlich: number;
    gesperrt: number;
    sperrgrund: string | null;
    mitglieder: number;
  }>;

  const meldungen = db()
    .prepare(
      `SELECT me.id, me.grund, me.erstellt, l.name AS liga, n.name AS melder
         FROM meldung me
         LEFT JOIN liga l ON l.id = me.liga_id
         LEFT JOIN nutzer n ON n.id = me.melder_id
        WHERE me.erledigt = 0 ORDER BY me.erstellt DESC`,
    )
    .all() as Array<{ id: number; grund: string; erstellt: string; liga: string | null; melder: string | null }>;

  const quelle = aktiveQuelle();
  const abgleich = letzterAbgleich();
  const standard = await standardPunktesystemLesen();

  const zahlen = db()
    .prepare(
      `SELECT (SELECT COUNT(*) FROM nutzer) AS nutzer,
              (SELECT COUNT(*) FROM tipp) AS tipps,
              (SELECT COUNT(*) FROM spiel) AS spiele,
              (SELECT COUNT(*) FROM spiel WHERE korrigiert = 1) AS korrigiert`,
    )
    .get() as { nutzer: number; tipps: number; spiele: number; korrigiert: number };

  return (
    <>
      <Kopfleiste titel="Adminbereich" zurueck="/profil" />
      <main className="inhalt" id="inhalt">
        <p className="band">
          <Symbol name="schloss" className="tf-symbol tf-symbol--klein" />
          <span>
            Dieser Bereich ist nur mit dem Admin-Passwort erreichbar. Normale Konten kommen hier
            nicht herein, auch nicht über die Adresse.
          </span>
        </p>

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Überblick</h2>
          </div>
          <div className="kacheln">
            <div className="kachel">
              <span className="tf-label">Konten</span>
              <span className="kachel__wert tf-zahl">{zahlen.nutzer}</span>
            </div>
            <div className="kachel">
              <span className="tf-label">Abgegebene Tipps</span>
              <span className="kachel__wert tf-zahl">{zahlen.tipps}</span>
            </div>
            <div className="kachel">
              <span className="tf-label">Spiele</span>
              <span className="kachel__wert tf-zahl">{zahlen.spiele}</span>
            </div>
            <div className="kachel">
              <span className="tf-label">Von Hand gesetzt</span>
              <span className="kachel__wert tf-zahl">{zahlen.korrigiert}</span>
              <span className="winzig leise">bleiben beim Abgleich unverändert</span>
            </div>
          </div>
        </section>

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Datenquelle</h2>
          </div>
          <article className="tf-karte">
            <div className="reihe reihe--verteilt">
              <strong>{quelle.name}</strong>
              <span className={`tf-chip ${quelle.istDemo ? "tf-chip--remis" : "tf-chip--sieg"}`}>
                {quelle.istDemo ? "Demo-Daten" : "Live-Daten"}
              </span>
            </div>
            <p className="klein leise" style={{ margin: 0 }}>
              {quelle.lizenzhinweis}
            </p>
            <p className="klein" style={{ margin: 0 }}>
              {abgleich
                ? `Letzter Abgleich: ${anstossKurz(abgleich.zeitpunkt)} · ${abgleich.spiele} Spiele, ${abgleich.uebersprungen} übersprungen.`
                : "Es wurde noch kein Abgleich ausgeführt."}
            </p>
            <AbgleichKnopf />
          </article>
        </section>

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Ergebnisse und Spieltage</h2>
          </div>
          <nav aria-label="Spieltag wählen" className="tabellenrahmen">
            <div className="reihe" style={{ flexWrap: "nowrap", paddingBottom: 4 }}>
              {alle.map((s) => (
                <Link
                  key={s.spieltag}
                  href={`/admin?spieltag=${s.spieltag}`}
                  className="tf-chip"
                  style={
                    s.spieltag === spieltag
                      ? { background: "var(--tf-akzent)", color: "var(--tf-text-auf-akzent)", height: 34, minWidth: 44 }
                      : { height: 34, minWidth: 44 }
                  }
                  aria-current={s.spieltag === spieltag ? "page" : undefined}
                >
                  {s.spieltag}
                </Link>
              ))}
            </div>
          </nav>
          <div className="stapel">
            {spiele.map((s) => (
              <article key={s.id} className="tf-karte">
                <span className="winzig leise">{anstossKurz(s.anstoss)}</span>
                <ErgebnisFormular
                  spielId={s.id}
                  heim={s.heim}
                  gast={s.gast}
                  status={s.status}
                  toreHeim={s.tore_heim}
                  toreGast={s.tore_gast}
                  korrigiert={s.korrigiert === 1}
                />
              </article>
            ))}
          </div>
          <p className="winzig leise">
            Ein von Hand gesetztes Ergebnis wird beim nächsten Abgleich nicht überschrieben. Alle
            Punktestände werden sofort neu gerechnet, gespeicherte Punkte gibt es nicht.
          </p>
        </section>

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Standard-Punktesystem</h2>
          </div>
          <article className="tf-karte">
            <PunktesystemFormular standard={standard} />
          </article>
        </section>

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Ligen moderieren</h2>
            <span className="klein leise">{ligen.length}</span>
          </div>
          <div className="stapel stapel--eng">
            {ligen.map((liga) => (
              <article key={liga.id} className={`tf-karte ${liga.gesperrt ? "tf-karte--niederlage" : ""}`}>
                <div className="reihe reihe--verteilt">
                  <span className="klein">
                    <Link href={`/ligen/${liga.id}`}>{liga.name}</Link>
                    <br />
                    <span className="winzig leise">
                      {liga.mitglieder} Mitglieder · {liga.oeffentlich ? "öffentlich" : "privat"}
                      {liga.gesperrt ? ` · gesperrt: ${liga.sperrgrund ?? ""}` : ""}
                    </span>
                  </span>
                </div>
                <SperrFormular ligaId={liga.id} gesperrt={liga.gesperrt === 1} name={liga.name} />
              </article>
            ))}
            {ligen.length === 0 ? <p className="leer">Es gibt noch keine Ligen.</p> : null}
          </div>
        </section>

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Offene Meldungen</h2>
            <span className="klein leise">{meldungen.length}</span>
          </div>
          <div className="stapel stapel--eng">
            {meldungen.map((m) => (
              <article key={m.id} className="tf-karte tf-karte--remis">
                <span className="winzig leise">
                  {anstossKurz(m.erstellt)} · Liga {m.liga ?? "gelöscht"} · gemeldet von{" "}
                  {m.melder ?? "gelöschtem Konto"}
                </span>
                <p className="klein" style={{ margin: 0 }}>
                  {m.grund}
                </p>
                <MeldungKnopf meldungId={m.id} />
              </article>
            ))}
            {meldungen.length === 0 ? <p className="leer">Nichts offen.</p> : null}
          </div>
        </section>
      </main>
    </>
  );
}

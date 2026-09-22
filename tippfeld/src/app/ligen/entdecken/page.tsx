import Image from "next/image";
import Link from "next/link";
import { Kopfleiste } from "@/components/Kopfleiste";
import { OeffentlichBeitreten } from "@/components/OeffentlichBeitreten";
import { Symbol } from "@/components/Symbol";
import { aktuellerSpieltag, oeffentlicheLigen, wettbewerbe, type Sortierung } from "@/lib/abfragen";
import { nutzerErforderlich } from "@/lib/sitzung";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const SPRACHEN: Record<string, string> = {
  de: "Deutsch",
  en: "Englisch",
  tr: "Türkisch",
  pl: "Polnisch",
};

export default async function EntdeckenSeite({
  searchParams,
}: {
  searchParams: Promise<{ suche?: string; sortierung?: string; wettbewerb?: string; sprache?: string }>;
}) {
  const nutzer = await nutzerErforderlich();
  const p = await searchParams;
  const sortierung: Sortierung =
    p.sortierung === "neu" || p.sortierung === "gross" ? p.sortierung : "beliebt";

  const ligen = oeffentlicheLigen({
    suche: p.suche,
    sortierung,
    wettbewerbId: p.wettbewerb || undefined,
    sprache: p.sprache || undefined,
  });

  const meine = new Set(
    (
      db().prepare("SELECT liga_id FROM mitglied WHERE nutzer_id = ?").all(nutzer.id) as Array<{
        liga_id: number;
      }>
    ).map((z) => z.liga_id),
  );

  const spieltag = aktuellerSpieltag();
  const alleWettbewerbe = wettbewerbe();

  return (
    <>
      <Kopfleiste titel="Öffentliche Ligen" zurueck="/ligen" />
      <main className="inhalt" id="inhalt">
        <form method="get" className="stapel">
          <div className="feld">
            <label htmlFor="suche">Suchen</label>
            <input
              id="suche"
              name="suche"
              className="eingabe"
              defaultValue={p.suche ?? ""}
              placeholder="Name oder Stichwort"
            />
          </div>

          <div className="kacheln">
            <div className="feld">
              <label htmlFor="sortierung">Sortierung</label>
              <select id="sortierung" name="sortierung" className="auswahl" defaultValue={sortierung}>
                <option value="beliebt">Beliebteste</option>
                <option value="neu">Neueste</option>
                <option value="gross">Nach Teilnehmerzahl</option>
              </select>
            </div>
            <div className="feld">
              <label htmlFor="wettbewerb">Wettbewerb</label>
              <select id="wettbewerb" name="wettbewerb" className="auswahl" defaultValue={p.wettbewerb ?? ""}>
                <option value="">alle</option>
                {alleWettbewerbe.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="feld">
              <label htmlFor="sprache">Sprache</label>
              <select id="sprache" name="sprache" className="auswahl" defaultValue={p.sprache ?? ""}>
                <option value="">alle</option>
                {Object.entries(SPRACHEN).map(([kuerzel, name]) => (
                  <option key={kuerzel} value={kuerzel}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="tf-knopf tf-knopf--zweit tf-knopf--breit">
            <Symbol name="filter" className="tf-symbol tf-symbol--klein" />
            Anwenden
          </button>
        </form>

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">{ligen.length} Ligen</h2>
            <span className="klein leise">Spieltag {spieltag}</span>
          </div>
          <div className="stapel">
            {ligen.map((liga) => (
              <article key={liga.id} className="tf-karte">
                <div className="reihe" style={{ flexWrap: "nowrap" }}>
                  <Image src={`/grafik/${liga.zeichen}.svg`} alt="" width={44} height={44} />
                  <span className="wachsen">
                    <strong>{liga.name}</strong>
                    <br />
                    <span className="winzig leise">
                      {liga.mitglieder} Mitglieder · {liga.wettbewerbName} ·{" "}
                      {SPRACHEN[liga.sprache] ?? liga.sprache}
                    </span>
                  </span>
                </div>
                {liga.beschreibung ? <p className="klein" style={{ margin: 0 }}>{liga.beschreibung}</p> : null}
                <div className="reihe reihe--verteilt">
                  <span className="winzig leise">Spieltag {spieltag} läuft</span>
                  {meine.has(liga.id) ? (
                    <Link href={`/ligen/${liga.id}`} className="tf-knopf tf-knopf--zweit">
                      Du bist dabei
                    </Link>
                  ) : liga.hatPasscode ? (
                    <Link href={`/ligen/beitreten/${liga.code}`} className="tf-knopf tf-knopf--zweit">
                      Mit Passwort beitreten
                    </Link>
                  ) : (
                    <OeffentlichBeitreten code={liga.code} />
                  )}
                </div>
              </article>
            ))}
            {ligen.length === 0 ? (
              <p className="leer">
                Keine öffentliche Liga passt zu dieser Suche. Vielleicht gründest du selbst eine?
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}

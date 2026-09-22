import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FormReihe } from "@/components/FormReihe";
import { Kopfleiste } from "@/components/Kopfleiste";
import { KopierKnopf } from "@/components/KopierKnopf";
import { MeldeFormular, SichtbarkeitKnopf, VerlassenKnopf } from "@/components/LigaKnoepfe";
import { OeffentlichBeitreten } from "@/components/OeffentlichBeitreten";
import { Symbol } from "@/components/Symbol";
import { aktuellerSpieltag, istMitglied, ligaLaden, rangliste, spieltage } from "@/lib/abfragen";
import { einladungsAdresse, qrAlsSvg } from "@/lib/qr";
import { nutzerErforderlich } from "@/lib/sitzung";

export const dynamic = "force-dynamic";

export default async function LigaSeite({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ spieltag?: string }>;
}) {
  const nutzer = await nutzerErforderlich();
  const { id } = await params;
  const p = await searchParams;

  const ligaId = Number(id);
  if (!Number.isInteger(ligaId)) notFound();
  const liga = ligaLaden(ligaId);
  if (!liga) notFound();

  const mitglied = istMitglied(liga.id, nutzer.id);
  if (!mitglied && !liga.oeffentlich) {
    // Private Ligen zeigen Fremden nichts - auch keine Mitgliederliste.
    redirect(`/ligen/beitreten/${liga.code}`);
  }

  const alleSpieltage = spieltage();
  const gewuenscht = Number(p.spieltag);
  const nurSpieltag =
    Number.isFinite(gewuenscht) && alleSpieltage.some((s) => s.spieltag === gewuenscht)
      ? gewuenscht
      : undefined;

  const tabelle = rangliste(liga.id, nurSpieltag);
  const eigen = tabelle.find((z) => z.nutzerId === nutzer.id);
  const aktuell = aktuellerSpieltag();

  const adresse = await einladungsAdresse(liga.code);
  const qr = mitglied ? await qrAlsSvg(adresse) : null;

  return (
    <>
      <Kopfleiste titel={liga.name} zurueck="/ligen" />
      <main className="inhalt" id="inhalt">
        {liga.gesperrt ? (
          <p className="band band--fehler">
            <Symbol name="schloss" className="tf-symbol tf-symbol--klein" />
            <span>
              Diese Liga wurde von der Moderation gesperrt.{" "}
              {liga.sperrgrund ? `Grund: ${liga.sperrgrund}` : ""}
            </span>
          </p>
        ) : null}

        <article className="tf-karte">
          <div className="reihe" style={{ flexWrap: "nowrap" }}>
            <Image src={`/grafik/${liga.zeichen}.svg`} alt="" width={52} height={52} />
            <span className="wachsen">
              <strong>{liga.name}</strong>
              <br />
              <span className="winzig leise">
                {liga.mitglieder} Mitglieder · {liga.oeffentlich ? "öffentlich" : "privat"} ·{" "}
                {liga.wettbewerbName}
              </span>
            </span>
          </div>
          {liga.beschreibung ? <p className="klein" style={{ margin: 0 }}>{liga.beschreibung}</p> : null}
          <span className="winzig leise">Gegründet von {liga.gruenderName}</span>
          {!mitglied ? <OeffentlichBeitreten code={liga.code} /> : null}
        </article>

        {mitglied ? (
          <section>
            <div className="abschnitt__kopf">
              <h2 className="abschnitt__titel">Einladen</h2>
            </div>
            <article className="tf-karte">
              <p className="code-anzeige tf-zahl">{liga.code}</p>
              {qr ? (
                <div className="qr-flaeche" dangerouslySetInnerHTML={{ __html: qr }} />
              ) : null}
              <p className="winzig leise" style={{ textAlign: "center", margin: 0 }}>
                Im QR-Code steht nur die Beitrittsadresse dieser Liga, sonst nichts.
              </p>
              <div className="reihe">
                <KopierKnopf text={liga.code} beschriftung="Code kopieren" />
                <KopierKnopf text={adresse} beschriftung="Einladungslink kopieren" />
              </div>
            </article>
          </section>
        ) : null}

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Rangliste</h2>
            {eigen ? <span className="tf-chip tf-chip--akzent">Dein Platz: {eigen.platz}</span> : null}
          </div>

          <nav aria-label="Rangliste eingrenzen" className="reihe" style={{ marginBottom: "var(--tf-raum-3)" }}>
            <Link
              href={`/ligen/${liga.id}`}
              className="tf-chip"
              style={
                nurSpieltag === undefined
                  ? { background: "var(--tf-akzent)", color: "var(--tf-text-auf-akzent)", height: 32 }
                  : { height: 32 }
              }
              aria-current={nurSpieltag === undefined ? "page" : undefined}
            >
              Gesamt
            </Link>
            <Link
              href={`/ligen/${liga.id}?spieltag=${aktuell}`}
              className="tf-chip"
              style={
                nurSpieltag === aktuell
                  ? { background: "var(--tf-akzent)", color: "var(--tf-text-auf-akzent)", height: 32 }
                  : { height: 32 }
              }
              aria-current={nurSpieltag === aktuell ? "page" : undefined}
            >
              Spieltag {aktuell}
            </Link>
            {nurSpieltag !== undefined && nurSpieltag !== aktuell ? (
              <span
                className="tf-chip"
                style={{ background: "var(--tf-akzent)", color: "var(--tf-text-auf-akzent)", height: 32 }}
              >
                Spieltag {nurSpieltag}
              </span>
            ) : null}
          </nav>

          <article className="tf-karte">
            <div className="tabellenrahmen">
              <table className="tf-rangliste">
                <caption className="versteckt">
                  Rangliste der Liga {liga.name}
                  {nurSpieltag ? `, Spieltag ${nurSpieltag}` : ", gesamte Saison"}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Pl.</th>
                    <th scope="col">Name</th>
                    <th scope="col" className="tf-rangliste__zahl">Richtig</th>
                    <th scope="col" className="tf-rangliste__zahl">Exakt</th>
                    <th scope="col" className="tf-rangliste__zahl">Punkte</th>
                    <th scope="col">Form</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelle.map((zeile) => (
                    <tr key={zeile.nutzerId} aria-current={zeile.nutzerId === nutzer.id ? "true" : undefined}>
                      <td className="tf-rangliste__platz">{zeile.platz}</td>
                      <td>{zeile.nutzerId === nutzer.id ? `${zeile.name} (du)` : zeile.name}</td>
                      <td className="tf-rangliste__zahl">{zeile.richtige}</td>
                      <td className="tf-rangliste__zahl">{zeile.exakte}</td>
                      <td className="tf-rangliste__zahl">{zeile.punkte}</td>
                      <td>
                        <FormReihe form={zeile.form} titel={`Tippform ${zeile.name}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tabelle.length === 0 ? <p className="klein leise">Noch keine Mitglieder.</p> : null}
            <p className="winzig leise" style={{ margin: 0 }}>
              „Richtig“ zählt alle Tipps mit richtiger Tendenz. Die Form zeigt die letzten fünf
              gewerteten Tipps: S steht für ein exaktes Ergebnis, U für richtige Tendenz, N für
              danebengelegen.
            </p>
          </article>
        </section>

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Punktesystem dieser Liga</h2>
          </div>
          <article className="tf-karte">
            <div className="tabellenrahmen">
              <table className="tf-rangliste">
                <tbody>
                  <tr><td>Exaktes Ergebnis</td><td className="tf-rangliste__zahl">{liga.punktesystem.exakt}</td></tr>
                  <tr><td>Richtige Tordifferenz</td><td className="tf-rangliste__zahl">{liga.punktesystem.differenz}</td></tr>
                  <tr><td>Richtige Tendenz</td><td className="tf-rangliste__zahl">{liga.punktesystem.tendenz}</td></tr>
                  <tr><td>Danebengelegen</td><td className="tf-rangliste__zahl">{liga.punktesystem.falsch}</td></tr>
                  <tr><td>Getippter Spieler trifft</td><td className="tf-rangliste__zahl">+{liga.punktesystem.spielerTor}</td></tr>
                  <tr><td>Getippter Spieler legt auf</td><td className="tf-rangliste__zahl">+{liga.punktesystem.spielerVorlage}</td></tr>
                  <tr><td>Torwart ohne Gegentor</td><td className="tf-rangliste__zahl">+{liga.punktesystem.torwartZuNull}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="winzig leise" style={{ margin: 0 }}>
              Die Ergebnisstufen zählen nicht zusammen: Es gilt immer nur die beste erreichte Stufe.
              Bei einem Unentschieden gibt es die Tendenzpunkte, denn die Tordifferenz ist dann
              zwangsläufig gleich.
            </p>
          </article>
        </section>

        {mitglied ? (
          <section className="stapel">
            {liga.gruenderId === nutzer.id ? (
              <SichtbarkeitKnopf ligaId={liga.id} oeffentlich={liga.oeffentlich} />
            ) : null}
            <MeldeFormular ligaId={liga.id} />
            <VerlassenKnopf ligaId={liga.id} istGruender={liga.gruenderId === nutzer.id} />
          </section>
        ) : null}
      </main>
    </>
  );
}

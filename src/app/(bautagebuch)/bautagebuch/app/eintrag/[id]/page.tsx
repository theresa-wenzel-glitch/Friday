import Link from "next/link";
import { notFound } from "next/navigation";
import { datumKurz, StatusChip } from "@/components/bautagebuch/EintragListe";
import { EntwurfFormular, NachtragFormular } from "@/components/bautagebuch/Formulare";
import { Icon } from "@/components/bautagebuch/Icon";
import { getEintrag, listMedien, listNachtraege } from "@/lib/bautagebuch/db";
import { zeitDe } from "@/lib/bautagebuch/pdf";
import { brauchtSitzung } from "@/lib/bautagebuch/sitzung";
import { FELDER } from "@/lib/bautagebuch/types";
import { wetterZeile } from "@/lib/bautagebuch/wetter";
import { entwurfLoeschenAction } from "../../../actions";

export const metadata = { title: "Eintrag" };

export default async function EintragSeite({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ neu?: string; hinweis?: string; abgeschlossen?: string }>;
}) {
  const { betrieb } = await brauchtSitzung();
  const { id } = await params;
  const q = await searchParams;
  const e = getEintrag(betrieb.id, Number(id));
  if (!e) notFound();

  const medien = listMedien(e.id);
  const fotos = medien.filter((m) => m.art === "foto");
  const audios = medien.filter((m) => m.art === "audio");
  const nachtraege = listNachtraege(e.id);
  const entwurf = e.status === "entwurf";

  return (
    <div className="space-y-5">
      <Link href={`/bautagebuch/app/baustellen/${e.baustelleId}`} className="inline-flex items-center gap-1 text-sm btb-muted no-underline">
        <Icon name="zurueck" size={16} /> {e.baustelleName}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">{datumKurz(e.datum)}</h1>
          <p className="btb-muted">{e.baustelleName}</p>
        </div>
        <StatusChip e={e} />
      </header>

      {q.neu && (
        <p className="btb-notice btb-notice-ok" role="status">
          <strong>Eintrag erstellt.</strong> Bitte kurz gegenlesen und dann abschließen.
        </p>
      )}
      {q.hinweis && <p className="btb-notice btb-notice-warn text-sm">{q.hinweis}</p>}
      {q.abgeschlossen && !entwurf && (
        <p className="btb-notice btb-notice-ok" role="status">
          <strong>Abgeschlossen als Nr. {e.nr}.</strong> Der Eintrag ist jetzt festgeschrieben und mit Prüfsumme gesichert.
        </p>
      )}
      {entwurf && e.daten.fehlend.length > 0 && (
        <p className="btb-notice btb-notice-info text-sm">
          <strong>Nicht erwähnt:</strong> {e.daten.fehlend.join(", ")}. Wenn bekannt, unten ergänzen.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <a
          href={`/api/bautagebuch/eintraege/${e.id}/pdf`}
          target="_blank"
          rel="noopener"
          className="btb-btn btb-btn-secondary"
        >
          <Icon name="pdf" /> PDF ansehen
        </a>
        {entwurf ? (
          <a href="#abschliessen" className="btb-btn btb-btn-primary">
            <Icon name="schloss" /> Abschließen
          </a>
        ) : (
          <Link href={`/bautagebuch/pruefen/${e.hash}`} className="btb-btn btb-btn-secondary">
            <Icon name="haken" /> Echtheit
          </Link>
        )}
      </div>
      {/* Fotos */}
      {fotos.length > 0 && (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {fotos.map((f, i) => (
            <a key={f.id} href={`/api/bautagebuch/medien/${f.id}`} target="_blank" rel="noopener" className="block overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/bautagebuch/medien/${f.id}`} alt={`Foto ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
            </a>
          ))}
        </section>
      )}

      {/* Inhalte */}
      <section className="btb-card p-4 space-y-4">
        <div>
          <span className="btb-label">Wetter (gemessen)</span>
          <p>{wetterZeile(e.wetter)}</p>
        </div>
        {entwurf ? (
          <EntwurfFormular id={e.id} datum={e.datum} daten={e.daten} />
        ) : (
          FELDER.map((f) => (
            <div key={f.key}>
              <span className="btb-label">{f.label}</span>
              <p className="whitespace-pre-line">{e.daten[f.key] || <span className="btb-muted">- keine Angabe -</span>}</p>
            </div>
          ))
        )}
      </section>

      {!entwurf && (
        <section className="btb-card p-4 space-y-4">
          <h2 className="text-lg">Nachträge</h2>
          {nachtraege.length === 0 ? (
            <p className="text-sm btb-muted">
              Der Eintrag ist festgeschrieben. Korrekturen und Ergänzungen kommen als Nachtrag dazu - mit Zeitstempel, das
              Original bleibt sichtbar.
            </p>
          ) : (
            <ul className="space-y-3">
              {nachtraege.map((n) => (
                <li key={n.id}>
                  <p className="text-xs btb-muted">
                    {zeitDe(n.createdAt)} Uhr · {n.von}
                  </p>
                  <p className="whitespace-pre-line">{n.text}</p>
                </li>
              ))}
            </ul>
          )}
          <NachtragFormular id={e.id} />
        </section>
      )}

      {/* Original-Aufnahmen */}
      <section className="btb-card p-4 space-y-3">
        <h2 className="text-lg">Original</h2>
        {audios.map((a) => (
          <audio key={a.id} src={`/api/bautagebuch/medien/${a.id}`} controls className="w-full" preload="none" />
        ))}
        <div>
          <span className="btb-label">{audios.length > 0 ? "Abgetippt / eingegeben" : "Eingegeben"}</span>
          <p className="whitespace-pre-line text-sm">{e.transkript || <span className="btb-muted">-</span>}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="btb-muted">Erfasst</dt>
          <dd>
            {zeitDe(e.erfasstAm)} Uhr von {e.erfasstVon} ({e.quelle === "telegram" ? "Telegram" : "App"})
          </dd>
          {e.lat !== null && e.lon !== null && (
            <>
              <dt className="btb-muted">Standort</dt>
              <dd>
                {e.lat.toFixed(5)}, {e.lon.toFixed(5)}
              </dd>
            </>
          )}
          <dt className="btb-muted">Auswertung</dt>
          <dd>{e.kiModus === "ki" ? "KI" : "Demo (ohne KI)"}</dd>
          {!entwurf && (
            <>
              <dt className="btb-muted">Abgeschlossen</dt>
              <dd>
                {zeitDe(e.abgeschlossenAm!)} Uhr von {e.abgeschlossenVon}
              </dd>
              <dt className="btb-muted">Prüfsumme</dt>
              <dd className="break-all font-mono text-xs">{e.hash}</dd>
            </>
          )}
        </dl>
      </section>

      {entwurf && (
        <form action={entwurfLoeschenAction} className="text-center">
          <input type="hidden" name="id" value={e.id} />
          <button type="submit" className="btb-btn btb-btn-danger">
            <Icon name="muell" size={18} /> Entwurf löschen
          </button>
        </form>
      )}
    </div>
  );
}

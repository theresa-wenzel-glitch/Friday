import Link from "next/link";
import type { Horse } from "@/lib/types";
import { countryLabel, pedigreeLine, summaryLine } from "@/lib/labels";
import { isUploadedPhoto, photoSrc } from "@/lib/photo";

export function HorseCard({ horse }: { horse: Horse }) {
  const pedigree = pedigreeLine(horse);
  const country = countryLabel(horse.country);
  const photo = photoSrc(horse);

  return (
    <Link
      href={`/hengste/${horse.slug}`}
      className="surface rounded-xl p-4 no-underline flex flex-col gap-2 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Kleines Vorschaubild. Die meisten Einträge haben keines - die
              Karte muss deshalb auch ohne Bild vollständig aussehen. */}
          {photo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photo}
              alt=""
              loading="lazy"
              referrerPolicy={isUploadedPhoto(horse) ? undefined : "no-referrer"}
              className="w-14 h-14 rounded-lg object-cover shrink-0"
              style={{ border: "1px solid var(--line)" }}
            />
          )}
          <h3 className="text-lg leading-snug min-w-0">
            {horse.name}
            {horse.aka && (
              <span className="muted font-normal text-sm"> „{horse.aka}“</span>
            )}
          </h3>
        </div>
        {horse.isHistoric && (
          <span className="chip shrink-0" title="Historischer Vererber">
            historisch
          </span>
        )}
      </div>

      <p className="text-sm muted">{summaryLine(horse)}</p>

      {pedigree && (
        <p className="text-sm" style={{ fontFamily: "var(--font-display)" }}>
          {pedigree}
        </p>
      )}

      <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
        {horse.disciplines.slice(0, 3).map((d) => (
          <span key={d} className="chip">
            {d}
          </span>
        ))}
        {country && <span className="chip">{country}</span>}
      </div>
    </Link>
  );
}

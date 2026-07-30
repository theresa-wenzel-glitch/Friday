import Link from "next/link";
import type { Horse } from "@/lib/types";
import { countryLabel, pedigreeLine, summaryLine } from "@/lib/labels";
import { HorsePortrait } from "./HorsePortrait";

export function HorseCard({ horse }: { horse: Horse }) {
  const pedigree = pedigreeLine(horse);
  const country = countryLabel(horse.country);

  return (
    <Link
      href={`/hengste/${horse.slug}`}
      className="surface rounded-xl p-4 no-underline flex flex-col gap-2 transition-shadow hover:shadow-md"
    >
      <HorsePortrait
        name={horse.name}
        color={horse.color}
        photoUrl={horse.photoUrl}
        variant="card"
      />

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg leading-snug">
          {horse.name}
          {horse.aka && (
            <span className="muted font-normal text-sm"> „{horse.aka}“</span>
          )}
        </h3>
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

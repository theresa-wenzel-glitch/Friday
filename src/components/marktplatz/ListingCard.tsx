import Link from "next/link";
import type { Listing } from "@/lib/marketplace-types";
import { formatPrice } from "@/lib/marketplace-types";
import { countryLabel, SEX_LABEL } from "@/lib/labels";
import { HorsePortrait } from "@/components/HorsePortrait";

export function ListingCard({ listing }: { listing: Listing }) {
  const country = countryLabel(listing.country);

  return (
    <Link
      href={`/marktplatz/pferde/${listing.slug}`}
      className="surface rounded-xl p-4 no-underline flex flex-col gap-2 transition-shadow hover:shadow-md"
    >
      <div className="relative">
        <HorsePortrait
          name={listing.name}
          color={listing.color}
          photoUrl={listing.photoUrl}
          variant="card"
        />
        <span
          className="chip absolute top-2 left-2"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-fg)", borderColor: "transparent" }}
        >
          {listing.kind === "stud" ? "Deckhengst" : "Verkaufspferd"}
        </span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg leading-snug">{listing.name}</h3>
      </div>

      <p className="text-sm muted">
        {[SEX_LABEL[listing.sex], listing.yearOfBirth, listing.color, listing.breed]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <p className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        {listing.kind === "stud" ? "Decktaxe " : "Preis "}
        {formatPrice(listing.priceCents, listing.priceCurrency)}
        {listing.priceLabel && (
          <span className="muted font-normal text-sm"> · {listing.priceLabel}</span>
        )}
      </p>

      <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
        {listing.disciplines.slice(0, 3).map((d) => (
          <span key={d} className="chip">
            {d}
          </span>
        ))}
        {country && <span className="chip">{country}</span>}
      </div>
    </Link>
  );
}

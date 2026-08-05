import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getListingBySlug, toPublicListing } from "@/lib/marketplace-db";
import { formatPrice } from "@/lib/marketplace-types";
import { countryLabel, SEX_LABEL } from "@/lib/labels";
import { HorsePortrait } from "@/components/HorsePortrait";
import { InquiryForm } from "@/components/marktplatz/InquiryForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = getListingBySlug(slug);
  if (!listing || listing.status !== "approved") return { title: "Nicht gefunden" };
  return { title: listing.name };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const raw = getListingBySlug(slug);
  if (!raw || raw.status !== "approved") notFound();
  const listing = toPublicListing(raw);

  const country = countryLabel(listing.country);

  const facts: [string, string | null][] = [
    ["Geschlecht", SEX_LABEL[listing.sex]],
    ["Geburtsjahr", listing.yearOfBirth ? String(listing.yearOfBirth) : null],
    ["Farbe", listing.color],
    ["Rasse", listing.breed],
    ["Ort", [listing.location, country].filter(Boolean).join(", ") || null],
    ["Disziplinen", listing.disciplines.join(", ") || null],
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/marktplatz/pferde" className="text-sm muted underline">
        ← Zurück zu den Inseraten
      </Link>

      <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_16rem]">
        <div>
          <div className="flex flex-wrap items-baseline gap-3 mb-1">
            <h1 className="text-3xl">{listing.name}</h1>
            <span className="chip">{listing.kind === "stud" ? "Deckhengst" : "Verkaufspferd"}</span>
          </div>

          <p
            className="text-xl font-semibold mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {listing.kind === "stud" ? "Decktaxe " : "Preis "}
            {formatPrice(listing.priceCents, listing.priceCurrency)}
            {listing.priceLabel && (
              <span className="muted font-normal text-base"> · {listing.priceLabel}</span>
            )}
          </p>

          <dl className="grid gap-1 mb-6 text-sm">
            {facts
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="muted min-w-32 shrink-0">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>

          {listing.description && (
            <p className="whitespace-pre-line mb-8">{listing.description}</p>
          )}

          <InquiryForm listingId={listing.id} />
        </div>

        <div className="sm:order-first sm:w-64">
          <HorsePortrait
            name={listing.name}
            color={listing.color}
            photoUrl={listing.photoUrl}
            variant="hero"
          />
        </div>
      </div>
    </div>
  );
}

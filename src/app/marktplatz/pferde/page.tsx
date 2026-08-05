import Link from "next/link";
import type { Metadata } from "next";
import { getListingFacets, queryListings } from "@/lib/marketplace-db";
import { ListingCard } from "@/components/marktplatz/ListingCard";
import { countryLabel } from "@/lib/labels";
import { DISCIPLINES } from "@/lib/types";
import type { ListingKind } from "@/lib/marketplace-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inserate",
  description: "Deckhengste und Verkaufspferde im Marktplatz - filterbar nach Rasse, Land und Preis.",
};

const PER_PAGE = 24;

type SearchParams = Record<string, string | string[] | undefined>;

function one(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  const str = Array.isArray(value) ? value[0] : value;
  return str?.trim() ? str.trim() : undefined;
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const kindRaw = one(params, "kind");
  const kind = kindRaw === "stud" || kindRaw === "sale" ? (kindRaw as ListingKind) : undefined;
  const search = one(params, "q");
  const breed = one(params, "breed");
  const discipline = one(params, "discipline");
  const country = one(params, "country");
  const sortRaw = one(params, "sort");
  const page = Math.max(Number(one(params, "page") ?? 1) || 1, 1);

  const sort =
    sortRaw === "priceAsc" || sortRaw === "priceDesc" || sortRaw === "name"
      ? sortRaw
      : ("newest" as const);

  const { listings, total } = queryListings({
    kind,
    search,
    breed,
    discipline,
    country,
    sort,
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
  });

  const facets = getListingFacets();
  const lastPage = Math.max(Math.ceil(total / PER_PAGE), 1);
  const hasFilter = Boolean(kind || search || breed || discipline || country);

  const pageHref = (target: number) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries({ kind, q: search, breed, discipline, country, sort: sortRaw })) {
      if (value) qs.set(key, value);
    }
    if (target > 1) qs.set("page", String(target));
    const s = qs.toString();
    return s ? `/marktplatz/pferde?${s}` : "/marktplatz/pferde";
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl mb-2">Inserate</h1>
      <p className="muted mb-8 max-w-2xl">
        Deckhengste und Verkaufspferde von Anbietern im Marktplatz.
      </p>

      <form method="get" className="surface rounded-xl p-4 mb-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="q">
              Suche
            </label>
            <input id="q" name="q" defaultValue={search ?? ""} className="field" placeholder="Name" />
          </div>

          <div>
            <label className="label" htmlFor="kind">
              Art
            </label>
            <select id="kind" name="kind" defaultValue={kind ?? ""} className="field">
              <option value="">alle</option>
              <option value="stud">Deckhengst</option>
              <option value="sale">Verkaufspferd</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="breed">
              Rasse
            </label>
            <select id="breed" name="breed" defaultValue={breed ?? ""} className="field">
              <option value="">alle</option>
              {facets.breeds.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="discipline">
              Disziplin
            </label>
            <select id="discipline" name="discipline" defaultValue={discipline ?? ""} className="field">
              <option value="">alle</option>
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="country">
              Land
            </label>
            <select id="country" name="country" defaultValue={country ?? ""} className="field">
              <option value="">alle</option>
              {facets.countries.map((c) => (
                <option key={c} value={c}>
                  {countryLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="sort">
              Sortierung
            </label>
            <select id="sort" name="sort" defaultValue={sortRaw ?? "newest"} className="field">
              <option value="newest">zuletzt eingestellt</option>
              <option value="name">Name A–Z</option>
              <option value="priceAsc">Preis aufsteigend</option>
              <option value="priceDesc">Preis absteigend</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button type="submit" className="btn btn-primary">
            Filtern
          </button>
          {hasFilter && (
            <Link href="/marktplatz/pferde" className="btn btn-secondary no-underline">
              Zurücksetzen
            </Link>
          )}
        </div>
      </form>

      <p className="text-sm muted mb-4">
        {total} {total === 1 ? "Treffer" : "Treffer"}
        {lastPage > 1 && ` · Seite ${page} von ${lastPage}`}
      </p>

      {listings.length === 0 ? (
        <div className="surface rounded-xl p-8 text-center">
          <p className="mb-4">Zu dieser Suche gibt es noch kein Inserat.</p>
          <Link href="/marktplatz/inserieren" className="btn btn-primary no-underline">
            Selbst inserieren
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <nav className="flex items-center justify-between gap-4 mt-8">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn btn-secondary no-underline">
              ← zurück
            </Link>
          ) : (
            <span />
          )}
          {page < lastPage ? (
            <Link href={pageHref(page + 1)} className="btn btn-secondary no-underline">
              weiter →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

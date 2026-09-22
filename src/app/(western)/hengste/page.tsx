import Link from "next/link";
import type { Metadata } from "next";
import { getFilterFacets, queryHorses } from "@/lib/db";
import { HorseCard } from "@/components/HorseCard";
import { countryLabel } from "@/lib/labels";
import { AVAILABILITY_LABEL } from "@/lib/labels";
import { AVAILABILITIES, type Availability, type Sex } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hengste",
  description:
    "Alle Hengste im Verzeichnis - filterbar nach Rasse, Disziplin, Land und Abstammung.",
};

const PER_PAGE = 24;

type SearchParams = Record<string, string | string[] | undefined>;

function one(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  const str = Array.isArray(value) ? value[0] : value;
  return str?.trim() ? str.trim() : undefined;
}

export default async function HorsesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const search = one(params, "q");
  const breed = one(params, "breed");
  const discipline = one(params, "discipline");
  const country = one(params, "country");
  const availability = one(params, "availability") as Availability | undefined;
  const historicRaw = one(params, "historic");
  const sortRaw = one(params, "sort");
  const page = Math.max(Number(one(params, "page") ?? 1) || 1, 1);

  const historic =
    historicRaw === "only" || historicRaw === "exclude" ? historicRaw : undefined;
  const sort =
    sortRaw === "newest" || sortRaw === "year" ? sortRaw : ("name" as const);

  const { horses, total } = queryHorses({
    search,
    breed,
    discipline,
    country,
    availability: AVAILABILITIES.includes(availability as Availability)
      ? availability
      : undefined,
    historic,
    sort,
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
  });

  const facets = getFilterFacets();
  const lastPage = Math.max(Math.ceil(total / PER_PAGE), 1);

  const hasFilter = Boolean(
    search || breed || discipline || country || availability || historic,
  );

  const pageHref = (target: number) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries({
      q: search,
      breed,
      discipline,
      country,
      availability,
      historic,
      sort: sortRaw,
    })) {
      if (value) qs.set(key, value);
    }
    if (target > 1) qs.set("page", String(target));
    const s = qs.toString();
    return s ? `/hengste?${s}` : "/hengste";
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl mb-2">Hengste im Verzeichnis</h1>
      <p className="muted mb-8 max-w-2xl">
        Die Suche findet auch Vater- und Mutternamen - eine Suche nach „Doc Bar“
        zeigt also auch dessen Nachkommen.
      </p>

      {/* Filter. Bewusst ein reines GET-Formular: die Filter stehen damit in der
          Adresszeile und lassen sich teilen und als Lesezeichen speichern. */}
      <form method="get" className="surface rounded-xl p-4 mb-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="q">
              Suche
            </label>
            <input
              id="q"
              name="q"
              defaultValue={search ?? ""}
              className="field"
              placeholder="Name, Abstammung, Station oder Besitzer"
            />
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
            <select
              id="discipline"
              name="discipline"
              defaultValue={discipline ?? ""}
              className="field"
            >
              <option value="">alle</option>
              {facets.disciplines.map((d) => (
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
            <select
              id="country"
              name="country"
              defaultValue={country ?? ""}
              className="field"
            >
              <option value="">alle</option>
              {facets.countries.map((c) => (
                <option key={c} value={c}>
                  {countryLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="availability">
              Verfügbarkeit
            </label>
            <select
              id="availability"
              name="availability"
              defaultValue={availability ?? ""}
              className="field"
            >
              <option value="">alle</option>
              {AVAILABILITIES.filter((a) => a !== "unknown").map((a) => (
                <option key={a} value={a}>
                  {AVAILABILITY_LABEL[a]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="historic">
              Bestand
            </label>
            <select
              id="historic"
              name="historic"
              defaultValue={historic ?? ""}
              className="field"
            >
              <option value="">alle</option>
              <option value="exclude">nur aktuelle Hengste</option>
              <option value="only">nur historische Vererber</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="sort">
              Sortierung
            </label>
            <select id="sort" name="sort" defaultValue={sortRaw ?? "name"} className="field">
              <option value="name">Name A–Z</option>
              <option value="year">Jahrgang, neueste zuerst</option>
              <option value="newest">zuletzt eingetragen</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button type="submit" className="btn btn-primary">
            Filtern
          </button>
          {hasFilter && (
            <Link href="/hengste" className="btn btn-secondary no-underline">
              Zurücksetzen
            </Link>
          )}
        </div>
      </form>

      <p className="text-sm muted mb-4">
        {total} {total === 1 ? "Treffer" : "Treffer"}
        {lastPage > 1 && ` · Seite ${page} von ${lastPage}`}
      </p>

      {horses.length === 0 ? (
        <div className="surface rounded-xl p-8 text-center">
          <p className="mb-4">
            Zu dieser Suche gibt es noch keinen Eintrag.
          </p>
          <Link href="/eintragen" className="btn btn-primary no-underline">
            Diesen Hengst eintragen
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {horses.map((horse) => (
            <HorseCard key={horse.id} horse={horse} />
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

import type { Prisma } from "@prisma/client";
import { COUNTRIES } from "./countries";

export type SearchParams = Record<string, string | string[] | undefined>;

export type StallionFilters = {
  q: string;
  region: string;
  country: string;
  breed: string;
  discipline: string;
  maxFee: number | null;
  semen: string;
  sort: string;
};

function one(params: SearchParams, key: string): string {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

export function readFilters(params: SearchParams): StallionFilters {
  const maxFeeRaw = Number(one(params, "maxFee"));

  return {
    q: one(params, "q").slice(0, 120),
    region: one(params, "region"),
    country: one(params, "country"),
    breed: one(params, "breed"),
    discipline: one(params, "discipline"),
    maxFee: Number.isFinite(maxFeeRaw) && maxFeeRaw > 0 ? maxFeeRaw : null,
    semen: one(params, "semen"),
    sort: one(params, "sort") || "name",
  };
}

/**
 * Baut die Prisma-Abfrage aus den Filtern.
 * Hinweis: Die Textsuche nutzt `contains`. Unter SQLite ist das fuer
 * ASCII-Zeichen ohnehin gross-/kleinschreibungsunabhaengig.
 */
export function stallionWhere(f: StallionFilters): Prisma.StallionWhereInput {
  const and: Prisma.StallionWhereInput[] = [{ published: true }];

  if (f.q) {
    and.push({
      OR: [
        { name: { contains: f.q } },
        { barnName: { contains: f.q } },
        { sireName: { contains: f.q } },
        { damName: { contains: f.q } },
        { damSireName: { contains: f.q } },
        { standingAt: { contains: f.q } },
        { registrationNo: { contains: f.q } },
      ],
    });
  }

  if (f.region === "EU" || f.region === "US" || f.region === "WORLD") {
    and.push({ region: f.region });
  }

  if (f.country && f.country in COUNTRIES) {
    and.push({ country: f.country });
  }

  if (f.breed) and.push({ breed: f.breed });
  if (f.discipline) and.push({ discipline: f.discipline });

  if (f.maxFee !== null) {
    and.push({ studFee: { lte: f.maxFee, not: null } });
  }

  if (f.semen === "frozen") and.push({ frozenSemen: true });
  if (f.semen === "shipped") and.push({ shippedSemen: true });
  if (f.semen === "live") and.push({ liveCover: true });
  if (f.semen === "eu") and.push({ availableInEu: true });

  return { AND: and };
}

export function stallionOrderBy(sort: string): Prisma.StallionOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }];
    case "youngest":
      return [{ yearOfBirth: "desc" }, { name: "asc" }];
    case "oldest":
      return [{ yearOfBirth: "asc" }, { name: "asc" }];
    case "feeAsc":
      return [{ studFee: "asc" }, { name: "asc" }];
    case "feeDesc":
      return [{ studFee: "desc" }, { name: "asc" }];
    default:
      return [{ name: "asc" }];
  }
}

/** Auswahl fuer die Kachelansicht — bewusst ohne Bilddaten (Bytes). */
export const stallionCardSelect = {
  slug: true,
  name: true,
  yearOfBirth: true,
  color: true,
  breed: true,
  discipline: true,
  sireName: true,
  damName: true,
  damSireName: true,
  country: true,
  standingAt: true,
  studFee: true,
  currency: true,
  feeOnRequest: true,
  frozenSemen: true,
  shippedSemen: true,
  verified: true,
  photos: {
    select: { id: true, externalUrl: true, mimeType: true },
    orderBy: { sortOrder: "asc" },
    take: 1,
  },
} satisfies Prisma.StallionSelect;

/** Baut einen Query-String, in dem einzelne Filter ueberschrieben sind. */
export function withParam(
  current: SearchParams,
  changes: Record<string, string | null>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw) search.set(key, raw);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") search.delete(key);
    else search.set(key, value);
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

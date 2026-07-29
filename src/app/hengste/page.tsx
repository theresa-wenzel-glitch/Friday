import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { StallionCard } from "@/components/StallionCard";
import { StallionFiltersBar } from "@/components/StallionFilters";
import {
  readFilters,
  stallionCardSelect,
  stallionOrderBy,
  stallionWhere,
  type SearchParams,
} from "@/lib/queries";

export const metadata: Metadata = {
  title: "Alle Hengste",
  description:
    "Reining-Hengste aus Europa, den USA und weltweit — mit Daten, Fotos, Abstammung und Kontakt zum Besitzer.",
};

export const dynamic = "force-dynamic";

export default async function StallionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = readFilters(params);

  const [stallions, breedRows, disciplineRows] = await Promise.all([
    prisma.stallion.findMany({
      where: stallionWhere(filters),
      orderBy: stallionOrderBy(filters.sort),
      select: stallionCardSelect,
      take: 200,
    }),
    prisma.stallion.findMany({
      where: { published: true },
      distinct: ["breed"],
      select: { breed: true },
      orderBy: { breed: "asc" },
    }),
    prisma.stallion.findMany({
      where: { published: true },
      distinct: ["discipline"],
      select: { discipline: true },
      orderBy: { discipline: "asc" },
    }),
  ]);

  return (
    <div className="container page stack">
      <div className="section-title">
        <h1 style={{ margin: 0 }}>Hengste</h1>
        <span className="muted small">
          {stallions.length}
          {stallions.length === 200 ? "+" : ""}{" "}
          {stallions.length === 1 ? "Hengst" : "Hengste"} gefunden
        </span>
      </div>

      <StallionFiltersBar
        filters={filters}
        params={params}
        breeds={breedRows.map((r) => r.breed)}
        disciplines={disciplineRows.map((r) => r.discipline)}
      />

      {stallions.length === 0 ? (
        <div className="empty">
          <h3>Kein Hengst passt zu dieser Suche</h3>
          <p style={{ marginBottom: 0 }}>
            Versuch es mit weniger Filtern — oder trag den Hengst selbst ein.
          </p>
        </div>
      ) : (
        <div className="grid">
          {stallions.map((stallion) => (
            <StallionCard key={stallion.slug} stallion={stallion} />
          ))}
        </div>
      )}
    </div>
  );
}

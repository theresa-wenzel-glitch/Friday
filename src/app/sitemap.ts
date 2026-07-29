import type { MetadataRoute } from "next";
import { queryHorses } from "@/lib/db";

export const dynamic = "force-dynamic";

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/hengste`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/eintragen`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/info`, changeFrequency: "yearly", priority: 0.4 },
  ];

  // Alle freigegebenen Pferde. Bei sehr grossen Beständen müsste das auf
  // mehrere Sitemap-Dateien aufgeteilt werden (Grenze: 50.000 Einträge).
  const { horses } = queryHorses({ limit: 200, offset: 0 });
  const pages: MetadataRoute.Sitemap = [];
  let offset = 0;

  for (let batch = horses; batch.length > 0; ) {
    for (const horse of batch) {
      pages.push({
        url: `${base}/hengste/${horse.slug}`,
        lastModified: new Date(horse.updatedAt),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
    offset += 200;
    if (offset >= 50_000) break;
    batch = queryHorses({ limit: 200, offset }).horses;
  }

  return [...staticPages, ...pages];
}

import { prisma } from "./db";

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Erzeugt einen eindeutigen Slug; haengt bei Bedarf -2, -3 ... an. */
export async function uniqueSlug(name: string, ignoreId?: string): Promise<string> {
  const base = slugify(name) || "hengst";
  let candidate = base;
  let counter = 2;

  for (;;) {
    const existing = await prisma.stallion.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

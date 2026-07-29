/**
 * Grunddatenbank bekannter Reining-Vererber.
 *
 * Bewusste Entscheidungen:
 *  - Es stehen nur Angaben drin, die als gesichert gelten. Unsichere Felder
 *    bleiben leer, statt geraten zu werden — in einer Abstammungsdatenbank ist
 *    eine Luecke deutlich besser als ein falscher Vater.
 *  - Es sind keine Kontaktdaten hinterlegt. Adressen realer Personen werden
 *    nicht erfunden; Besitzer tragen sie selbst ein.
 *  - Der vollstaendige Stammbaum wird nicht kopiert, sondern pro Pferd zu
 *    allbreedpedigree.com verlinkt.
 *
 * Das Skript ist wiederholbar: bestehende Referenzeintraege werden aktualisiert,
 * von Benutzern eingetragene Hengste bleiben unangetastet.
 */

import { PrismaClient } from "@prisma/client";
import { regionForCountry } from "../src/lib/countries";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();

type SeedStallion = {
  name: string;
  barnName?: string;
  yearOfBirth?: number;
  color?: string;
  breed?: string;
  registry?: string;
  discipline?: string;
  country?: string;
  sireName?: string;
  sireSireName?: string;
  sireDamName?: string;
  damName?: string;
  damSireName?: string;
  damDamName?: string;
  description?: string;
};

const STALLIONS: SeedStallion[] = [
  {
    name: "Hollywood Dun It",
    yearOfBirth: 1983,
    color: "Buckskin",
    registry: "AQHA",
    sireName: "Hollywood Jac 86",
    damName: "Blossom Berry",
    description:
      "Einer der einflussreichsten Reining-Vererber überhaupt und Namensgeber unzähliger 'Dun It'-Nachkommen. NRHA Hall of Fame. Verstorben 2005 — Anpaarungen nur noch über Tiefgefriersamen.",
  },
  {
    name: "Colonels Smoking Gun",
    barnName: "Gunner",
    yearOfBirth: 1993,
    color: "Sorrel Overo",
    breed: "Paint Horse",
    registry: "APHA",
    sireName: "Colonelfourfreckle",
    damName: "Katie Gun",
    damSireName: "Zan Parr Bar",
    description:
      "Der wohl bekannteste gescheckte Reining-Hengst. Seine Nachkommen prägen den Sport bis heute. Verstorben 2017.",
  },
  {
    name: "Smart Chic Olena",
    yearOfBirth: 1988,
    color: "Sorrel",
    registry: "AQHA",
    sireName: "Smart Little Lena",
    sireSireName: "Doc O'Lena",
    sireDamName: "Smart Peppy",
    damName: "Gay Sugar Chic",
    description:
      "Vererber mit enormer Breitenwirkung in Reining und Reined Cow Horse. Verstorben 2010.",
  },
  {
    name: "Smart Little Lena",
    yearOfBirth: 1979,
    color: "Sorrel",
    registry: "AQHA",
    discipline: "Cutting",
    sireName: "Doc O'Lena",
    sireSireName: "Doc Bar",
    sireDamName: "Poco Lena",
    damName: "Smart Peppy",
    damSireName: "Peppy San",
    description:
      "Cutting-Legende und über Söhne wie Smart Chic Olena einer der wichtigsten Blutlinienbringer der Reining.",
  },
  {
    name: "Doc O'Lena",
    yearOfBirth: 1967,
    color: "Sorrel",
    registry: "AQHA",
    discipline: "Cutting",
    sireName: "Doc Bar",
    sireSireName: "Lightning Bar",
    sireDamName: "Dandy Doll",
    damName: "Poco Lena",
    damSireName: "Poco Bueno",
    description:
      "Fundament vieler moderner Performance-Pedigrees. Über Smart Little Lena bis heute in nahezu jedem Reining-Stammbaum zu finden.",
  },
  {
    name: "Peppy San Badger",
    yearOfBirth: 1974,
    color: "Sorrel",
    registry: "AQHA",
    discipline: "Cutting",
    sireName: "Mr San Peppy",
    damName: "Sugar Badger",
    damSireName: "Grey Badger III",
    description:
      "'Little Peppy' — prägender Vererber der Cutting- und Cow-Horse-Linien, häufig in Mutterlinien von Reining-Pferden.",
  },
  {
    name: "Topsail Whiz",
    yearOfBirth: 1987,
    color: "Sorrel",
    registry: "AQHA",
    sireName: "Topsail Cody",
    damName: "Jeanie Whiz Bar",
    description:
      "Begründer der 'Whiz'-Linie und einer der erfolgreichsten Reining-Vererber seiner Generation.",
  },
  {
    name: "Shining Spark",
    yearOfBirth: 1989,
    color: "Palomino",
    registry: "AQHA",
    sireName: "Genuine Doc",
    damName: "Diamonds Sparkle",
    description:
      "Ausnahmevererber für Reining und Allround; seine Nachkommen sind in nahezu allen Westerndisziplinen erfolgreich. Verstorben 2018.",
  },
  {
    name: "Wimpys Little Step",
    yearOfBirth: 2000,
    color: "Palomino",
    registry: "AQHA",
    sireName: "Nu Chex To Cash",
    damName: "Leolita Step",
    damSireName: "Great Pine",
    description:
      "NRHA Futurity Champion 2002 und einer der meistgefragten Vererber der Moderne.",
  },
  {
    name: "Nu Chex To Cash",
    yearOfBirth: 1990,
    color: "Sorrel",
    registry: "AQHA",
    description:
      "Vater von Wimpys Little Step und damit Ausgangspunkt einer der wichtigsten Vererberlinien der Gegenwart.",
  },
  {
    name: "Smart Spook",
    yearOfBirth: 2001,
    color: "Sorrel",
    registry: "AQHA",
    sireName: "Smart Chic Olena",
    sireSireName: "Smart Little Lena",
    sireDamName: "Gay Sugar Chic",
    damName: "Sugar N Spook",
    description: "NRHA Futurity Champion 2004 und erfolgreicher Vererber.",
  },
  {
    name: "Magnum Chic Dream",
    yearOfBirth: 1996,
    color: "Sorrel",
    registry: "AQHA",
    sireName: "Smart Chic Olena",
    sireSireName: "Smart Little Lena",
    sireDamName: "Gay Sugar Chic",
    description:
      "Vielseitiger Vererber mit starker Präsenz auch in der europäischen Zucht.",
  },
  {
    name: "Spooks Gotta Gun",
    color: "Sorrel",
    registry: "AQHA",
    sireName: "Colonels Smoking Gun",
    sireSireName: "Colonelfourfreckle",
    sireDamName: "Katie Gun",
    description: "Gunner-Sohn und Vater des NRHA-Futurity-Siegers Spooks Gotta Whiz.",
  },
  {
    name: "Spooks Gotta Whiz",
    yearOfBirth: 2008,
    registry: "AQHA",
    sireName: "Spooks Gotta Gun",
    sireSireName: "Colonels Smoking Gun",
    damName: "Prettywhizprettysmart",
    damSireName: "Topsail Whiz",
    description: "NRHA Futurity Champion 2011, heute selbst gefragter Vererber.",
  },
  {
    name: "Gunnatrashya",
    yearOfBirth: 2007,
    registry: "AQHA",
    sireName: "Colonels Smoking Gun",
    sireSireName: "Colonelfourfreckle",
    sireDamName: "Katie Gun",
    description: "NRHA Futurity Champion 2010 (Andrea Fappani) und erfolgreicher Gunner-Sohn.",
  },
  {
    name: "Gunners Special Nite",
    registry: "AQHA",
    sireName: "Colonels Smoking Gun",
    sireSireName: "Colonelfourfreckle",
    sireDamName: "Katie Gun",
    description: "Gunner-Sohn mit fester Größe in der internationalen Reining-Zucht.",
  },
  {
    name: "ARC Gunnabeabigstar",
    registry: "AQHA",
    sireName: "Colonels Smoking Gun",
    sireSireName: "Colonelfourfreckle",
    sireDamName: "Katie Gun",
    description: "Gunner-Sohn, erfolgreich im Sport und in der Zucht.",
  },
  {
    name: "Dun It With A Twist",
    registry: "AQHA",
    sireName: "Hollywood Dun It",
    sireSireName: "Hollywood Jac 86",
    sireDamName: "Blossom Berry",
    description: "Hollywood-Dun-It-Sohn und Träger der klassischen Dun-It-Linie.",
  },
  {
    name: "Hollywoodstinseltown",
    registry: "AQHA",
    sireName: "Hollywood Dun It",
    sireSireName: "Hollywood Jac 86",
    sireDamName: "Blossom Berry",
    description: "Weiterer bedeutender Sohn von Hollywood Dun It.",
  },
  {
    name: "Chics Magic Potion",
    registry: "AQHA",
    sireName: "Smart Chic Olena",
    sireSireName: "Smart Little Lena",
    sireDamName: "Gay Sugar Chic",
    description: "Smart-Chic-Olena-Sohn mit guter Vererbung von Rittigkeit und Cow Sense.",
  },
  {
    name: "Walla Walla Whiz",
    registry: "AQHA",
    sireName: "Topsail Whiz",
    sireSireName: "Topsail Cody",
    sireDamName: "Jeanie Whiz Bar",
    description: "Topsail-Whiz-Sohn aus der klassischen Whiz-Linie.",
  },
  {
    name: "Einsteins Revolution",
    registry: "AQHA",
    sireName: "Wimpys Little Step",
    sireSireName: "Nu Chex To Cash",
    sireDamName: "Leolita Step",
    description: "Moderner Vererber aus der Wimpys-Little-Step-Linie.",
  },
  {
    name: "Not Ruf At All",
    registry: "AQHA",
    sireName: "Lil Ruf Peppy",
    description: "Erfolgreicher Sport- und Zuchthengst der jüngeren Generation.",
  },
  {
    name: "Custom Crome",
    registry: "AQHA",
    description:
      "Bekannter Reining-Vererber. Abstammungsdaten bitte über den Stammbaum-Link ergänzen.",
  },
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const entry of STALLIONS) {
    const country = entry.country ?? "US";
    const slug = slugify(entry.name);

    const data = {
      name: entry.name,
      barnName: entry.barnName ?? null,
      breed: entry.breed ?? "Quarter Horse",
      registry: entry.registry ?? null,
      yearOfBirth: entry.yearOfBirth ?? null,
      color: entry.color ?? null,
      discipline: entry.discipline ?? "Reining",
      sireName: entry.sireName ?? null,
      sireSireName: entry.sireSireName ?? null,
      sireDamName: entry.sireDamName ?? null,
      damName: entry.damName ?? null,
      damSireName: entry.damSireName ?? null,
      damDamName: entry.damDamName ?? null,
      description: entry.description ?? null,
      country,
      region: regionForCountry(country),
      currency: country === "US" || country === "CA" ? "USD" : "EUR",
      feeOnRequest: true,
      source: "SEED",
      published: true,
      verified: false,
    };

    const existing = await prisma.stallion.findUnique({
      where: { slug },
      select: { id: true, source: true },
    });

    if (!existing) {
      await prisma.stallion.create({ data: { ...data, slug } });
      created += 1;
      continue;
    }

    // Von Benutzern gepflegte Eintraege nie ueberschreiben.
    if (existing.source !== "SEED") continue;

    await prisma.stallion.update({ where: { slug }, data });
    updated += 1;
  }

  console.log(
    `Grunddatenbank aktualisiert: ${created} neu angelegt, ${updated} aktualisiert.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

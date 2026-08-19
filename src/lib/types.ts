export type Sex = "stallion" | "mare" | "gelding";
export type HorseStatus = "pending" | "approved" | "rejected";
export type HorseSource = "seed" | "community";

/** Verfügbarkeit von Samen bzw. Natursprung - reine Sachinformation, bewusst OHNE Preise. */
export type Availability =
  | "frozen"
  | "fresh"
  | "both"
  | "live_cover"
  | "none"
  | "unknown";

export const SEXES: Sex[] = ["stallion", "mare", "gelding"];

export const AVAILABILITIES: Availability[] = [
  "unknown",
  "frozen",
  "fresh",
  "both",
  "live_cover",
  "none",
];

export const BREEDS = [
  "Quarter Horse",
  "Paint Horse",
  "Appaloosa",
  "Thoroughbred",
  "Zangersheide / Sonstige",
  "Andere",
] as const;

export const DISCIPLINES = [
  "Reining",
  "Cutting",
  "Reined Cow Horse",
  "Working Cowhorse",
  "Ranch Riding",
  "Western Pleasure",
  "Western Riding",
  "Trail",
  "Horsemanship",
  "Halter",
  "Barrel Racing",
  "Roping",
  "Allround",
  "Foundation / Zucht",
] as const;

/** Gentests, die in der Westernpferdezucht üblich sind (AQHA 6-Panel u. a.). */
export const GENETIC_TESTS = [
  "HYPP",
  "HERDA",
  "GBED",
  "PSSM1",
  "MH",
  "IMM",
  "OLWS",
] as const;

export type GeneticTest = (typeof GENETIC_TESTS)[number];

export interface Horse {
  id: number;
  slug: string;
  name: string;
  aka: string | null;
  sex: Sex;
  breed: string | null;
  registryNo: string | null;
  yearOfBirth: number | null;
  yearOfDeath: number | null;
  color: string | null;
  heightCm: number | null;
  country: string | null;
  location: string | null;
  studName: string | null;
  disciplines: string[];
  description: string | null;
  showRecord: string | null;
  offspring: string | null;
  bloodlineNote: string | null;
  sireName: string | null;
  damName: string | null;
  sireId: number | null;
  damId: number | null;
  genetics: Partial<Record<GeneticTest, string>>;
  availability: Availability;
  /** Verlinktes Bild auf einem fremden Server. */
  photoUrl: string | null;
  /** Hochgeladenes Bild, gespeichert im Upload-Verzeichnis. Hat Vorrang. */
  photoFile: string | null;
  photoCredit: string | null;
  videoUrl: string | null;
  websiteUrl: string | null;
  allbreedUrl: string | null;
  ownerName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isHistoric: boolean;
  isVerified: boolean;
  status: HorseStatus;
  source: HorseSource;
  submitterEmail: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Ein Knoten im Abstammungsbaum. `id === null` bedeutet: nur als Name bekannt. */
export interface PedigreeNode {
  name: string;
  slug: string | null;
  id: number | null;
  yearOfBirth: number | null;
  color: string | null;
  sire: PedigreeNode | null;
  dam: PedigreeNode | null;
}

export interface Correction {
  id: number;
  horseId: number;
  message: string;
  reporterEmail: string | null;
  handled: boolean;
  createdAt: string;
}

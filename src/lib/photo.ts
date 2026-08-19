import type { Horse } from "./types";

/** 5 MB - grosszügig für ein Pferdefoto, klein genug gegen Missbrauch. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTO_MB = Math.round(MAX_PHOTO_BYTES / 1024 / 1024);

/** Öffentlicher Pfad, unter dem hochgeladene Bilder ausgeliefert werden. */
export const PHOTO_ROUTE = "/bilder";

/** Erlaubte Dateiendungen - zugleich die einzigen Formate, die gespeichert werden. */
export const PHOTO_EXTENSIONS = ["jpg", "png", "webp"] as const;
export type PhotoExtension = (typeof PHOTO_EXTENSIONS)[number];

/**
 * Gespeicherte Dateinamen sind inhaltsadressiert: 40 Hex-Zeichen aus dem
 * SHA-256 der Datei plus Endung. Nichts davon stammt aus einer Nutzereingabe,
 * deshalb kann über den Namen auch nicht aus dem Verzeichnis ausgebrochen
 * werden. Diese Prüfung ist die Eingangskontrolle der Auslieferungs-Route.
 */
const FILE_RE = new RegExp(`^[a-f0-9]{40}\\.(${PHOTO_EXTENSIONS.join("|")})$`);

export function isStoredPhotoName(value: string): boolean {
  return FILE_RE.test(value);
}

export const PHOTO_MIME: Record<PhotoExtension, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function photoMimeType(file: string): string {
  const ext = file.split(".").pop() as PhotoExtension | undefined;
  return (ext && PHOTO_MIME[ext]) || "application/octet-stream";
}

/**
 * Woher das Bild eines Pferdes kommt. Eine hochgeladene Datei hat Vorrang vor
 * einer verlinkten Adresse - beides gleichzeitig ist erlaubt, angezeigt wird
 * aber nur eines.
 */
export function photoSrc(horse: Horse): string | null {
  if (horse.photoFile) return `${PHOTO_ROUTE}/${horse.photoFile}`;
  return horse.photoUrl;
}

/** Ein hochgeladenes Bild liegt auf dem eigenen Server, ein verlinktes nicht. */
export function isUploadedPhoto(horse: Horse): boolean {
  return Boolean(horse.photoFile);
}

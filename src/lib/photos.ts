export type PhotoLike = {
  id: string;
  externalUrl?: string | null;
  mimeType?: string | null;
};

/**
 * Bildquelle fuer ein Foto: hochgeladene Bilder liegen in der Datenbank und
 * werden ueber die API ausgeliefert, verlinkte Bilder direkt von der Quelle.
 */
export function photoSrc(photo: PhotoLike): string {
  if (photo.mimeType) return `/api/photos/${photo.id}`;
  return photo.externalUrl ?? "";
}

import { coatColorFill, initialsOf } from "@/lib/coat-color";

/**
 * Zeigt das Foto eines Pferdes - oder, wenn keins hinterlegt ist, ein
 * Platzhalter-Monogramm statt einer Lücke. Bewusst kein echtes Bild aus dem
 * Netz: Fotos bekannter Hengste sind fast immer urheberrechtlich geschützt,
 * darum sind sie im Startbestand nicht enthalten (siehe seed-data.ts).
 *
 * Die Füllfarbe des Platzhalters richtet sich nach der erfassten Fellfarbe -
 * eine echte Angabe zum Pferd, keine erfundene Deko.
 */
export function HorsePortrait({
  name,
  color,
  photoUrl,
  photoCredit,
  variant = "card",
}: {
  name: string;
  color: string | null;
  photoUrl?: string | null;
  photoCredit?: string | null;
  /** "card" = kleines Kachelformat, "hero" = grosse Ansicht auf der Detailseite */
  variant?: "card" | "hero";
}) {
  const rounded = variant === "hero" ? "rounded-xl" : "rounded-lg";
  const aspect = variant === "hero" ? "aspect-[16/10]" : "aspect-[4/3]";

  if (photoUrl) {
    return (
      <figure>
        {/* Bewusst ein einfaches img-Element statt next/image: hochgeladene
            Bilder liegen im eigenen /api/uploads, verlinkte Bilder auf
            fremden Servern - beides ohne next/image-Domainliste. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`w-full ${aspect} object-cover ${rounded}`}
          style={{ border: "1px solid var(--line)" }}
        />
        {variant === "hero" && photoCredit && (
          <figcaption className="text-xs muted mt-2">Foto: {photoCredit}</figcaption>
        )}
      </figure>
    );
  }

  const { fill, ink } = coatColorFill(color);
  const initials = initialsOf(name);

  return (
    <div
      className={`w-full ${aspect} ${rounded} flex items-center justify-center relative overflow-hidden`}
      style={{ backgroundColor: fill, border: "1px solid var(--line)" }}
      role="img"
      aria-label={`Kein Foto hinterlegt - Platzhalter für ${name}`}
    >
      <span
        style={{
          color: ink,
          fontFamily: "var(--font-display)",
          fontSize: variant === "hero" ? "3rem" : "1.5rem",
          fontWeight: 600,
          opacity: 0.9,
        }}
      >
        {initials}
      </span>
      {variant === "hero" && (
        <span
          className="absolute bottom-2 right-3 text-xs"
          style={{ color: ink, opacity: 0.75 }}
        >
          kein Foto hinterlegt
        </span>
      )}
    </div>
  );
}

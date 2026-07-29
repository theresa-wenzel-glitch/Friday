import Link from "next/link";
import { countryLabel, flagEmoji } from "@/lib/countries";
import { photoSrc } from "@/lib/photos";
import { formatFee } from "@/lib/format";

export type StallionCardData = {
  slug: string;
  name: string;
  yearOfBirth: number | null;
  color: string | null;
  breed: string;
  discipline: string;
  sireName: string | null;
  damName: string | null;
  damSireName: string | null;
  country: string;
  standingAt: string | null;
  studFee: number | null;
  currency: string;
  feeOnRequest: boolean;
  frozenSemen: boolean;
  shippedSemen: boolean;
  verified: boolean;
  photos: { id: string; externalUrl: string | null; mimeType: string | null }[];
};

export function StallionCard({ stallion }: { stallion: StallionCardData }) {
  const photo = stallion.photos[0];
  const src = photo ? photoSrc(photo) : "";
  const pedigree = [stallion.sireName, stallion.damName].filter(Boolean).join(" × ");

  return (
    <Link href={`/hengste/${stallion.slug}`} className="stallion-card">
      <div className="stallion-photo">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={stallion.name} loading="lazy" />
        ) : (
          <div className="placeholder" aria-hidden="true">
            ♞
          </div>
        )}
      </div>

      <div className="stallion-body">
        <h3>{stallion.name}</h3>

        <div className="stallion-meta">
          {[
            stallion.yearOfBirth ? String(stallion.yearOfBirth) : null,
            stallion.color,
            stallion.breed,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>

        {pedigree && (
          <div className="stallion-meta">
            <strong style={{ fontWeight: 600 }}>Abstammung:</strong> {pedigree}
            {stallion.damSireName ? ` (${stallion.damSireName})` : ""}
          </div>
        )}

        <div className="badges">
          {stallion.verified && <span className="badge badge-good">Geprüft</span>}
          {stallion.frozenSemen && <span className="badge">Gefrorenes Sperma</span>}
          {stallion.shippedSemen && <span className="badge">Frischsamen</span>}
        </div>

        <div className="stallion-foot">
          <span className="muted">
            {flagEmoji(stallion.country)} {stallion.standingAt || countryLabel(stallion.country)}
          </span>
          <span className="fee">
            {formatFee(stallion.studFee, stallion.currency, stallion.feeOnRequest)}
          </span>
        </div>
      </div>
    </Link>
  );
}

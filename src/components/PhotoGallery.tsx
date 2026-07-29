"use client";

import { useState } from "react";
import { photoSrc, type PhotoLike } from "@/lib/photos";

type GalleryPhoto = PhotoLike & { caption?: string | null };

export function PhotoGallery({
  photos,
  alt,
}: {
  photos: GalleryPhoto[];
  alt: string;
}) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="gallery-main">
        <div className="placeholder" aria-hidden="true" style={{ height: "100%" }}>
          ♞
        </div>
      </div>
    );
  }

  const current = photos[Math.min(active, photos.length - 1)];

  return (
    <div>
      <div className="gallery-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoSrc(current)} alt={current.caption || alt} />
      </div>

      {current.caption && (
        <p className="tiny muted" style={{ marginTop: 8 }}>
          {current.caption}
        </p>
      )}

      {photos.length > 1 && (
        <div className="gallery-thumbs">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              aria-current={index === active}
              aria-label={`Foto ${index + 1} anzeigen`}
              onClick={() => setActive(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoSrc(photo)} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useActionState } from "react";
import {
  addPhotoUrlAction,
  deletePhotoAction,
  uploadPhotoAction,
  type FormState,
} from "@/app/actions/stallions";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { photoSrc } from "@/lib/photos";

type Photo = {
  id: string;
  externalUrl: string | null;
  mimeType: string | null;
  caption: string | null;
};

export function PhotoManager({
  stallionId,
  photos,
}: {
  stallionId: string;
  photos: Photo[];
}) {
  const [uploadState, uploadAction] = useActionState<FormState, FormData>(
    uploadPhotoAction,
    undefined,
  );
  const [urlState, urlAction] = useActionState<FormState, FormData>(
    addPhotoUrlAction,
    undefined,
  );

  return (
    <section className="form-section">
      <h3>Fotos</h3>
      <p className="section-hint">
        Das erste Foto ist das Titelbild. Du kannst Bilder hochladen (bis 5 MB)
        oder einen Bild-Link angeben.
      </p>

      {photos.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            marginBottom: 20,
          }}
        >
          {photos.map((photo, index) => (
            <div key={photo.id} className="card" style={{ overflow: "hidden" }}>
              <div style={{ aspectRatio: "4 / 3", background: "var(--surface-2)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoSrc(photo)}
                  alt={photo.caption ?? ""}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ padding: "8px 10px" }}>
                <div className="tiny muted" style={{ marginBottom: 6 }}>
                  {index === 0 ? "Titelbild" : `Foto ${index + 1}`}
                </div>
                <form action={deletePhotoAction}>
                  <input type="hidden" name="photoId" value={photo.id} />
                  <ConfirmButton message="Dieses Foto löschen?">Löschen</ConfirmButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="form-grid" style={{ alignItems: "start" }}>
        <form action={uploadAction} className="stack" style={{ gap: 10 }}>
          <div className="field">
            <label htmlFor="file">Foto hochladen</label>
            <input
              id="file"
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              required
            />
            <span className="field-hint">JPG, PNG, WebP oder AVIF, bis 5 MB.</span>
          </div>
          <input type="hidden" name="stallionId" value={stallionId} />
          <input type="text" name="caption" placeholder="Bildunterschrift (optional)" />
          {uploadState?.error && <div className="alert alert-error">{uploadState.error}</div>}
          {uploadState?.ok && <div className="alert alert-ok">{uploadState.ok}</div>}
          <SubmitButton className="btn" pendingLabel="Wird hochgeladen …">
            Hochladen
          </SubmitButton>
        </form>

        <form action={urlAction} className="stack" style={{ gap: 10 }}>
          <div className="field">
            <label htmlFor="externalUrl">Foto per Link</label>
            <input
              id="externalUrl"
              type="url"
              name="externalUrl"
              placeholder="https://…/hengst.jpg"
              required
            />
            <span className="field-hint">
              Nur Bilder verwenden, für die du die Rechte hast.
            </span>
          </div>
          <input type="hidden" name="stallionId" value={stallionId} />
          <input type="text" name="caption" placeholder="Bildunterschrift (optional)" />
          {urlState?.error && <div className="alert alert-error">{urlState.error}</div>}
          {urlState?.ok && <div className="alert alert-ok">{urlState.ok}</div>}
          <SubmitButton className="btn" pendingLabel="Wird gespeichert …">
            Link hinzufügen
          </SubmitButton>
        </form>
      </div>
    </section>
  );
}

"use client";

import { useRef, useState } from "react";

/**
 * Bildfeld für das Eintragungsformular: entweder eine Datei direkt
 * hochladen oder eine bestehende Bild-Adresse eintragen - beides schreibt
 * in dasselbe Formularfeld, damit der Server nur einen Wert prüfen muss.
 */
export function PhotoUpload({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [previewOk, setPreviewOk] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setMessage(null);

    const form = new FormData();
    form.append("photo", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as
        | { url: string }
        | { error: string }
        | null;

      if (!res.ok || !data || !("url" in data)) {
        setMessage(
          (data && "error" in data && data.error) || "Hochladen ist fehlgeschlagen.",
        );
        return;
      }

      setPreviewOk(true);
      setValue(data.url);
      setMessage("Bild hochgeladen.");
    } catch {
      setMessage("Hochladen ist fehlgeschlagen - bitte Verbindung prüfen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          id={id}
          name={name}
          className="field flex-1 min-w-48"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setPreviewOk(true);
            setMessage(null);
          }}
          placeholder="https://…/hengst.jpg"
        />
        <button
          type="button"
          className="btn btn-secondary shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "wird hochgeladen …" : "Bild hochladen"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Ohne diese Zeile löst die Auswahl derselben Datei kein
            // erneutes change-Ereignis aus.
            e.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </div>

      {value && previewOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Vorschau des Bilds"
          className="h-24 w-32 object-cover rounded-md"
          style={{ border: "1px solid var(--line)" }}
          onError={() => setPreviewOk(false)}
        />
      )}

      {message && <p className="text-xs muted">{message}</p>}
    </div>
  );
}

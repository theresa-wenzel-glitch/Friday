"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

/*
 * Der Erfassungsbildschirm: Foto, Sprachnachricht, fertig.
 * Alles für eine Hand und Arbeitshandschuhe ausgelegt.
 */

interface Foto {
  blob: Blob;
  url: string;
}

const MAX_SEKUNDEN = 180;
const MAX_FOTOS = 6;

/** Verkleinert Handyfotos auf 1600 px und macht ein JPG daraus - spart Datenvolumen auf der Baustelle. */
async function verkleinere(datei: File): Promise<Blob> {
  try {
    const bild = await createImageBitmap(datei, { imageOrientation: "from-image" });
    const faktor = Math.min(1, 1600 / Math.max(bild.width, bild.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bild.width * faktor);
    canvas.height = Math.round(bild.height * faktor);
    canvas.getContext("2d")!.drawImage(bild, 0, 0, canvas.width, canvas.height);
    bild.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
    if (blob) return blob;
  } catch {
    // Format, das der Browser nicht lesen kann - dann das Original versuchen.
  }
  if (datei.type === "image/jpeg" || datei.type === "image/png") return datei;
  throw new Error("Dieses Fotoformat wird nicht unterstützt. Bitte als JPG aufnehmen.");
}

function tonFormat(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const SCHRITTE = [
  "Wird hochgeladen …",
  "Sprachnachricht wird abgetippt …",
  "Wetter wird abgerufen …",
  "Bautagebuch-Eintrag wird geschrieben …",
];

export function Erfassung({
  baustellen,
  vorauswahl,
  kiAktiv,
}: {
  baustellen: { id: number; name: string }[];
  vorauswahl: number | null;
  kiAktiv: boolean;
}) {
  const router = useRouter();
  const [baustelleId, setBaustelleId] = useState<number | null>(
    vorauswahl ?? (baustellen.length === 1 ? baustellen[0].id : null),
  );
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [audio, setAudio] = useState<{ blob: Blob; url: string; sekunden: number } | null>(null);
  const [nimmtAuf, setNimmtAuf] = useState(false);
  const [sekunden, setSekunden] = useState(0);
  const [text, setText] = useState("");
  const [zeigeText, setZeigeText] = useState(!kiAktiv);
  const [fehler, setFehler] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);
  const [schritt, setSchritt] = useState(0);
  const [standort, setStandort] = useState<{ lat: number; lon: number } | null>(null);
  const standortGefragt = useRef(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const stuecke = useRef<Blob[]>([]);
  const uhr = useRef<ReturnType<typeof setInterval> | null>(null);
  const startZeit = useRef(0);
  const fotoInput = useRef<HTMLInputElement>(null);

  // Zuletzt gewählte Baustelle merken - meist ist man mehrere Tage auf derselben.
  useEffect(() => {
    if (vorauswahl || baustellen.length <= 1) return;
    try {
      const gemerkt = Number(localStorage.getItem("btb-baustelle"));
      if (baustellen.some((b) => b.id === gemerkt)) setBaustelleId(gemerkt);
    } catch {
      /* Speicher nicht verfügbar - egal */
    }
  }, [vorauswahl, baustellen]);

  useEffect(() => {
    if (!baustelleId) return;
    try {
      localStorage.setItem("btb-baustelle", String(baustelleId));
    } catch {
      /* egal */
    }
  }, [baustelleId]);

  useEffect(() => {
    if (!sendet) return;
    const t = setInterval(() => setSchritt((s) => Math.min(s + 1, SCHRITTE.length - 1)), 2500);
    return () => clearInterval(t);
  }, [sendet]);

  useEffect(
    () => () => {
      if (uhr.current) clearInterval(uhr.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  /** Standort einmalig abfragen - beim ersten Foto oder der ersten Aufnahme. */
  function frageStandort() {
    if (standortGefragt.current || !("geolocation" in navigator)) return;
    standortGefragt.current = true;
    navigator.geolocation.getCurrentPosition(
      (p) => setStandort({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {},
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  async function fotosGewaehlt(liste: FileList | null) {
    if (!liste?.length) return;
    frageStandort();
    setFehler(null);
    const neu: Foto[] = [];
    for (const datei of Array.from(liste).slice(0, MAX_FOTOS - fotos.length)) {
      try {
        const blob = await verkleinere(datei);
        neu.push({ blob, url: URL.createObjectURL(blob) });
      } catch (err) {
        setFehler((err as Error).message);
      }
    }
    setFotos((alt) => [...alt, ...neu]);
    if (fotoInput.current) fotoInput.current.value = "";
  }

  function entferneFoto(i: number) {
    setFotos((alt) => {
      URL.revokeObjectURL(alt[i].url);
      return alt.filter((_, j) => j !== i);
    });
  }

  async function starteAufnahme() {
    setFehler(null);
    frageStandort();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setFehler("Dieses Gerät kann im Browser nicht aufnehmen. Bitte den Text eintippen.");
      setZeigeText(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const format = tonFormat();
      const rec = new MediaRecorder(stream, format ? { mimeType: format } : undefined);
      stuecke.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && stuecke.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(stuecke.current, { type: rec.mimeType || format || "audio/webm" });
        const dauer = Math.max(1, Math.round((Date.now() - startZeit.current) / 1000));
        setAudio((alt) => {
          if (alt) URL.revokeObjectURL(alt.url);
          return { blob, url: URL.createObjectURL(blob), sekunden: dauer };
        });
      };
      recorder.current = rec;
      startZeit.current = Date.now();
      rec.start(1000);
      setNimmtAuf(true);
      setSekunden(0);
      uhr.current = setInterval(() => {
        const s = Math.round((Date.now() - startZeit.current) / 1000);
        setSekunden(s);
        if (s >= MAX_SEKUNDEN) stoppeAufnahme();
      }, 250);
    } catch {
      setFehler("Kein Zugriff aufs Mikrofon. Bitte im Browser erlauben - oder den Text eintippen.");
      setZeigeText(true);
    }
  }

  function stoppeAufnahme() {
    if (uhr.current) clearInterval(uhr.current);
    uhr.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    setNimmtAuf(false);
  }

  async function absenden() {
    setFehler(null);
    if (!baustelleId) {
      setFehler("Bitte oben die Baustelle wählen.");
      return;
    }
    if (!audio && text.trim().length < 3) {
      setFehler("Bitte eine Sprachnachricht aufnehmen oder kurz eintippen, was gemacht wurde.");
      return;
    }
    const form = new FormData();
    form.append("baustelleId", String(baustelleId));
    form.append("text", text);
    fotos.forEach((f, i) => form.append("fotos", f.blob, `foto-${i + 1}.jpg`));
    if (audio) form.append("audio", audio.blob, "sprachnachricht");
    if (standort) {
      form.append("lat", String(standort.lat));
      form.append("lon", String(standort.lon));
    }

    setSendet(true);
    setSchritt(0);
    try {
      const res = await fetch("/api/bautagebuch/eintraege", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { id?: number; hinweis?: string; fehler?: string };
      if (!res.ok || !data.id) throw new Error(data.fehler ?? "Senden fehlgeschlagen. Bitte noch einmal.");
      const q = new URLSearchParams({ neu: "1" });
      if (data.hinweis) q.set("hinweis", data.hinweis);
      router.push(`/bautagebuch/app/eintrag/${data.id}?${q}`);
    } catch (err) {
      setFehler((err as Error).message);
      setSendet(false);
    }
  }

  if (baustellen.length === 0) {
    return (
      <div className="btb-card p-6 text-center space-y-4">
        <p className="text-lg font-semibold">Noch keine Baustelle angelegt.</p>
        <a href="/bautagebuch/app/baustellen" className="btb-btn btb-btn-primary">
          <Icon name="plus" /> Erste Baustelle anlegen
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!kiAktiv && (
        <p className="btb-notice btb-notice-warn text-sm">
          <strong>Demo-Modus:</strong> Es ist noch kein KI-Schlüssel hinterlegt. Sprachnachrichten werden gespeichert, aber
          nicht abgetippt - bitte zusätzlich kurz eintippen, was gemacht wurde.
        </p>
      )}

      {/* 1. Baustelle */}
      <section>
        <label className="btb-label" htmlFor="baustelle">
          1 · Baustelle
        </label>
        <select
          id="baustelle"
          className="btb-field text-lg font-semibold"
          value={baustelleId ?? ""}
          onChange={(e) => setBaustelleId(Number(e.target.value) || null)}
        >
          {!baustelleId && <option value="">Bitte wählen …</option>}
          {baustellen.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </section>

      {/* 2. Fotos */}
      <section>
        <span className="btb-label">2 · Foto{fotos.length > 0 ? ` (${fotos.length})` : ""}</span>
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((f, i) => (
            <div key={f.url} className="relative aspect-square overflow-hidden rounded-xl btb-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => entferneFoto(i)}
                className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"
                aria-label={`Foto ${i + 1} entfernen`}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
          {fotos.length < MAX_FOTOS && (
            <label
              className="btb-card flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 border-dashed text-sm font-semibold"
              style={{ borderWidth: 2, color: "var(--btb-accent)" }}
            >
              <Icon name="kamera" size={30} />
              {fotos.length === 0 ? "Foto machen" : "Noch eins"}
              <input
                ref={fotoInput}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="sr-only"
                onChange={(e) => fotosGewaehlt(e.target.files)}
                data-testid="foto-input"
              />
            </label>
          )}
        </div>
      </section>

      {/* 3. Sprachnachricht */}
      <section className="btb-card p-5">
        <span className="btb-label">3 · Sprachnachricht</span>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <button
            type="button"
            className="btb-rec"
            data-aktiv={nimmtAuf}
            onClick={nimmtAuf ? stoppeAufnahme : starteAufnahme}
            aria-label={nimmtAuf ? "Aufnahme beenden" : "Aufnahme starten"}
          >
            <Icon name={nimmtAuf ? "stopp" : "mikro"} size={44} />
          </button>
          {nimmtAuf ? (
            <p className="text-2xl font-bold tabular-nums" aria-live="polite">
              {mmss(sekunden)} <span className="text-base font-normal btb-muted">· tippen zum Beenden</span>
            </p>
          ) : audio ? (
            <div className="w-full space-y-2">
              <p className="font-semibold">
                <span style={{ color: "var(--btb-ok)" }}>
                  <Icon name="haken" size={18} className="inline -mt-1" />
                </span>{" "}
                Aufnahme: {mmss(audio.sekunden)}
              </p>
              <audio src={audio.url} controls className="w-full" />
              <button
                type="button"
                className="btb-btn btb-btn-ghost text-sm"
                onClick={() => {
                  URL.revokeObjectURL(audio.url);
                  setAudio(null);
                }}
              >
                Verwerfen und neu aufnehmen
              </button>
            </div>
          ) : (
            <div className="btb-muted text-sm leading-relaxed">
              <p className="font-semibold" style={{ color: "var(--btb-text)" }}>
                Tippen und einfach erzählen:
              </p>
              Wer war da? Was wurde gemacht? Was kam an Material?
              <br />
              Gab es Probleme, Wartezeiten, Anweisungen vom Bauherrn?
            </div>
          )}
        </div>

        {zeigeText ? (
          <div className="mt-3">
            <label className="btb-label" htmlFor="text">
              {kiAktiv ? "Oder eintippen" : "Was wurde heute gemacht?"}
            </label>
            <textarea
              id="text"
              className="btb-field"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="z. B. 2 Mann, 7 bis 16 Uhr. Fundament geschalt und bewehrt. Beton kam 2 Std. zu spät, Regen ab Mittag."
            />
          </div>
        ) : (
          <button type="button" className="btb-btn btb-btn-ghost mt-2 w-full text-sm" onClick={() => setZeigeText(true)}>
            <Icon name="text" size={18} /> Lieber tippen
          </button>
        )}
      </section>

      {fehler && (
        <p className="btb-notice btb-notice-error" role="alert">
          {fehler}
        </p>
      )}

      {standort && (
        <p className="flex items-center justify-center gap-1 text-xs btb-muted">
          <Icon name="standort" size={14} /> Standort wird für Wetter und Nachweis mitgespeichert
        </p>
      )}

      <div className="sticky bottom-20 z-10 sm:bottom-4">
        <button
          type="button"
          className="btb-btn btb-btn-primary btb-btn-lg w-full shadow-lg"
          onClick={absenden}
          disabled={sendet || nimmtAuf}
        >
          {sendet ? (
            <>
              <span className="btb-spinner" aria-hidden /> {SCHRITTE[schritt]}
            </>
          ) : (
            <>
              Bautagebuch erstellen <Icon name="pfeil" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

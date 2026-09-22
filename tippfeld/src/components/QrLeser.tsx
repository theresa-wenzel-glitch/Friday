"use client";

import { useEffect, useRef, useState } from "react";
import { Symbol } from "./Symbol";

/*
 * QR-Codes scannen.
 *
 * Nutzt den BarcodeDetector des Browsers, den heute nicht jeder Browser
 * mitbringt. Wo er fehlt, sagt die App das klar und der Code lässt sich
 * eintippen - es wird nichts vorgetäuscht.
 */

type Erkenner = {
  detect: (quelle: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (optionen: { formats: string[] }) => Erkenner;
  }
}

function codeAusText(text: string): string | null {
  try {
    const adresse = new URL(text);
    const ausPfad = adresse.pathname.match(/\/ligen\/beitreten\/([A-Za-z0-9]+)/);
    if (ausPfad) return ausPfad[1].toUpperCase();
    const ausAbfrage = adresse.searchParams.get("code");
    if (ausAbfrage) return ausAbfrage.toUpperCase();
    return null;
  } catch {
    return /^[A-Za-z0-9]{4,12}$/.test(text.trim()) ? text.trim().toUpperCase() : null;
  }
}

export function QrLeser({ beimLesen }: { beimLesen: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [moeglich, setMoeglich] = useState<boolean | null>(null);

  useEffect(() => {
    setMoeglich(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  useEffect(() => {
    if (!laeuft) return;
    let strom: MediaStream | null = null;
    let weiter = true;

    (async () => {
      try {
        strom = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = strom;
          await videoRef.current.play();
        }
        const erkenner = new window.BarcodeDetector!({ formats: ["qr_code"] });
        const suchen = async () => {
          if (!weiter || !videoRef.current) return;
          try {
            const treffer = await erkenner.detect(videoRef.current);
            for (const t of treffer) {
              const code = codeAusText(t.rawValue);
              if (code) {
                beimLesen(code);
                setHinweis(`Code erkannt: ${code}`);
                setLaeuft(false);
                return;
              }
            }
          } catch {
            // Einzelne Bilder dürfen fehlschlagen, der nächste Versuch folgt.
          }
          if (weiter) requestAnimationFrame(suchen);
        };
        void suchen();
      } catch {
        setHinweis("Die Kamera ließ sich nicht öffnen. Bitte gib den Code von Hand ein.");
        setLaeuft(false);
      }
    })();

    return () => {
      weiter = false;
      strom?.getTracks().forEach((spur) => spur.stop());
    };
  }, [laeuft, beimLesen]);

  if (moeglich === null) return null;

  if (!moeglich) {
    return (
      <p className="band">
        <Symbol name="kamera" className="tf-symbol tf-symbol--klein" />
        <span>
          Dieser Browser kann keine QR-Codes lesen. Gib den sechsstelligen Code oben einfach ein.
        </span>
      </p>
    );
  }

  return (
    <div className="stapel">
      {laeuft ? (
        <>
          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              width: "100%",
              borderRadius: "var(--tf-radius-m)",
              background: "var(--tf-bg-gedaempft)",
              aspectRatio: "4 / 3",
              objectFit: "cover",
            }}
          />
          <button type="button" className="tf-knopf tf-knopf--zweit" onClick={() => setLaeuft(false)}>
            Scannen beenden
          </button>
        </>
      ) : (
        <button type="button" className="tf-knopf tf-knopf--zweit" onClick={() => setLaeuft(true)}>
          <Symbol name="kamera" className="tf-symbol tf-symbol--klein" />
          QR-Code scannen
        </button>
      )}
      {hinweis ? <p className="klein leise">{hinweis}</p> : null}
    </div>
  );
}

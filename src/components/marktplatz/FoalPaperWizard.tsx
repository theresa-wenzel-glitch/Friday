"use client";

import { useState } from "react";

interface FoalData {
  registry: "AQHA" | "APHA";
  foalName: string;
  sex: string;
  birthDate: string;
  color: string;
  markings: string;
  sireName: string;
  damName: string;
  breederName: string;
  breederAddress: string;
  ownerName: string;
  ownerEmail: string;
}

const EMPTY: FoalData = {
  registry: "AQHA",
  foalName: "",
  sex: "",
  birthDate: "",
  color: "",
  markings: "",
  sireName: "",
  damName: "",
  breederName: "",
  breederAddress: "",
  ownerName: "",
  ownerEmail: "",
};

const STEPS = ["Verband", "Fohlen", "Abstammung", "Züchter/Besitzer", "Zusammenfassung"];

export function FoalPaperWizard({ horseNames }: { horseNames: string[] }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FoalData>(EMPTY);

  const set = <K extends keyof FoalData>(key: K, value: FoalData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const last = step === STEPS.length - 1;

  return (
    <div>
      {/* Fortschrittsanzeige - beim Drucken ausgeblendet. */}
      <ol className="flex flex-wrap gap-2 mb-8 text-xs no-print">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className="chip"
            style={
              i === step
                ? { backgroundColor: "var(--accent)", color: "var(--accent-fg)", borderColor: "transparent" }
                : undefined
            }
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="surface rounded-xl p-5 space-y-4">
          <h2 className="text-xl">Verband</h2>
          <div className="flex gap-4">
            {(["AQHA", "APHA"] as const).map((r) => (
              <label key={r} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="registry"
                  checked={data.registry === r}
                  onChange={() => set("registry", r)}
                />
                {r}
              </label>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="surface rounded-xl p-5 grid gap-4 sm:grid-cols-2">
          <h2 className="text-xl sm:col-span-2">Fohlendaten</h2>
          <div>
            <label className="label" htmlFor="foalName">
              Name (falls schon vergeben)
            </label>
            <input
              id="foalName"
              className="field"
              value={data.foalName}
              onChange={(e) => set("foalName", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="sex">
              Geschlecht
            </label>
            <select id="sex" className="field" value={data.sex} onChange={(e) => set("sex", e.target.value)}>
              <option value="">bitte wählen</option>
              <option value="Hengstfohlen">Hengstfohlen</option>
              <option value="Stutfohlen">Stutfohlen</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="birthDate">
              Geburtsdatum
            </label>
            <input
              id="birthDate"
              type="date"
              className="field"
              value={data.birthDate}
              onChange={(e) => set("birthDate", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="color">
              Farbe
            </label>
            <input
              id="color"
              className="field"
              value={data.color}
              onChange={(e) => set("color", e.target.value)}
              placeholder="z. B. Palomino"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="markings">
              Abzeichen
            </label>
            <textarea
              id="markings"
              className="field"
              rows={3}
              value={data.markings}
              onChange={(e) => set("markings", e.target.value)}
              placeholder="z. B. Blesse, beide Hinterfesseln weiss"
            />
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="surface rounded-xl p-5 grid gap-4 sm:grid-cols-2">
          <h2 className="text-xl sm:col-span-2">Abstammung</h2>
          <p className="text-sm muted sm:col-span-2">
            Vater/Mutter aus dem Bestand auswählen oder frei eintragen.
          </p>
          <div>
            <label className="label" htmlFor="sireName">
              Vater
            </label>
            <input
              id="sireName"
              className="field"
              list="horse-names"
              value={data.sireName}
              onChange={(e) => set("sireName", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="damName">
              Mutter
            </label>
            <input
              id="damName"
              className="field"
              list="horse-names"
              value={data.damName}
              onChange={(e) => set("damName", e.target.value)}
            />
          </div>
          <datalist id="horse-names">
            {horseNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </section>
      )}

      {step === 3 && (
        <section className="surface rounded-xl p-5 grid gap-4 sm:grid-cols-2">
          <h2 className="text-xl sm:col-span-2">Züchter und Besitzer</h2>
          <div>
            <label className="label" htmlFor="breederName">
              Züchter
            </label>
            <input
              id="breederName"
              className="field"
              value={data.breederName}
              onChange={(e) => set("breederName", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="breederAddress">
              Anschrift des Züchters
            </label>
            <input
              id="breederAddress"
              className="field"
              value={data.breederAddress}
              onChange={(e) => set("breederAddress", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="ownerName">
              Besitzer (falls abweichend)
            </label>
            <input
              id="ownerName"
              className="field"
              value={data.ownerName}
              onChange={(e) => set("ownerName", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="ownerEmail">
              E-Mail für Rückfragen
            </label>
            <input
              id="ownerEmail"
              type="email"
              className="field"
              value={data.ownerEmail}
              onChange={(e) => set("ownerEmail", e.target.value)}
            />
          </div>
        </section>
      )}

      {last && <FoalPaperSummary data={data} />}

      <div className="flex flex-wrap gap-2 mt-6 no-print">
        {step > 0 && (
          <button type="button" className="btn btn-secondary" onClick={() => setStep((s) => s - 1)}>
            Zurück
          </button>
        )}
        {!last ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>
            Weiter
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            Zusammenfassung drucken / als PDF speichern
          </button>
        )}
      </div>
    </div>
  );
}

function FoalPaperSummary({ data }: { data: FoalData }) {
  const rows: [string, string][] = [
    ["Verband", data.registry],
    ["Name", data.foalName || "–"],
    ["Geschlecht", data.sex || "–"],
    ["Geburtsdatum", data.birthDate || "–"],
    ["Farbe", data.color || "–"],
    ["Abzeichen", data.markings || "–"],
    ["Vater", data.sireName || "–"],
    ["Mutter", data.damName || "–"],
    ["Züchter", data.breederName || "–"],
    ["Anschrift Züchter", data.breederAddress || "–"],
    ["Besitzer", data.ownerName || "–"],
    ["E-Mail", data.ownerEmail || "–"],
  ];

  return (
    <section className="surface rounded-xl p-5 mt-6 print-summary">
      <h2 className="text-xl mb-1">Zusammenfassung</h2>
      <p className="text-sm muted mb-4 no-print">
        Zum Übertragen in das offizielle {data.registry}-Formular - keine
        automatische Einreichung.
      </p>
      <dl className="grid gap-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="muted min-w-40 shrink-0">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

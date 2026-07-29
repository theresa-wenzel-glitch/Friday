"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import type { FormState } from "@/app/actions/stallions";

/** Alle Felder, die das Formular vorbelegen kann. */
export type StallionFormValues = Partial<{
  id: string;
  name: string;
  barnName: string | null;
  breed: string;
  registry: string | null;
  registrationNo: string | null;
  yearOfBirth: number | null;
  color: string | null;
  heightCm: number | null;
  discipline: string;
  sireName: string | null;
  sireSireName: string | null;
  sireDamName: string | null;
  damName: string | null;
  damSireName: string | null;
  damDamName: string | null;
  allBreedUrl: string | null;
  earnings: string | null;
  achievements: string | null;
  description: string | null;
  offspring: string | null;
  panelHypp: string | null;
  panelHerda: string | null;
  panelGbed: string | null;
  panelPssm1: string | null;
  panelMh: string | null;
  panelIma: string | null;
  standingAt: string | null;
  city: string | null;
  country: string;
  studFee: number | null;
  currency: string;
  feeOnRequest: boolean;
  frozenSemen: boolean;
  shippedSemen: boolean;
  liveCover: boolean;
  availableInEu: boolean;
  availableInUs: boolean;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  published: boolean;
}>;

const BREEDS = [
  "Quarter Horse",
  "Paint Horse",
  "Appaloosa",
  "Appendix",
  "Sonstige",
];

const DISCIPLINES = [
  "Reining",
  "Reined Cow Horse",
  "Cutting",
  "Working Cow Horse",
  "Ranch Riding",
  "Allround",
];

const PANEL_RESULTS = ["", "N/N", "N/H", "H/H", "nicht getestet"];

function Text({
  name,
  label,
  hint,
  defaultValue,
  type = "text",
  required = false,
  placeholder,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
      />
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

function Area({
  name,
  label,
  hint,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
      />
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="check">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

function PanelSelect({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue={defaultValue ?? ""}>
        {PANEL_RESULTS.map((r) => (
          <option key={r} value={r}>
            {r === "" ? "Keine Angabe" : r}
          </option>
        ))}
      </select>
    </div>
  );
}

export function StallionForm({
  action,
  values = {},
  submitLabel,
  defaultContactEmail,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values?: StallionFormValues;
  submitLabel: string;
  defaultContactEmail?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);
  const v = values;

  return (
    <form action={formAction} className="stack">
      {v.id && <input type="hidden" name="id" value={v.id} />}

      <section className="form-section">
        <h3>Grunddaten</h3>
        <p className="section-hint">Name und Papiere des Hengstes.</p>
        <div className="form-grid">
          <Text name="name" label="Name des Hengstes" defaultValue={v.name} required />
          <Text name="barnName" label="Stallname" defaultValue={v.barnName} />

          <div className="field">
            <label htmlFor="breed">Rasse *</label>
            <select id="breed" name="breed" defaultValue={v.breed ?? "Quarter Horse"} required>
              {BREEDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="discipline">Disziplin *</label>
            <select id="discipline" name="discipline" defaultValue={v.discipline ?? "Reining"} required>
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <Text name="registry" label="Zuchtverband" placeholder="AQHA, APHA …" defaultValue={v.registry} />
          <Text name="registrationNo" label="Registriernummer" defaultValue={v.registrationNo} />
          <Text name="yearOfBirth" label="Geburtsjahr" type="number" defaultValue={v.yearOfBirth} />
          <Text name="color" label="Farbe" placeholder="z. B. Palomino" defaultValue={v.color} />
          <Text
            name="heightCm"
            label="Stockmaß in cm"
            type="number"
            hint="Wird zusätzlich in Hands angezeigt."
            defaultValue={v.heightCm}
          />
          <Text
            name="earnings"
            label="Gewinnsumme / Erfolge kurz"
            placeholder="z. B. NRHA LTE $ 250.000"
            defaultValue={v.earnings}
          />
        </div>
      </section>

      <section className="form-section">
        <h3>Abstammung</h3>
        <p className="section-hint">
          Drei Generationen. Jeder Name wird automatisch mit allbreedpedigree.com
          verlinkt — den vollständigen Stammbaum musst du nicht abtippen.
        </p>
        <div className="form-grid">
          <Text name="sireName" label="Vater" defaultValue={v.sireName} />
          <Text name="damName" label="Mutter" defaultValue={v.damName} />
          <Text name="sireSireName" label="Vater des Vaters" defaultValue={v.sireSireName} />
          <Text name="sireDamName" label="Mutter des Vaters" defaultValue={v.sireDamName} />
          <Text name="damSireName" label="Muttervater" defaultValue={v.damSireName} />
          <Text name="damDamName" label="Mutter der Mutter" defaultValue={v.damDamName} />
          <Text
            name="allBreedUrl"
            label="Direktlink All Breed Pedigree"
            type="url"
            hint="Optional. Ohne Angabe verlinken wir auf die Namenssuche."
            placeholder="https://www.allbreedpedigree.com/..."
            defaultValue={v.allBreedUrl}
          />
        </div>
      </section>

      <section className="form-section">
        <h3>Beschreibung</h3>
        <p className="section-hint">Was macht den Hengst aus?</p>
        <div className="form-grid">
          <Area
            name="description"
            label="Über den Hengst"
            placeholder="Charakter, Rittigkeit, Vererbung …"
            defaultValue={v.description}
          />
          <Area
            name="achievements"
            label="Erfolge im Detail"
            placeholder="Platzierungen, Titel, Turniere …"
            defaultValue={v.achievements}
          />
          <Area
            name="offspring"
            label="Nachkommen"
            placeholder="Erfolgreiche Nachkommen und deren Erfolge …"
            defaultValue={v.offspring}
          />
        </div>
      </section>

      <section className="form-section">
        <h3>Station &amp; Decktaxe</h3>
        <p className="section-hint">Wo steht der Hengst und was kostet ein Decksprung?</p>
        <div className="form-grid">
          <Text name="standingAt" label="Station / Betrieb" defaultValue={v.standingAt} />
          <Text name="city" label="Ort" defaultValue={v.city} />

          <div className="field">
            <label htmlFor="country">Land *</label>
            <select id="country" name="country" defaultValue={v.country ?? "DE"} required>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <Text name="studFee" label="Decktaxe" type="number" defaultValue={v.studFee} />

          <div className="field">
            <label htmlFor="currency">Währung</label>
            <select id="currency" name="currency" defaultValue={v.currency ?? "EUR"}>
              <option value="EUR">Euro (€)</option>
              <option value="USD">US-Dollar ($)</option>
              <option value="CHF">Schweizer Franken</option>
              <option value="GBP">Britisches Pfund (£)</option>
            </select>
          </div>
        </div>

        <div className="checks" style={{ marginTop: 16 }}>
          <Check name="feeOnRequest" label="Decktaxe auf Anfrage" defaultChecked={v.feeOnRequest} />
          <Check name="frozenSemen" label="Gefrorenes Sperma" defaultChecked={v.frozenSemen} />
          <Check name="shippedSemen" label="Frischsamen-Versand" defaultChecked={v.shippedSemen} />
          <Check name="liveCover" label="Natursprung" defaultChecked={v.liveCover} />
          <Check name="availableInEu" label="In der EU verfügbar" defaultChecked={v.availableInEu} />
          <Check name="availableInUs" label="In den USA verfügbar" defaultChecked={v.availableInUs} />
        </div>
      </section>

      <section className="form-section">
        <h3>Gentest</h3>
        <p className="section-hint">Optional — falls Ergebnisse vorliegen.</p>
        <div className="form-grid">
          <PanelSelect name="panelHypp" label="HYPP" defaultValue={v.panelHypp} />
          <PanelSelect name="panelHerda" label="HERDA" defaultValue={v.panelHerda} />
          <PanelSelect name="panelGbed" label="GBED" defaultValue={v.panelGbed} />
          <PanelSelect name="panelPssm1" label="PSSM1" defaultValue={v.panelPssm1} />
          <PanelSelect name="panelMh" label="MH" defaultValue={v.panelMh} />
          <PanelSelect name="panelIma" label="IMM / IMA" defaultValue={v.panelIma} />
        </div>
      </section>

      <section className="form-section">
        <h3>Kontakt</h3>
        <p className="section-hint">
          Diese Angaben stehen öffentlich am Hengst — darüber melden sich
          Interessenten bei dir.
        </p>
        <div className="form-grid">
          <Text name="contactName" label="Ansprechpartner" defaultValue={v.contactName} />
          <Text
            name="contactEmail"
            label="Kontakt-E-Mail"
            type="email"
            required
            defaultValue={v.contactEmail ?? defaultContactEmail}
          />
          <Text name="contactPhone" label="Telefon" defaultValue={v.contactPhone} />
          <Text
            name="website"
            label="Website"
            type="url"
            placeholder="https://…"
            defaultValue={v.website}
          />
        </div>

        <div className="checks" style={{ marginTop: 16 }}>
          <Check
            name="published"
            label="Eintrag öffentlich sichtbar"
            defaultChecked={v.published ?? true}
          />
        </div>
      </section>

      {state?.error && <div className="alert alert-error">{state.error}</div>}
      {state?.ok && <div className="alert alert-ok">{state.ok}</div>}

      <div className="row">
        <SubmitButton pendingLabel="Wird gespeichert …">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

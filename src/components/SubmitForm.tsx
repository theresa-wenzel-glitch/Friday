"use client";

import { useActionState } from "react";
import { submitHorseAction } from "@/app/(western)/actions";
import { EMPTY_SUBMIT_STATE, type SubmitState } from "@/lib/form-state";
import {
  AVAILABILITIES,
  BREEDS,
  DISCIPLINES,
  GENETIC_TESTS,
  SEXES,
} from "@/lib/types";
import { AVAILABILITY_LABEL, SEX_LABEL } from "@/lib/labels";

export function SubmitForm() {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitHorseAction,
    EMPTY_SUBMIT_STATE,
  );

  const value = (key: string) => state.values[key] ?? "";
  const error = (key: string) => state.errors[key];

  return (
    <form action={formAction} className="space-y-10">
      {(state.errors._form || state.errors._spam) && (
        <p
          className="rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: "#fdecea", color: "#8b1f16" }}
        >
          {state.errors._form ?? state.errors._spam}
        </p>
      )}

      {/* Honeypot - für Menschen unsichtbar. */}
      <div aria-hidden className="hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Section
        title="Das Pferd"
        hint="Nur Name und Kontaktadresse sind Pflicht. Alles andere kann später ergänzt werden - lieber ein Feld leer lassen als raten."
      >
        <Field label="Name laut Papieren" name="name" error={error("name")} required>
          <input
            id="name"
            name="name"
            className="field"
            required
            maxLength={80}
            defaultValue={value("name")}
            placeholder="z. B. Smart Little Lena"
          />
        </Field>

        <Field label="Rufname / Stallname" name="aka" error={error("aka")}>
          <input
            id="aka"
            name="aka"
            className="field"
            maxLength={80}
            defaultValue={value("aka")}
            placeholder="z. B. Little Peppy"
          />
        </Field>

        <Field label="Geschlecht" name="sex" error={error("sex")}>
          <select id="sex" name="sex" className="field" defaultValue={value("sex") || "stallion"}>
            {SEXES.map((s) => (
              <option key={s} value={s}>
                {SEX_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Rasse" name="breed" error={error("breed")}>
          <select id="breed" name="breed" className="field" defaultValue={value("breed")}>
            <option value="">bitte wählen</option>
            {BREEDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Papiernummer" name="registryNo" error={error("registryNo")}>
          <input
            id="registryNo"
            name="registryNo"
            className="field"
            maxLength={40}
            defaultValue={value("registryNo")}
            placeholder="AQHA / APHA / ApHC"
          />
        </Field>

        <Field label="Geburtsjahr" name="yearOfBirth" error={error("yearOfBirth")}>
          <input
            id="yearOfBirth"
            name="yearOfBirth"
            type="number"
            inputMode="numeric"
            className="field"
            min={1850}
            max={new Date().getFullYear() + 1}
            defaultValue={value("yearOfBirth")}
          />
        </Field>

        <Field
          label="Todesjahr"
          name="yearOfDeath"
          error={error("yearOfDeath")}
          hint="nur falls das Pferd verstorben ist"
        >
          <input
            id="yearOfDeath"
            name="yearOfDeath"
            type="number"
            inputMode="numeric"
            className="field"
            min={1850}
            max={new Date().getFullYear()}
            defaultValue={value("yearOfDeath")}
          />
        </Field>

        <Field label="Farbe" name="color" error={error("color")}>
          <input
            id="color"
            name="color"
            className="field"
            maxLength={120}
            defaultValue={value("color")}
            placeholder="z. B. Fuchs, Buckskin, Blue Roan"
          />
        </Field>

        <Field label="Stockmaß in cm" name="heightCm" error={error("heightCm")}>
          <input
            id="heightCm"
            name="heightCm"
            type="number"
            inputMode="numeric"
            className="field"
            min={100}
            max={200}
            defaultValue={value("heightCm")}
          />
        </Field>
      </Section>

      <Section
        title="Abstammung"
        hint="Vater und Mutter genau so schreiben wie in den Papieren. Existiert der Vorfahr bereits im Verzeichnis, verbindet sich der Stammbaum automatisch."
      >
        <Field label="Vater" name="sireName" error={error("sireName")}>
          <input
            id="sireName"
            name="sireName"
            className="field"
            maxLength={80}
            defaultValue={value("sireName")}
            placeholder="z. B. Doc O'Lena"
          />
        </Field>

        <Field label="Mutter" name="damName" error={error("damName")}>
          <input
            id="damName"
            name="damName"
            className="field"
            maxLength={80}
            defaultValue={value("damName")}
            placeholder="z. B. Smart Peppy"
          />
        </Field>

        <Field
          label="Link zu All Breed Pedigree"
          name="allbreedUrl"
          error={error("allbreedUrl")}
          hint="freiwillig - ohne Angabe wird automatisch ein Suchlink erzeugt"
          wide
        >
          <input
            id="allbreedUrl"
            name="allbreedUrl"
            className="field"
            defaultValue={value("allbreedUrl")}
            placeholder="https://www.allbreedpedigree.com/…"
          />
        </Field>

        <Field
          label="Anmerkung zur Blutlinie"
          name="bloodlineNote"
          error={error("bloodlineNote")}
          wide
        >
          <textarea
            id="bloodlineNote"
            name="bloodlineNote"
            rows={2}
            className="field"
            maxLength={4000}
            defaultValue={value("bloodlineNote")}
          />
        </Field>
      </Section>

      <Section title="Sport und Zucht">
        <fieldset className="sm:col-span-2">
          <legend className="label">Disziplinen</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {DISCIPLINES.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="disciplines" value={d} />
                {d}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Beschreibung" name="description" error={error("description")} wide
          hint="Bitte in eigenen Worten - keine Texte aus anderen Hengstkatalogen übernehmen.">
          <textarea
            id="description"
            name="description"
            rows={5}
            className="field"
            maxLength={4000}
            defaultValue={value("description")}
            placeholder="Charakter, Typ, Ausbildungsstand, was den Hengst ausmacht …"
          />
        </Field>

        <Field label="Turniererfolge" name="showRecord" error={error("showRecord")} wide>
          <textarea
            id="showRecord"
            name="showRecord"
            rows={4}
            className="field"
            maxLength={4000}
            defaultValue={value("showRecord")}
            placeholder="z. B. NRHA Earnings, Platzierungen, Titel"
          />
        </Field>

        <Field label="Nachkommen" name="offspring" error={error("offspring")} wide>
          <textarea
            id="offspring"
            name="offspring"
            rows={4}
            className="field"
            maxLength={4000}
            defaultValue={value("offspring")}
            placeholder="Bekannte Nachkommen und deren Erfolge"
          />
        </Field>
      </Section>

      <Section
        title="Gentests"
        hint="Freiwillig, aber sehr hilfreich. Übliche Schreibweise: N/N, N/H, H/H."
      >
        {GENETIC_TESTS.map((test) => (
          // Feldname enthält einen Punkt (Gruppierung), die id nicht -
          // ein Punkt in der id kollidiert mit der CSS-Selektorsyntax.
          <Field key={test} label={test} name={`genetics.${test}`} htmlFor={`genetics-${test}`}>
            <input
              id={`genetics-${test}`}
              name={`genetics.${test}`}
              className="field"
              maxLength={16}
              defaultValue={value(`genetics.${test}`)}
              placeholder="N/N"
            />
          </Field>
        ))}
      </Section>

      <Section
        title="Standort und Verfügbarkeit"
        hint="Bewusst ohne Decktaxe: dieses Verzeichnis nennt keine Preise. Konditionen klärt ihr direkt miteinander."
      >
        <Field label="Hengststation / Betrieb" name="studName" error={error("studName")}>
          <input
            id="studName"
            name="studName"
            className="field"
            maxLength={120}
            defaultValue={value("studName")}
          />
        </Field>

        <Field label="Ort" name="location" error={error("location")}>
          <input
            id="location"
            name="location"
            className="field"
            maxLength={120}
            defaultValue={value("location")}
            placeholder="z. B. 48231 Warendorf"
          />
        </Field>

        <Field
          label="Land"
          name="country"
          error={error("country")}
          hint="zweistelliger Länder-Code, z. B. DE, AT, CH, US"
        >
          <input
            id="country"
            name="country"
            className="field"
            maxLength={2}
            style={{ textTransform: "uppercase" }}
            defaultValue={value("country")}
            placeholder="DE"
          />
        </Field>

        <Field label="Verfügbarkeit" name="availability" error={error("availability")}>
          <select
            id="availability"
            name="availability"
            className="field"
            defaultValue={value("availability") || "unknown"}
          >
            {AVAILABILITIES.map((a) => (
              <option key={a} value={a}>
                {AVAILABILITY_LABEL[a]}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section
        title="Medien"
        hint="Bitte nur Bilder verlinken, für die ihr die Rechte habt oder eine Erlaubnis vorliegt. Das Bild bleibt auf dem Ursprungsserver liegen."
      >
        <Field label="Bild-Adresse (URL)" name="photoUrl" error={error("photoUrl")} wide>
          <input
            id="photoUrl"
            name="photoUrl"
            className="field"
            defaultValue={value("photoUrl")}
            placeholder="https://…/hengst.jpg"
          />
        </Field>

        <Field label="Bildnachweis" name="photoCredit" error={error("photoCredit")}>
          <input
            id="photoCredit"
            name="photoCredit"
            className="field"
            maxLength={120}
            defaultValue={value("photoCredit")}
            placeholder="Fotograf / Quelle"
          />
        </Field>

        <Field label="Video-Link" name="videoUrl" error={error("videoUrl")}>
          <input
            id="videoUrl"
            name="videoUrl"
            className="field"
            defaultValue={value("videoUrl")}
            placeholder="https://…"
          />
        </Field>
      </Section>

      <Section
        title="Kontakt"
        hint="Die E-Mail-Adresse wird auf der Seite erst auf Klick angezeigt, damit sie nicht automatisch abgegriffen wird."
      >
        <Field label="Besitzer / Ansprechpartner" name="ownerName" error={error("ownerName")}>
          <input
            id="ownerName"
            name="ownerName"
            className="field"
            maxLength={120}
            defaultValue={value("ownerName")}
          />
        </Field>

        <Field
          label="E-Mail für Anfragen"
          name="contactEmail"
          error={error("contactEmail")}
          required
        >
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            className="field"
            required
            defaultValue={value("contactEmail")}
          />
        </Field>

        <Field label="Telefon" name="contactPhone" error={error("contactPhone")}>
          <input
            id="contactPhone"
            name="contactPhone"
            className="field"
            maxLength={120}
            defaultValue={value("contactPhone")}
          />
        </Field>

        <Field label="Website" name="websiteUrl" error={error("websiteUrl")}>
          <input
            id="websiteUrl"
            name="websiteUrl"
            className="field"
            defaultValue={value("websiteUrl")}
            placeholder="https://…"
          />
        </Field>

        <Field
          label="Deine E-Mail für Rückfragen"
          name="submitterEmail"
          error={error("submitterEmail")}
          hint="wird nicht veröffentlicht"
        >
          <input
            id="submitterEmail"
            name="submitterEmail"
            type="email"
            className="field"
            defaultValue={value("submitterEmail")}
          />
        </Field>
      </Section>

      <div className="space-y-4">
        <label className="flex gap-3 items-start text-sm">
          <input type="checkbox" name="consent" value="1" required className="mt-1" />
          <span>
            Ich bestätige, dass ich diese Angaben veröffentlichen darf, dass die
            genannte E-Mail-Adresse für Anfragen zu diesem Pferd genutzt werden
            darf und dass ich keine Texte oder Bilder aus fremden Katalogen
            übernommen habe.
          </span>
        </label>
        {error("consent") && (
          <p className="text-sm" style={{ color: "#b3261e" }}>
            {error("consent")}
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "wird gesendet …" : "Zur Prüfung einsenden"}
        </button>

        <p className="text-sm muted">
          Der Eintrag wird vor der Veröffentlichung kurz gesichtet. Das dauert in
          der Regel ein bis zwei Tage.
        </p>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl mb-1">{title}</h2>
      {hint && <p className="text-sm muted mb-4 max-w-2xl">{hint}</p>}
      <div className="surface rounded-xl p-5 grid gap-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  htmlFor,
  error,
  hint,
  required,
  wide,
  children,
}: {
  label: string;
  name: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label className="label" htmlFor={htmlFor ?? name}>
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      {children}
      {hint && <p className="text-xs muted mt-1">{hint}</p>}
      {error && (
        <p className="text-xs mt-1" style={{ color: "#b3261e" }}>
          {error}
        </p>
      )}
    </div>
  );
}

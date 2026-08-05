"use client";

import { useActionState } from "react";
import { createListingAction } from "@/app/marktplatz/inserieren/actions";
import { EMPTY_LISTING_STATE, type ListingState } from "@/lib/form-state";
import { BREEDS, DISCIPLINES, SEXES } from "@/lib/types";
import { SEX_LABEL } from "@/lib/labels";
import { PhotoUpload } from "@/components/PhotoUpload";

export function ListingForm() {
  const [state, formAction, pending] = useActionState<ListingState, FormData>(
    createListingAction,
    EMPTY_LISTING_STATE,
  );

  const value = (key: string) => state.values[key] ?? "";
  const error = (key: string) => state.errors[key];

  if (state.status === "done") {
    return (
      <p className="surface rounded-xl p-5 text-sm">
        Danke - das Inserat wird kurz geprüft und ist danach im Marktplatz
        sichtbar.
      </p>
    );
  }

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

      <Section title="Art des Inserats">
        <Field label="Art" name="kind" error={error("kind")}>
          <select id="kind" name="kind" className="field" defaultValue={value("kind") || "stud"}>
            <option value="stud">Deckhengst</option>
            <option value="sale">Verkaufspferd</option>
          </select>
        </Field>
      </Section>

      <Section title="Das Pferd">
        <Field label="Name" name="name" error={error("name")} required>
          <input
            id="name"
            name="name"
            className="field"
            required
            maxLength={80}
            defaultValue={value("name")}
            placeholder="z. B. Custom Del Cielo"
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

        <Field label="Geburtsjahr" name="yearOfBirth" error={error("yearOfBirth")}>
          <input
            id="yearOfBirth"
            name="yearOfBirth"
            type="number"
            inputMode="numeric"
            className="field"
            min={1980}
            max={new Date().getFullYear() + 1}
            defaultValue={value("yearOfBirth")}
          />
        </Field>

        <Field label="Farbe" name="color" error={error("color")}>
          <input id="color" name="color" className="field" maxLength={120} defaultValue={value("color")} />
        </Field>

        <Field label="Land" name="country" error={error("country")} hint="Zweistelliger Code, z. B. DE, AT, US">
          <input
            id="country"
            name="country"
            className="field"
            maxLength={2}
            defaultValue={value("country")}
            placeholder="DE"
          />
        </Field>

        <Field label="Ort / Station" name="location" error={error("location")}>
          <input id="location" name="location" className="field" maxLength={120} defaultValue={value("location")} />
        </Field>

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

        <Field
          label="Beschreibung"
          name="description"
          error={error("description")}
          wide
          hint="Bitte in eigenen Worten - keine Texte aus anderen Katalogen übernehmen."
        >
          <textarea
            id="description"
            name="description"
            rows={4}
            className="field"
            maxLength={4000}
            defaultValue={value("description")}
          />
        </Field>
      </Section>

      <Section title="Preis" hint="Leer lassen für „auf Anfrage“.">
        <Field label="Decktaxe / Preis in Euro" name="price" error={error("price")}>
          <input
            id="price"
            name="price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className="field"
            defaultValue={value("price")}
            placeholder="z. B. 950"
          />
        </Field>

        <Field
          label="Zusatz zum Preis"
          name="priceLabel"
          error={error("priceLabel")}
          hint='z. B. "zzgl. Versandsamen"'
        >
          <input id="priceLabel" name="priceLabel" className="field" maxLength={80} defaultValue={value("priceLabel")} />
        </Field>
      </Section>

      <Section title="Foto">
        <Field label="Bild" name="photoUrl" error={error("photoUrl")} wide>
          <PhotoUpload id="photoUrl" name="photoUrl" defaultValue={value("photoUrl")} />
        </Field>
      </Section>

      <Section
        title="Kontakt"
        hint="Die E-Mail-Adresse wird auf der Seite erst auf Klick angezeigt, damit sie nicht automatisch abgegriffen wird."
      >
        <Field label="Ansprechpartner" name="contactName" error={error("contactName")}>
          <input id="contactName" name="contactName" className="field" maxLength={120} defaultValue={value("contactName")} />
        </Field>

        <Field label="E-Mail für Anfragen" name="contactEmail" error={error("contactEmail")} required>
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
          <input id="contactPhone" name="contactPhone" className="field" maxLength={120} defaultValue={value("contactPhone")} />
        </Field>
      </Section>

      <div className="space-y-4">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "wird gesendet …" : "Zur Prüfung einsenden"}
        </button>
        <p className="text-sm muted">
          Das Inserat wird vor der Veröffentlichung kurz gesichtet.
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

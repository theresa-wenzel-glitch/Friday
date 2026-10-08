"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  abschliessenAction,
  baustelleAnlegenAction,
  betriebNameAction,
  entwurfSpeichernAction,
  loginAction,
  nachtragAction,
  registrierenAction,
} from "@/app/(bautagebuch)/bautagebuch/actions";
import { LEER, type FormZustand } from "@/lib/bautagebuch/form-state";
import { FELDER, type EintragDaten } from "@/lib/bautagebuch/types";

function Senden({ children, className = "btb-btn btb-btn-primary w-full" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? <span className="btb-spinner" aria-hidden /> : null}
      {children}
    </button>
  );
}

function Meldung({ zustand }: { zustand: FormZustand }) {
  if (zustand.fehler) {
    return (
      <p className="btb-notice btb-notice-error" role="alert">
        {zustand.fehler}
      </p>
    );
  }
  if (zustand.ok) {
    return (
      <p className="btb-notice btb-notice-ok" role="status">
        {zustand.ok}
      </p>
    );
  }
  return null;
}

export function LoginFormular({ code }: { code?: string }) {
  const [zustand, action] = useActionState(loginAction, LEER);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="btb-label" htmlFor="code">
          Zugangscode des Betriebs
        </label>
        <input
          id="code"
          name="code"
          className="btb-field font-mono tracking-widest uppercase"
          placeholder="ABCD-EFGH-JKMN"
          autoComplete="off"
          autoCapitalize="characters"
          defaultValue={zustand.werte?.code ?? code}
          required
        />
      </div>
      <div>
        <label className="btb-label" htmlFor="person">
          Ihr Name
        </label>
        <input
          id="person"
          name="person"
          className="btb-field"
          placeholder="z. B. Tom Becker"
          autoComplete="name"
          defaultValue={zustand.werte?.person}
          required
        />
        <p className="text-sm btb-muted mt-1">Steht als „erfasst von“ in jedem Eintrag.</p>
      </div>
      <Meldung zustand={zustand} />
      <Senden>Anmelden</Senden>
    </form>
  );
}

export function RegistrierenFormular() {
  const [zustand, action] = useActionState(registrierenAction, LEER);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="btb-label" htmlFor="name">
          Name des Betriebs
        </label>
        <input
          id="name"
          name="name"
          className="btb-field"
          placeholder="z. B. Becker Bedachungen GmbH"
          autoComplete="organization"
          defaultValue={zustand.werte?.name}
          required
        />
      </div>
      <div>
        <label className="btb-label" htmlFor="inhaber">
          Ihr Name
        </label>
        <input
          id="inhaber"
          name="inhaber"
          className="btb-field"
          autoComplete="name"
          defaultValue={zustand.werte?.inhaber}
          required
        />
      </div>
      <div>
        <label className="btb-label" htmlFor="email">
          E-Mail (freiwillig)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="btb-field"
          autoComplete="email"
          defaultValue={zustand.werte?.email}
        />
      </div>
      <Meldung zustand={zustand} />
      <Senden>Kostenlos starten</Senden>
    </form>
  );
}

export function BaustelleFormular() {
  const [zustand, action] = useActionState(baustelleAnlegenAction, LEER);
  return (
    <form action={action} className="space-y-3" key={zustand.ok ?? "leer"}>
      <div>
        <label className="btb-label" htmlFor="bs-name">
          Bezeichnung *
        </label>
        <input
          id="bs-name"
          name="name"
          className="btb-field"
          placeholder="z. B. EFH Müller, Neubau Kita Lindenstraße"
          defaultValue={zustand.fehler ? zustand.werte?.name : ""}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="btb-label" htmlFor="bs-adresse">
            Straße
          </label>
          <input id="bs-adresse" name="adresse" className="btb-field" defaultValue={zustand.fehler ? zustand.werte?.adresse : ""} />
        </div>
        <div>
          <label className="btb-label" htmlFor="bs-ort">
            Ort (für das Wetter)
          </label>
          <input id="bs-ort" name="ort" className="btb-field" placeholder="z. B. Freiburg" defaultValue={zustand.fehler ? zustand.werte?.ort : ""} />
        </div>
      </div>
      <div>
        <label className="btb-label" htmlFor="bs-ag">
          Auftraggeber / Bauherr
        </label>
        <input id="bs-ag" name="auftraggeber" className="btb-field" defaultValue={zustand.fehler ? zustand.werte?.auftraggeber : ""} />
      </div>
      <Meldung zustand={zustand} />
      <Senden className="btb-btn btb-btn-primary">Baustelle anlegen</Senden>
    </form>
  );
}

export function BetriebNameFormular({ name }: { name: string }) {
  const [zustand, action] = useActionState(betriebNameAction, LEER);
  return (
    <form action={action} className="space-y-3">
      <label className="btb-label" htmlFor="betrieb-name">
        Name im PDF-Kopf
      </label>
      <div className="flex gap-2">
        <input id="betrieb-name" name="name" className="btb-field" defaultValue={name} required />
        <Senden className="btb-btn btb-btn-secondary shrink-0">Speichern</Senden>
      </div>
      <Meldung zustand={zustand} />
    </form>
  );
}

export function EntwurfFormular({ id, datum, daten }: { id: number; datum: string; daten: EintragDaten }) {
  const [zustand, speichern] = useActionState(entwurfSpeichernAction, LEER);
  const [abschlussZustand, abschliessen] = useActionState(abschliessenAction, LEER);
  return (
    <form action={speichern} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="btb-label" htmlFor="datum">
          Datum
        </label>
        <input id="datum" name="datum" type="date" className="btb-field" defaultValue={datum} required />
      </div>
      {FELDER.map((f) => (
        <div key={f.key}>
          <label className="btb-label" htmlFor={`f-${f.key}`}>
            {f.label}
          </label>
          <textarea
            id={`f-${f.key}`}
            name={f.key}
            className="btb-field"
            rows={f.key === "leistungen" ? 4 : 2}
            defaultValue={daten[f.key]}
          />
        </div>
      ))}
      <Meldung zustand={abschlussZustand.fehler ? abschlussZustand : zustand} />
      <div id="abschliessen" className="grid gap-2 sm:grid-cols-2">
        <Senden className="btb-btn btb-btn-secondary">Zwischenspeichern</Senden>
        <AbschliessenKnopf action={abschliessen} />
      </div>
      <p className="text-xs btb-muted">
        „Prüfen &amp; abschließen“ speichert Ihre Änderungen, vergibt die laufende Nummer und schreibt den Eintrag fest.
        Danach sind nur noch Nachträge möglich.
      </p>
    </form>
  );
}

function AbschliessenKnopf({ action }: { action: (form: FormData) => void }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" formAction={action} className="btb-btn btb-btn-primary" disabled={pending}>
      {pending ? <span className="btb-spinner" aria-hidden /> : null}
      Prüfen &amp; abschließen
    </button>
  );
}

export function NachtragFormular({ id }: { id: number }) {
  const [zustand, action] = useActionState(nachtragAction, LEER);
  return (
    <form action={action} className="space-y-3" key={zustand.ok ?? "leer"}>
      <input type="hidden" name="id" value={id} />
      <label className="btb-label" htmlFor="nachtrag">
        Nachtrag hinzufügen
      </label>
      <textarea
        id="nachtrag"
        name="text"
        className="btb-field"
        placeholder="z. B. Korrektur: Betonlieferung kam 2,5 statt 2 Stunden zu spät."
      />
      <Meldung zustand={zustand} />
      <Senden className="btb-btn btb-btn-secondary">Nachtrag speichern</Senden>
    </form>
  );
}

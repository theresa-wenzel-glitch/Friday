"use client";

import { useActionState } from "react";
import { registerAction, type FormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { COUNTRY_OPTIONS } from "@/lib/countries";

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(registerAction, undefined);

  return (
    <form action={action} className="stack" style={{ gap: 14 }}>
      <div className="field">
        <label htmlFor="name">Dein Name *</label>
        <input id="name" name="name" type="text" autoComplete="name" required />
      </div>

      <div className="field">
        <label htmlFor="email">E-Mail-Adresse *</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <span className="field-hint">
          Damit meldest du dich an. Interessenten erreichen dich über die Adresse,
          die du beim jeweiligen Hengst angibst.
        </span>
      </div>

      <div className="field">
        <label htmlFor="password">Passwort *</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <span className="field-hint">Mindestens 8 Zeichen.</span>
      </div>

      <div className="field">
        <label htmlFor="farm">Betrieb / Station</label>
        <input id="farm" name="farm" type="text" placeholder="z. B. Westernstall Musterhof" />
      </div>

      <div className="field">
        <label htmlFor="phone">Telefon</label>
        <input id="phone" name="phone" type="text" autoComplete="tel" />
      </div>

      <div className="field">
        <label htmlFor="country">Land</label>
        <select id="country" name="country" defaultValue="DE">
          <option value="">Keine Angabe</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {state?.error && <div className="alert alert-error">{state.error}</div>}

      <SubmitButton pendingLabel="Konto wird angelegt …">Konto anlegen</SubmitButton>
    </form>
  );
}

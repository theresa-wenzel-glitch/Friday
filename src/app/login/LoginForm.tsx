"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(loginAction, undefined);

  return (
    <form action={action} className="stack" style={{ gap: 14 }}>
      <div className="field">
        <label htmlFor="email">E-Mail-Adresse</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="field">
        <label htmlFor="password">Passwort</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state?.error && <div className="alert alert-error">{state.error}</div>}

      <SubmitButton pendingLabel="Wird geprüft …">Anmelden</SubmitButton>
    </form>
  );
}

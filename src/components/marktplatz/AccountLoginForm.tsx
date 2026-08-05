"use client";

import { useActionState } from "react";
import { accountLoginAction } from "@/app/marktplatz/konto/actions";
import {
  EMPTY_ACCOUNT_LOGIN_STATE,
  type AccountLoginState,
} from "@/lib/form-state";

export function AccountLoginForm() {
  const [state, formAction, pending] = useActionState<
    AccountLoginState,
    FormData
  >(accountLoginAction, EMPTY_ACCOUNT_LOGIN_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="login-email">
          E-Mail-Adresse
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          className="field"
          required
          autoComplete="email"
          defaultValue={state.email}
        />
      </div>

      <div>
        <label className="label" htmlFor="login-password">
          Passwort
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          className="field"
          required
          autoComplete="current-password"
        />
      </div>

      {state.error && (
        <p className="text-sm" style={{ color: "#b3261e" }}>
          {state.error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "prüfe …" : "Anmelden"}
      </button>
    </form>
  );
}

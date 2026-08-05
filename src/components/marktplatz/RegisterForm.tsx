"use client";

import { useActionState } from "react";
import { registerAction } from "@/app/marktplatz/konto/actions";
import { EMPTY_REGISTER_STATE, type RegisterState } from "@/lib/form-state";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerAction,
    EMPTY_REGISTER_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      {/* Honeypot - für Menschen unsichtbar, Bots füllen es aus. */}
      <div aria-hidden className="hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label className="label" htmlFor="reg-displayName">
          Name (Hof, Deckstation oder du selbst)
        </label>
        <input
          id="reg-displayName"
          name="displayName"
          className="field"
          required
          maxLength={80}
          defaultValue={state.values.displayName}
          placeholder="z. B. Gestüt Sonnenhof"
        />
        {state.errors.displayName && (
          <p className="text-sm mt-1" style={{ color: "#b3261e" }}>
            {state.errors.displayName}
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="reg-email">
          E-Mail-Adresse
        </label>
        <input
          id="reg-email"
          name="email"
          type="email"
          className="field"
          required
          autoComplete="email"
          defaultValue={state.values.email}
        />
        {state.errors.email && (
          <p className="text-sm mt-1" style={{ color: "#b3261e" }}>
            {state.errors.email}
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="reg-phone">
          Telefon (freiwillig)
        </label>
        <input
          id="reg-phone"
          name="phone"
          type="tel"
          className="field"
          autoComplete="tel"
          defaultValue={state.values.phone}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="reg-password">
            Passwort
          </label>
          <input
            id="reg-password"
            name="password"
            type="password"
            className="field"
            required
            minLength={8}
            autoComplete="new-password"
          />
          {state.errors.password && (
            <p className="text-sm mt-1" style={{ color: "#b3261e" }}>
              {state.errors.password}
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="reg-passwordConfirm">
            Passwort wiederholen
          </label>
          <input
            id="reg-passwordConfirm"
            name="passwordConfirm"
            type="password"
            className="field"
            required
            minLength={8}
            autoComplete="new-password"
          />
          {state.errors.passwordConfirm && (
            <p className="text-sm mt-1" style={{ color: "#b3261e" }}>
              {state.errors.passwordConfirm}
            </p>
          )}
        </div>
      </div>

      {state.errors._spam && (
        <p className="text-sm" style={{ color: "#b3261e" }}>
          {state.errors._spam}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "wird angelegt …" : "Konto anlegen"}
      </button>
    </form>
  );
}

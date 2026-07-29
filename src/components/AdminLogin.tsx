"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";
import { EMPTY_LOGIN_STATE, type LoginState } from "@/lib/form-state";

export function AdminLogin({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    EMPTY_LOGIN_STATE,
  );

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-20">
      <h1 className="text-2xl mb-2">Moderation</h1>
      <p className="muted text-sm mb-6">
        Hier werden neue Einträge freigegeben und Korrekturmeldungen bearbeitet.
      </p>

      {!configured && (
        <p
          className="rounded-lg px-4 py-3 text-sm mb-4"
          style={{ backgroundColor: "#fdecea", color: "#8b1f16" }}
        >
          Noch nicht eingerichtet: Bitte <code>ADMIN_PASSWORD</code> und{" "}
          <code>SESSION_SECRET</code> in der Datei <code>.env.local</code>{" "}
          setzen (Vorlage: <code>.env.example</code>) und den Server neu starten.
        </p>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="password">
            Passwort
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="field"
            autoComplete="current-password"
            required
            disabled={!configured}
          />
        </div>

        {state.error && (
          <p className="text-sm" style={{ color: "#b3261e" }}>
            {state.error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={pending || !configured}
        >
          {pending ? "prüfe …" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}

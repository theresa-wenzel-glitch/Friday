"use client";

import { useActionState, useState } from "react";
import { reportCorrectionAction } from "@/app/(western)/actions";
import {
  EMPTY_CORRECTION_STATE,
  type CorrectionState,
} from "@/lib/form-state";

export function CorrectionForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<CorrectionState, FormData>(
    reportCorrectionAction,
    EMPTY_CORRECTION_STATE,
  );

  if (state.status === "sent") {
    return (
      <p className="text-sm muted">
        Danke - die Meldung ist angekommen und wird geprüft.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm underline muted"
      >
        Angabe stimmt nicht? Korrektur melden
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />

      {/* Honeypot - für Menschen unsichtbar, Bots füllen es aus. */}
      <div aria-hidden className="hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label className="label" htmlFor="correction-message">
          Was stimmt nicht?
        </label>
        <textarea
          id="correction-message"
          name="message"
          rows={4}
          required
          minLength={10}
          maxLength={2000}
          className="field"
          placeholder="z. B. Das Geburtsjahr ist 1974, nicht 1975 - laut AQHA-Papier."
        />
      </div>

      <div>
        <label className="label" htmlFor="correction-email">
          Deine E-Mail (freiwillig, für Rückfragen)
        </label>
        <input
          id="correction-email"
          name="reporterEmail"
          type="email"
          className="field"
          autoComplete="email"
        />
      </div>

      {state.status === "error" && (
        <p className="text-sm" style={{ color: "#b3261e" }}>
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "wird gesendet …" : "Korrektur absenden"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setOpen(false)}
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

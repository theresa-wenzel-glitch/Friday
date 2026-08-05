"use client";

import { useActionState } from "react";
import { sendInquiryAction } from "@/app/marktplatz/pferde/[slug]/actions";
import { EMPTY_INQUIRY_STATE, type InquiryState } from "@/lib/form-state";

export function InquiryForm({ listingId }: { listingId: number }) {
  const [state, formAction, pending] = useActionState<InquiryState, FormData>(
    sendInquiryAction,
    EMPTY_INQUIRY_STATE,
  );

  if (state.status === "sent") {
    return (
      <p className="surface rounded-xl p-5 text-sm">
        Danke - die Anfrage ist beim Anbieter angekommen.
      </p>
    );
  }

  return (
    <form action={formAction} className="surface rounded-xl p-5 space-y-4">
      <h2 className="text-xl">Kontakt aufnehmen</h2>

      <input type="hidden" name="listingId" value={listingId} />

      {/* Honeypot - für Menschen unsichtbar. */}
      <div aria-hidden className="hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label className="label" htmlFor="senderName">
          Dein Name
        </label>
        <input id="senderName" name="senderName" className="field" required maxLength={80} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="senderEmail">
            Deine E-Mail
          </label>
          <input
            id="senderEmail"
            name="senderEmail"
            type="email"
            className="field"
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="senderPhone">
            Telefon (freiwillig)
          </label>
          <input id="senderPhone" name="senderPhone" type="tel" className="field" autoComplete="tel" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="message">
          Nachricht
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          minLength={10}
          maxLength={2000}
          className="field"
          placeholder="z. B. Interesse an einem Decktermin im Frühjahr - ist das Pferd noch verfügbar?"
        />
      </div>

      {state.status === "error" && (
        <p className="text-sm" style={{ color: "#b3261e" }}>
          {state.message}
        </p>
      )}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "wird gesendet …" : "Anfrage senden"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { placeBidAction } from "@/app/marktplatz/auktionen/[slug]/actions";
import { EMPTY_BID_STATE, type BidState } from "@/lib/form-state";

export function BidForm({
  slug,
  minAmountCents,
}: {
  slug: string;
  minAmountCents: number;
}) {
  const [state, formAction, pending] = useActionState<BidState, FormData>(
    placeBidAction,
    EMPTY_BID_STATE,
  );

  const minAmount = (minAmountCents / 100).toFixed(2);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="slug" value={slug} />

      <div>
        <label className="label" htmlFor="amount">
          Dein Gebot in Euro (mind. {minAmount})
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          inputMode="decimal"
          // Bewusst kein min-Attribut: das Mindestgebot kann sich ändern,
          // sobald ein anderes Gebot eintrifft, während diese Seite schon
          // offen ist - die massgebliche Prüfung läuft serverseitig in
          // placeBid() und bezieht sich immer auf den aktuellen Stand.
          step="0.01"
          required
          className="field"
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "wird gesendet …" : "Bieten"}
      </button>

      {state.status === "placed" && (
        <p className="text-sm w-full" style={{ color: "var(--accent)" }}>
          Gebot angenommen.
        </p>
      )}
      {state.status === "error" && (
        <p className="text-sm w-full" style={{ color: "#b3261e" }}>
          {state.message}
        </p>
      )}
    </form>
  );
}

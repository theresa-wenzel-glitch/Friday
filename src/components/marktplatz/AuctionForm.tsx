"use client";

import { useActionState } from "react";
import { createAuctionAction } from "@/app/marktplatz/auktionen/erstellen/actions";
import { EMPTY_AUCTION_STATE, type AuctionState } from "@/lib/form-state";
import type { Listing } from "@/lib/marketplace-types";

export function AuctionForm({ listings }: { listings: Listing[] }) {
  const [state, formAction, pending] = useActionState<AuctionState, FormData>(
    createAuctionAction,
    EMPTY_AUCTION_STATE,
  );

  const value = (key: string) => state.values[key] ?? "";
  const error = (key: string) => state.errors[key];

  return (
    <form action={formAction} className="space-y-6">
      {(state.errors._form || state.errors._spam) && (
        <p
          className="rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: "#fdecea", color: "#8b1f16" }}
        >
          {state.errors._form ?? state.errors._spam}
        </p>
      )}

      <div aria-hidden className="hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="surface rounded-xl p-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="title">
            Titel
          </label>
          <input
            id="title"
            name="title"
            className="field"
            required
            maxLength={120}
            defaultValue={value("title")}
            placeholder="z. B. Decktermin Frühjahr 2027 - Custom Del Cielo"
          />
          {error("title") && (
            <p className="text-xs mt-1" style={{ color: "#b3261e" }}>
              {error("title")}
            </p>
          )}
        </div>

        {listings.length > 0 && (
          <div className="sm:col-span-2">
            <label className="label" htmlFor="listingId">
              Verknüpftes Inserat (freiwillig)
            </label>
            <select id="listingId" name="listingId" className="field">
              <option value="">kein Inserat verknüpfen</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">
            Beschreibung
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="field"
            maxLength={4000}
            defaultValue={value("description")}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="seasonNote">
            Deckzeitraum
          </label>
          <input
            id="seasonNote"
            name="seasonNote"
            className="field"
            maxLength={120}
            defaultValue={value("seasonNote")}
            placeholder="z. B. Deckzeitraum Mai-Juni 2027"
          />
        </div>

        <div>
          <label className="label" htmlFor="startAt">
            Beginn der Auktion
          </label>
          <input
            id="startAt"
            name="startAt"
            type="datetime-local"
            className="field"
            required
            defaultValue={value("startAt")}
          />
          {error("startAt") && (
            <p className="text-xs mt-1" style={{ color: "#b3261e" }}>
              {error("startAt")}
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="endAt">
            Ende der Auktion
          </label>
          <input
            id="endAt"
            name="endAt"
            type="datetime-local"
            className="field"
            required
            defaultValue={value("endAt")}
          />
          {error("endAt") && (
            <p className="text-xs mt-1" style={{ color: "#b3261e" }}>
              {error("endAt")}
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="startingPrice">
            Startgebot in Euro
          </label>
          <input
            id="startingPrice"
            name="startingPrice"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className="field"
            defaultValue={value("startingPrice")}
            placeholder="z. B. 500"
          />
          {error("startingPrice") && (
            <p className="text-xs mt-1" style={{ color: "#b3261e" }}>
              {error("startingPrice")}
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="minIncrement">
            Mindeststeigerung in Euro
          </label>
          <input
            id="minIncrement"
            name="minIncrement"
            type="number"
            inputMode="decimal"
            min={1}
            step="0.01"
            className="field"
            defaultValue={value("minIncrement") || "10"}
          />
          {error("minIncrement") && (
            <p className="text-xs mt-1" style={{ color: "#b3261e" }}>
              {error("minIncrement")}
            </p>
          )}
        </div>
      </div>

      <p className="text-sm muted surface rounded-xl p-4">
        Auktionsgebühr: 25 € pro eingestellter Auktion. Es gibt derzeit keinen
        automatischen Zahlungsvorgang - die Gebühr wird nach Freigabe der
        Auktion separat in Rechnung gestellt (z. B. per Überweisung).
      </p>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "wird gesendet …" : "Auktion zur Prüfung einsenden"}
      </button>
    </form>
  );
}

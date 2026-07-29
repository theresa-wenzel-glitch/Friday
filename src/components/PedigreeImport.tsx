"use client";

import { useActionState, useState } from "react";
import {
  applyImportAction,
  previewImportAction,
} from "@/app/admin/abstammung/actions";
import { EMPTY_IMPORT_STATE, type ImportState } from "@/lib/form-state";

const BEISPIEL = `# Ein Pferd je Zeile:  Name | Vater | Mutter
# Unbekannt? Bindestrich setzen. Zeilen mit # werden übersprungen.
# Jahrgang und Farbe sind freiwillig:  Name | Vater | Mutter | 1993 | Fuchs

Colonels Smoking Gun | Colonelfourfreckle | Katie Gun | 1993
Colonelfourfreckle | Colonel Freckles | Miss Solano | 1979
Katie Gun | John Gun | Bueno Katie | 1987
Miss Solano | Doc's Solano | -
Bueno Katie | Aledo Bueno Bar | -`;

export function PedigreeImport() {
  const [text, setText] = useState("");

  const [preview, previewAction, previewPending] = useActionState<
    ImportState,
    FormData
  >(previewImportAction, EMPTY_IMPORT_STATE);

  const [applied, applyAction, applyPending] = useActionState<
    ImportState,
    FormData
  >(applyImportAction, EMPTY_IMPORT_STATE);

  const showPreview = preview.status === "preview" && applied.status !== "done";

  return (
    <div className="space-y-6">
      <form action={previewAction} className="space-y-3">
        <div>
          <label className="label" htmlFor="text">
            Abstammungen
          </label>
          <textarea
            id="text"
            name="text"
            rows={12}
            className="field"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.85rem" }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={BEISPIEL}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary" disabled={previewPending}>
            {previewPending ? "prüfe …" : "Vorschau anzeigen"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setText(BEISPIEL)}
          >
            Beispiel einfügen
          </button>
          {text && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setText("")}
            >
              Leeren
            </button>
          )}
        </div>
      </form>

      {applied.status === "done" && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: "var(--surface-muted)", border: "1px solid var(--line)" }}
        >
          <strong>Übernommen.</strong> {applied.message}
        </div>
      )}

      {(preview.errors?.length ?? 0) > 0 && showPreview && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: "#fdecea", color: "#8b1f16" }}
        >
          <p className="font-semibold mb-1">
            Diese Zeilen wurden übersprungen:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            {preview.errors!.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {showPreview && preview.actions && preview.actions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg">Das würde passieren</h3>
          <p className="text-sm muted">
            {preview.counts!.create} neu, {preview.counts!.update} ergänzt,{" "}
            {preview.counts!.unchanged} unverändert. Vorhandene Angaben werden
            nie überschrieben - es wird nur nachgetragen, was noch fehlt.
          </p>

          <ul className="text-sm space-y-1">
            {preview.actions.map((a, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2">
                <span
                  className="chip"
                  style={
                    a.kind === "create"
                      ? {
                          backgroundColor: "color-mix(in srgb, var(--accent) 16%, var(--surface))",
                          color: "var(--accent)",
                        }
                      : undefined
                  }
                >
                  {a.kind === "create" ? "neu" : a.kind === "update" ? "ergänzt" : "unverändert"}
                </span>
                <span className="font-medium">{a.name}</span>
                <span className="muted">
                  ({a.sex === "mare" ? "Stute" : "Hengst"}) – {a.detail}
                </span>
              </li>
            ))}
          </ul>

          <form action={applyAction}>
            <input type="hidden" name="text" value={preview.text} />
            <button type="submit" className="btn btn-primary" disabled={applyPending}>
              {applyPending ? "wird übernommen …" : "Übernehmen"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

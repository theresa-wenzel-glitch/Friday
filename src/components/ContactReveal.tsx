"use client";

import { useActionState } from "react";
import { revealContactAction } from "@/app/actions";
import { EMPTY_CONTACT_STATE, type ContactState } from "@/lib/form-state";

export function ContactReveal({
  slug,
  horseName,
  ownerName,
  phone,
  websiteUrl,
}: {
  slug: string;
  horseName: string;
  ownerName: string | null;
  phone: string | null;
  websiteUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    revealContactAction,
    EMPTY_CONTACT_STATE,
  );

  const subject = encodeURIComponent(`Anfrage zu ${horseName}`);

  return (
    <div className="surface rounded-xl p-5">
      <h2 className="text-lg mb-1">Kontakt</h2>
      <p className="text-sm muted mb-4">
        Anfragen gehen direkt an den Besitzer bzw. die Hengststation. Dieses
        Verzeichnis vermittelt nicht und ist an keiner Anfrage beteiligt.
      </p>

      <dl className="text-sm space-y-2 mb-4">
        {ownerName && (
          <div className="flex gap-2">
            <dt className="muted min-w-24">Besitzer</dt>
            <dd>{ownerName}</dd>
          </div>
        )}
        {phone && (
          <div className="flex gap-2">
            <dt className="muted min-w-24">Telefon</dt>
            <dd>{phone}</dd>
          </div>
        )}
        {websiteUrl && (
          <div className="flex gap-2">
            <dt className="muted min-w-24">Website</dt>
            <dd className="break-all">
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline"
              >
                {websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {state.status === "revealed" && state.email ? (
        <div>
          <p className="text-sm muted mb-1">E-Mail</p>
          <a
            href={`mailto:${state.email}?subject=${subject}`}
            className="text-base font-semibold underline break-all"
          >
            {state.email}
          </a>
        </div>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="slug" value={slug} />
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "einen Moment …" : "E-Mail-Adresse anzeigen"}
          </button>
          <p className="text-xs muted mt-2">
            Die Adresse wird erst auf Klick geladen - so lesen automatische
            Adress-Sammler sie nicht mit.
          </p>
        </form>
      )}

      {state.status === "error" && (
        <p className="text-sm mt-3" style={{ color: "#b3261e" }}>
          {state.message}
        </p>
      )}
    </div>
  );
}

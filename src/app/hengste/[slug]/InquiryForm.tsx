"use client";

import { useActionState } from "react";
import { sendInquiryAction, type FormState } from "@/app/actions/stallions";
import { SubmitButton } from "@/components/SubmitButton";

export function InquiryForm({ stallionId }: { stallionId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    sendInquiryAction,
    undefined,
  );

  if (state?.ok) {
    return <div className="alert alert-ok">{state.ok}</div>;
  }

  return (
    <form action={action} className="stack" style={{ gap: 10 }}>
      <input type="hidden" name="stallionId" value={stallionId} />

      <div className="field">
        <label htmlFor="fromName">Dein Name</label>
        <input id="fromName" name="fromName" type="text" required />
      </div>

      <div className="field">
        <label htmlFor="fromEmail">Deine E-Mail-Adresse</label>
        <input id="fromEmail" name="fromEmail" type="email" required />
      </div>

      <div className="field">
        <label htmlFor="message">Nachricht</label>
        <textarea
          id="message"
          name="message"
          required
          placeholder="Hallo, ich interessiere mich für einen Decksprung in der Saison …"
        />
      </div>

      {state?.error && <div className="alert alert-error">{state.error}</div>}

      <SubmitButton pendingLabel="Wird gesendet …">Anfrage senden</SubmitButton>
    </form>
  );
}

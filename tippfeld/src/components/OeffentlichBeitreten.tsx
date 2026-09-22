"use client";

import { useActionState } from "react";
import { ligaBeitreten, type Zustand } from "@/lib/aktionen";
import { Meldung } from "./Meldung";

export function OeffentlichBeitreten({ code }: { code: string }) {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(ligaBeitreten, {});
  return (
    <div className="stapel stapel--eng">
      <form action={absenden}>
        <input type="hidden" name="code" value={code} />
        <button type="submit" className="tf-knopf" disabled={laeuft}>
          {laeuft ? "Einen Moment …" : "Beitreten"}
        </button>
      </form>
      <Meldung zustand={zustand} />
    </div>
  );
}

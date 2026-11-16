import type { Metadata } from "next";
import { getOperator, isOperatorComplete } from "@/lib/kuehl/operator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  const o = getOperator();
  return (
    <section className="k-view">
      <h1 className="k-h1">Impressum</h1>
      <div className="k-card" style={{ display: "grid", gap: 12 }}>
        {isOperatorComplete(o) ? (
          <>
            <div>
              <span className="k-eyebrow">Angaben gemäß § 5 DDG</span>
              <p style={{ marginTop: 6 }}>
                {o.name}
                {o.address.map((line) => (
                  <span key={line}>
                    <br />
                    {line}
                  </span>
                ))}
              </p>
            </div>
            <div>
              <span className="k-eyebrow">Kontakt</span>
              <p style={{ marginTop: 6 }}>E-Mail: {o.email}</p>
            </div>
            <div>
              <span className="k-eyebrow">Verantwortlich für den Inhalt</span>
              <p style={{ marginTop: 6 }}>{o.name}, Anschrift wie oben</p>
            </div>
          </>
        ) : (
          <p className="k-error">
            Die Angaben zum Impressum sind noch nicht eingetragen (IMPRESSUM_NAME, IMPRESSUM_ANSCHRIFT, IMPRESSUM_EMAIL).
          </p>
        )}
      </div>
      <div className="k-card" style={{ display: "grid", gap: 8 }}>
        <span className="k-eyebrow">Hinweis</span>
        <p>
          Kühl in Mülheim ist ein privates Bürgerprojekt und kein Angebot der Stadt Mülheim an der Ruhr. Alle Angaben ohne
          Gewähr. Ob ein Brunnen läuft oder ein Bad geöffnet hat, bitte vor Ort oder beim Betreiber prüfen.
        </p>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { StallionForm } from "@/components/StallionForm";
import { createStallionAction } from "@/app/actions/stallions";

export const metadata: Metadata = { title: "Hengst eintragen" };

export default async function NewStallionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="container page stack">
      <div>
        <div className="small muted">
          <Link href="/mein-bereich">← Mein Bereich</Link>
        </div>
        <h1 style={{ marginBottom: 4 }}>Hengst eintragen</h1>
        <p className="muted" style={{ maxWidth: "65ch" }}>
          Pflichtfelder sind Name, Rasse, Disziplin, Land und Kontakt-E-Mail.
          Alles andere kannst du jederzeit nachtragen. Fotos lädst du nach dem
          Speichern hoch.
        </p>
      </div>

      <StallionForm
        action={createStallionAction}
        submitLabel="Hengst speichern"
        defaultContactEmail={user.email}
        values={{
          country: user.country ?? "DE",
          standingAt: user.farm,
          contactName: user.name,
          contactPhone: user.phone,
          currency: user.country === "US" || user.country === "CA" ? "USD" : "EUR",
        }}
      />
    </div>
  );
}

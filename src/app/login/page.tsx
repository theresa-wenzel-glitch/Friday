import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/mein-bereich");

  return (
    <div className="container page">
      <div className="form-narrow stack">
        <div>
          <h1>Anmelden</h1>
          <p className="muted">
            Melde dich an, um deine Hengste zu verwalten und Anfragen zu sehen.
          </p>
        </div>

        <div className="card card-pad">
          <LoginForm />
        </div>

        <p className="small muted" style={{ textAlign: "center" }}>
          Noch kein Konto? <Link href="/registrieren">Jetzt kostenlos anmelden</Link>
        </p>
      </div>
    </div>
  );
}

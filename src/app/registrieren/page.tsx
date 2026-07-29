import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Konto anlegen" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/mein-bereich");

  return (
    <div className="container page">
      <div className="form-narrow stack">
        <div>
          <h1>Konto anlegen</h1>
          <p className="muted">
            Kostenlos, nur E-Mail-Adresse und Passwort nötig. Danach kannst du
            eigene Hengste eintragen und Anfragen empfangen.
          </p>
        </div>

        <div className="card card-pad">
          <RegisterForm />
        </div>

        <p className="small muted" style={{ textAlign: "center" }}>
          Schon ein Konto? <Link href="/login">Hier anmelden</Link>
        </p>
      </div>
    </div>
  );
}

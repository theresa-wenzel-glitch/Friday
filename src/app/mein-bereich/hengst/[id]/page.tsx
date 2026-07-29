import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { StallionForm } from "@/components/StallionForm";
import { PhotoManager } from "./PhotoManager";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteStallionAction, updateStallionAction } from "@/app/actions/stallions";

export const metadata: Metadata = { title: "Hengst bearbeiten" };
export const dynamic = "force-dynamic";

export default async function EditStallionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const stallion = await prisma.stallion.findUnique({
    where: { id },
    include: {
      photos: {
        select: { id: true, externalUrl: true, mimeType: true, caption: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!stallion) notFound();
  if (stallion.ownerId !== user.id && user.role !== "ADMIN") {
    return (
      <div className="container page">
        <div className="alert alert-error">
          Dieser Hengst gehört zu einem anderen Konto.
        </div>
      </div>
    );
  }

  return (
    <div className="container page stack">
      <div className="section-title">
        <div>
          <div className="small muted">
            <Link href="/mein-bereich">← Mein Bereich</Link>
          </div>
          <h1 style={{ marginBottom: 4 }}>{stallion.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            <Link href={`/hengste/${stallion.slug}`}>Öffentliche Seite ansehen</Link>
          </p>
        </div>
      </div>

      <PhotoManager stallionId={stallion.id} photos={stallion.photos} />

      <StallionForm
        action={updateStallionAction}
        submitLabel="Änderungen speichern"
        defaultContactEmail={user.email}
        values={stallion}
      />

      <form action={deleteStallionAction} className="panel">
        <input type="hidden" name="id" value={stallion.id} />
        <h3 style={{ marginBottom: 4 }}>Eintrag löschen</h3>
        <p className="small muted">
          Der Hengst wird mitsamt Fotos und Anfragen entfernt. Das lässt sich
          nicht rückgängig machen.
        </p>
        <ConfirmButton
          message={`"${stallion.name}" wirklich löschen? Fotos und Anfragen werden mitgelöscht.`}
        >
          Hengst endgültig löschen
        </ConfirmButton>
      </form>
    </div>
  );
}

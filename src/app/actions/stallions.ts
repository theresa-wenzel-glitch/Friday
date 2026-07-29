"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { regionForCountry } from "@/lib/countries";
import { uniqueSlug } from "@/lib/slug";
import {
  firstError,
  inquirySchema,
  photoUrlSchema,
  stallionSchema,
} from "@/lib/validation";

export type FormState = { error?: string; ok?: string } | undefined;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Stellt sicher, dass der angemeldete Benutzer diesen Hengst bearbeiten darf. */
async function assertCanEdit(stallionId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Bitte zuerst anmelden." as const };

  const stallion = await prisma.stallion.findUnique({
    where: { id: stallionId },
    select: { id: true, slug: true, ownerId: true },
  });
  if (!stallion) return { error: "Dieser Hengst wurde nicht gefunden." as const };
  if (stallion.ownerId !== user.id && user.role !== "ADMIN") {
    return { error: "Dieser Hengst gehört zu einem anderen Konto." as const };
  }
  return { user, stallion };
}

export async function createStallionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Bitte zuerst anmelden." };

  const parsed = stallionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const data = parsed.data;
  const stallion = await prisma.stallion.create({
    data: {
      ...data,
      slug: await uniqueSlug(data.name),
      region: regionForCountry(data.country),
      source: "USER",
      ownerId: user.id,
    },
    select: { id: true },
  });

  revalidatePath("/");
  revalidatePath("/mein-bereich");
  redirect(`/mein-bereich/hengst/${stallion.id}`);
}

export async function updateStallionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const access = await assertCanEdit(id);
  if ("error" in access) return { error: access.error };

  const parsed = stallionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const data = parsed.data;
  const updated = await prisma.stallion.update({
    where: { id },
    data: {
      ...data,
      slug: await uniqueSlug(data.name, id),
      region: regionForCountry(data.country),
    },
    select: { slug: true },
  });

  revalidatePath("/");
  revalidatePath("/mein-bereich");
  revalidatePath(`/hengste/${updated.slug}`);
  return { ok: "Gespeichert." };
}

export async function deleteStallionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const access = await assertCanEdit(id);
  if ("error" in access) return;

  await prisma.stallion.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/mein-bereich");
  redirect("/mein-bereich");
}

export async function addPhotoUrlAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = photoUrlSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const access = await assertCanEdit(parsed.data.stallionId);
  if ("error" in access) return { error: access.error };

  const count = await prisma.photo.count({
    where: { stallionId: parsed.data.stallionId },
  });

  await prisma.photo.create({
    data: {
      stallionId: parsed.data.stallionId,
      externalUrl: parsed.data.externalUrl,
      caption: parsed.data.caption,
      sortOrder: count,
    },
  });

  revalidatePath(`/mein-bereich/hengst/${parsed.data.stallionId}`);
  revalidatePath(`/hengste/${access.stallion.slug}`);
  return { ok: "Foto hinzugefügt." };
}

export async function uploadPhotoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const stallionId = String(formData.get("stallionId") ?? "");
  const access = await assertCanEdit(stallionId);
  if ("error" in access) return { error: access.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte eine Bilddatei auswählen." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Das Bild ist größer als 5 MB. Bitte kleiner speichern." };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: "Bitte ein Bild als JPG, PNG, WebP oder AVIF hochladen." };
  }

  const count = await prisma.photo.count({ where: { stallionId } });
  await prisma.photo.create({
    data: {
      stallionId,
      data: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
      caption: (formData.get("caption") as string)?.trim() || null,
      sortOrder: count,
    },
  });

  revalidatePath(`/mein-bereich/hengst/${stallionId}`);
  revalidatePath(`/hengste/${access.stallion.slug}`);
  return { ok: "Foto hochgeladen." };
}

export async function deletePhotoAction(formData: FormData): Promise<void> {
  const photoId = String(formData.get("photoId") ?? "");
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { stallionId: true },
  });
  if (!photo) return;

  const access = await assertCanEdit(photo.stallionId);
  if ("error" in access) return;

  await prisma.photo.delete({ where: { id: photoId } });
  revalidatePath(`/mein-bereich/hengst/${photo.stallionId}`);
  revalidatePath(`/hengste/${access.stallion.slug}`);
}

export async function sendInquiryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = inquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const stallion = await prisma.stallion.findUnique({
    where: { id: parsed.data.stallionId },
    select: { id: true },
  });
  if (!stallion) return { error: "Dieser Hengst wurde nicht gefunden." };

  await prisma.inquiry.create({ data: parsed.data });
  return {
    ok: "Deine Anfrage ist gespeichert. Der Besitzer sieht sie in seinem Bereich – am schnellsten geht es zusätzlich per direkter E-Mail.",
  };
}

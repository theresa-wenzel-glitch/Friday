"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  deleteHorse,
  getHorseById,
  linkAsParentOfOthers,
  linkParents,
  markCorrectionHandled,
  setVerified,
  updateHorseStatus,
} from "@/lib/db";
import {
  checkPassword,
  createSession,
  destroySession,
  isAdminConfigured,
  requireAdmin,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { LoginState } from "@/lib/form-state";

export async function loginAction(
  _prev: LoginState,
  form: FormData,
): Promise<LoginState> {
  if (!isAdminConfigured()) {
    return {
      error:
        "Der Moderationsbereich ist noch nicht eingerichtet. Bitte ADMIN_PASSWORD und SESSION_SECRET in .env.local setzen.",
    };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";

  // Bremst das Durchprobieren von Passwörtern aus.
  const limit = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return {
      error: `Zu viele Anmeldeversuche. Bitte in ${Math.ceil(
        limit.retryAfterMs / 60000,
      )} Minuten erneut versuchen.`,
    };
  }

  const password = String(form.get("password") ?? "");
  if (!checkPassword(password)) {
    return { error: "Passwort stimmt nicht." };
  }

  await createSession();
  revalidatePath("/admin");
  return {};
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  revalidatePath("/admin");
}

export async function approveAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  updateHorseStatus(id, "approved");

  // Nach der Freigabe die Abstammung mit dem Bestand verknüpfen.
  linkParents(id);
  linkAsParentOfOthers(id);

  revalidatePath("/admin");
  revalidatePath("/hengste");
  const horse = getHorseById(id);
  if (horse) revalidatePath(`/hengste/${horse.slug}`);
}

export async function rejectAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  updateHorseStatus(id, "rejected");
  revalidatePath("/admin");
  revalidatePath("/hengste");
}

export async function verifyAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  const verified = String(form.get("verified")) === "1";
  if (!Number.isInteger(id)) return;

  setVerified(id, verified);

  const horse = getHorseById(id);
  if (horse) revalidatePath(`/hengste/${horse.slug}`);
  revalidatePath("/admin");
}

export async function deleteAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  deleteHorse(id);
  revalidatePath("/admin");
  revalidatePath("/hengste");
}

export async function handleCorrectionAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  markCorrectionHandled(id);
  revalidatePath("/admin");
}

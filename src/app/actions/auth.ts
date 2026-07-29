"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { firstError, loginSchema, registerSchema } from "@/lib/validation";

export type FormState = { error?: string } | undefined;

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { email, password, name, farm, phone, country } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Für diese E-Mail-Adresse gibt es schon ein Konto. Bitte anmelden." };
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      farm,
      phone,
      country,
      passwordHash: await hashPassword(password),
    },
  });

  await createSession(user.id);
  revalidatePath("/", "layout");
  redirect("/mein-bereich");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Bewusst dieselbe Meldung fuer "kein Konto" und "falsches Passwort".
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "E-Mail-Adresse oder Passwort stimmt nicht." };
  }

  await createSession(user.id);
  revalidatePath("/", "layout");
  redirect("/mein-bereich");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  AccountExistsError,
  createAccount,
  createAccountSession,
  destroyAccountSession,
  verifyLogin,
} from "@/lib/accounts";
import { validateRegistration } from "@/lib/marketplace-validate";
import { rateLimit } from "@/lib/rate-limit";
import type {
  AccountLoginState,
  RegisterState,
} from "@/lib/form-state";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
}

export async function registerAction(
  _prev: RegisterState,
  form: FormData,
): Promise<RegisterState> {
  const ip = await clientIp();
  const limit = rateLimit(`market-register:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return {
      status: "error",
      errors: {
        _spam: `Zu viele Registrierungsversuche. Bitte in ${Math.ceil(
          limit.retryAfterMs / 60000,
        )} Minuten erneut versuchen.`,
      },
      values: {},
    };
  }

  const result = validateRegistration(form);
  if (!result.ok || !result.data) {
    return { status: "error", errors: result.errors, values: result.values };
  }

  let account;
  try {
    account = createAccount(result.data);
  } catch (err) {
    if (err instanceof AccountExistsError) {
      return {
        status: "error",
        errors: { email: err.message },
        values: result.values,
      };
    }
    throw err;
  }

  await createAccountSession(account.id);
  redirect("/marktplatz/konto");
}

export async function accountLoginAction(
  _prev: AccountLoginState,
  form: FormData,
): Promise<AccountLoginState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const ip = await clientIp();
  const limit = rateLimit(`market-login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return {
      email,
      error: `Zu viele Anmeldeversuche. Bitte in ${Math.ceil(
        limit.retryAfterMs / 60000,
      )} Minuten erneut versuchen.`,
    };
  }

  const account = verifyLogin(email, password);
  if (!account) {
    return { email, error: "E-Mail-Adresse oder Passwort stimmt nicht." };
  }

  await createAccountSession(account.id);
  redirect("/marktplatz/konto");
}

export async function accountLogoutAction(): Promise<void> {
  await destroyAccountSession();
  revalidatePath("/marktplatz/konto");
  redirect("/marktplatz");
}

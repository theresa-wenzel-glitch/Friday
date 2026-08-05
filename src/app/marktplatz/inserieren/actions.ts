"use server";

import { requireAccount } from "@/lib/accounts";
import { insertListing } from "@/lib/marketplace-db";
import { validateListingSubmission } from "@/lib/marketplace-validate";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ListingState } from "@/lib/form-state";

export async function createListingAction(
  _prev: ListingState,
  form: FormData,
): Promise<ListingState> {
  const account = await requireAccount().catch(() => null);
  if (!account) {
    return {
      status: "error",
      errors: { _form: "Bitte zuerst anmelden." },
      values: {},
    };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
  const limit = rateLimit(`market-listing:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return {
      status: "error",
      errors: {
        _form: `Zu viele Inserate in kurzer Zeit. Bitte in ${Math.ceil(
          limit.retryAfterMs / 60000,
        )} Minuten erneut versuchen.`,
      },
      values: {},
    };
  }

  const result = validateListingSubmission(form);
  if (!result.ok || !result.listing) {
    return { status: "error", errors: result.errors, values: result.values };
  }

  insertListing({ ...result.listing, accountId: account.id });

  revalidatePath("/marktplatz");
  revalidatePath("/marktplatz/pferde");
  return { status: "done", errors: {}, values: {} };
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/accounts";
import { insertAuction, listListingsForAccount } from "@/lib/marketplace-db";
import { validateAuctionSubmission } from "@/lib/marketplace-validate";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import type { AuctionState } from "@/lib/form-state";

export async function createAuctionAction(
  _prev: AuctionState,
  form: FormData,
): Promise<AuctionState> {
  const account = await requireAccount().catch(() => null);
  if (!account) {
    return { status: "error", errors: { _form: "Bitte zuerst anmelden." }, values: {} };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
  const limit = rateLimit(`market-auction:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return {
      status: "error",
      errors: {
        _form: `Zu viele Auktionen in kurzer Zeit. Bitte in ${Math.ceil(
          limit.retryAfterMs / 60000,
        )} Minuten erneut versuchen.`,
      },
      values: {},
    };
  }

  const result = validateAuctionSubmission(form);
  if (!result.ok || !result.data) {
    return { status: "error", errors: result.errors, values: result.values };
  }

  // Nur eine eigene, tatsächlich existierende Anzeige darf verknüpft werden.
  const listingIdRaw = Number(form.get("listingId"));
  const ownListings = listListingsForAccount(account.id);
  const listingId = ownListings.some((l) => l.id === listingIdRaw) ? listingIdRaw : null;

  insertAuction({ ...result.data, listingId, accountId: account.id });

  revalidatePath("/marktplatz/auktionen");
  redirect("/marktplatz/konto");
}

"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAccount } from "@/lib/accounts";
import { getAuctionBySlug, placeBid } from "@/lib/marketplace-db";
import { validateBidAmount } from "@/lib/marketplace-validate";
import { rateLimit } from "@/lib/rate-limit";
import type { BidState } from "@/lib/form-state";

export async function placeBidAction(
  _prev: BidState,
  form: FormData,
): Promise<BidState> {
  const account = await requireAccount().catch(() => null);
  if (!account) {
    return { status: "error", message: "Bitte zuerst anmelden, um zu bieten." };
  }

  const slug = String(form.get("slug") ?? "");
  const auction = getAuctionBySlug(slug);
  if (!auction) {
    return { status: "error", message: "Unbekannte Auktion." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
  const limit = rateLimit(`market-bid:${ip}`, 30, 10 * 60 * 1000);
  if (!limit.allowed) {
    return {
      status: "error",
      message: `Zu viele Gebote in kurzer Zeit. Bitte in ${Math.ceil(
        limit.retryAfterMs / 60000,
      )} Minuten erneut versuchen.`,
    };
  }

  const amountRaw = String(form.get("amount") ?? "");
  const parsed = validateBidAmount(amountRaw);
  if (!parsed.ok || parsed.amountCents === undefined) {
    return { status: "error", message: parsed.error };
  }

  const result = placeBid(auction.id, account.id, parsed.amountCents);
  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidatePath(`/marktplatz/auktionen/${slug}`);
  return { status: "placed" };
}

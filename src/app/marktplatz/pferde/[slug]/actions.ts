"use server";

import { headers } from "next/headers";
import { getListingById } from "@/lib/marketplace-db";
import { insertInquiry } from "@/lib/marketplace-db";
import { validateInquiry } from "@/lib/marketplace-validate";
import { rateLimit } from "@/lib/rate-limit";
import type { InquiryState } from "@/lib/form-state";

export async function sendInquiryAction(
  _prev: InquiryState,
  form: FormData,
): Promise<InquiryState> {
  const listingId = Number(form.get("listingId"));
  if (!Number.isInteger(listingId)) {
    return { status: "error", message: "Unbekanntes Inserat." };
  }

  const listing = getListingById(listingId);
  if (!listing || listing.status !== "approved") {
    return { status: "error", message: "Unbekanntes Inserat." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
  const limit = rateLimit(`market-inquiry:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return {
      status: "error",
      message: `Zu viele Anfragen in kurzer Zeit. Bitte in ${Math.ceil(
        limit.retryAfterMs / 60000,
      )} Minuten erneut versuchen.`,
    };
  }

  const result = validateInquiry(form);
  if (!result.ok || !result.data) {
    const firstError = Object.values(result.errors)[0];
    return { status: "error", message: firstError ?? "Bitte Angaben prüfen." };
  }

  insertInquiry({ listingId, ...result.data });

  return { status: "sent" };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  getListingById,
  setAuctionFeeStatus,
  updateAuctionModerationStatus,
  updateListingStatus,
} from "@/lib/marketplace-db";
import type { FeeStatus } from "@/lib/marketplace-types";

export async function approveListingAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  updateListingStatus(id, "approved");

  revalidatePath("/admin/marktplatz");
  revalidatePath("/marktplatz");
  revalidatePath("/marktplatz/pferde");
  const listing = getListingById(id);
  if (listing) revalidatePath(`/marktplatz/pferde/${listing.slug}`);
}

export async function rejectListingAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  updateListingStatus(id, "rejected");
  revalidatePath("/admin/marktplatz");
  revalidatePath("/marktplatz");
}

export async function archiveListingAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  updateListingStatus(id, "archived");
  revalidatePath("/admin/marktplatz");
  revalidatePath("/marktplatz");
  revalidatePath("/marktplatz/pferde");
}

export async function approveAuctionAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  updateAuctionModerationStatus(id, "approved");
  revalidatePath("/admin/marktplatz");
  revalidatePath("/marktplatz/auktionen");
}

export async function rejectAuctionAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  updateAuctionModerationStatus(id, "rejected");
  revalidatePath("/admin/marktplatz");
  revalidatePath("/marktplatz/auktionen");
}

export async function setAuctionFeeStatusAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  const feeStatus = String(form.get("feeStatus") ?? "");
  const allowed: FeeStatus[] = ["unpaid", "invoiced", "paid", "waived"];
  if (!Number.isInteger(id) || !allowed.includes(feeStatus as FeeStatus)) return;

  setAuctionFeeStatus(id, feeStatus as FeeStatus);
  revalidatePath("/admin/marktplatz");
}

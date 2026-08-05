"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getListingById, updateListingStatus } from "@/lib/marketplace-db";

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

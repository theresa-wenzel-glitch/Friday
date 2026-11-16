"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { deleteReport, setReportStatus } from "@/lib/kuehl/reports";

function id(form: FormData): number {
  const n = Number(form.get("id"));
  if (!Number.isInteger(n) || n <= 0) throw new Error("Ungültige Meldung.");
  return n;
}

export async function approveReportAction(form: FormData) {
  await requireAdmin();
  setReportStatus(id(form), "approved");
  revalidatePath("/kuehl/moderation");
}

export async function rejectReportAction(form: FormData) {
  await requireAdmin();
  setReportStatus(id(form), "rejected");
  revalidatePath("/kuehl/moderation");
}

export async function deleteReportAction(form: FormData) {
  await requireAdmin();
  deleteReport(id(form));
  revalidatePath("/kuehl/moderation");
}

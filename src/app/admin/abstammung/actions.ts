"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  applyDetails,
  applyImport,
  planImport,
} from "@/lib/pedigree-import";
import type { ImportState } from "@/lib/form-state";

export async function previewImportAction(
  _prev: ImportState,
  form: FormData,
): Promise<ImportState> {
  await requireAdmin();

  const text = String(form.get("text") ?? "");
  if (!text.trim()) {
    return { status: "idle", text: "" };
  }

  const plan = planImport(text);

  return {
    status: "preview",
    text,
    errors: plan.errors,
    actions: plan.actions.map((a) => ({
      name: a.name,
      kind: a.kind,
      sex: a.sex,
      detail: a.detail,
    })),
    counts: plan.counts,
  };
}

export async function applyImportAction(
  _prev: ImportState,
  form: FormData,
): Promise<ImportState> {
  await requireAdmin();

  const text = String(form.get("text") ?? "");
  if (!text.trim()) return { status: "idle", text: "" };

  const result = applyImport(text);
  const detailed = applyDetails(text);

  revalidatePath("/hengste");
  revalidatePath("/admin/abstammung");

  return {
    status: "done",
    text: "",
    errors: result.errors,
    message:
      `${result.created} Pferd(e) angelegt, ${result.updated} Abstammung(en) ergänzt` +
      (detailed > 0 ? `, ${detailed} um Jahrgang oder Farbe erweitert` : "") +
      ".",
  };
}

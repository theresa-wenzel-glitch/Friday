import type { FormZeichen } from "@/lib/ki";

const KLASSE: Record<FormZeichen, string> = {
  S: "tf-chip--sieg",
  U: "tf-chip--remis",
  N: "tf-chip--niederlage",
};

const WORT: Record<FormZeichen, string> = {
  S: "Sieg",
  U: "Unentschieden",
  N: "Niederlage",
};

/** Die letzten Ergebnisse als Kürzel. Neuestes Spiel zuerst. */
export function FormReihe({ form, titel = "Form" }: { form: FormZeichen[]; titel?: string }) {
  if (form.length === 0) {
    return <span className="winzig leise">noch keine Spiele</span>;
  }
  return (
    <span
      className="tf-formreihe"
      aria-label={`${titel}, neuestes zuerst: ${form.map((z) => WORT[z]).join(", ")}`}
    >
      {form.map((zeichen, i) => (
        <span key={i} className={`tf-chip ${KLASSE[zeichen]}`} aria-hidden="true">
          {zeichen}
        </span>
      ))}
    </span>
  );
}

/*
 * Platzhalter für eine Mannschaft.
 *
 * Bewusst kein echtes Wappen: solange keine Bildrechte vorliegen, zeigt die App
 * nur das Kürzel in einer eigenen Schildform. Der volle Name steht immer daneben.
 */
export function Wappen({ kuerzel, gross = false }: { kuerzel: string; gross?: boolean }) {
  return (
    <span
      className="tf-wappen"
      style={gross ? { width: 52, height: 52, fontSize: "var(--tf-size-m)" } : undefined}
      aria-hidden="true"
    >
      {kuerzel}
    </span>
  );
}

import Link from "next/link";

export default function NichtGefunden() {
  return (
    <div className="btb-card space-y-4 p-6 text-center">
      <h1 className="text-2xl">Nicht gefunden</h1>
      <p className="btb-muted">Diesen Eintrag oder diese Baustelle gibt es in Ihrem Betrieb nicht (mehr).</p>
      <Link href="/bautagebuch/app" className="btb-btn btb-btn-primary">
        Zur Übersicht
      </Link>
    </div>
  );
}

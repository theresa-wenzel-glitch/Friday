import type { Metadata } from "next";
import Link from "next/link";
import { isAdminConfigured, isLoggedIn } from "@/lib/auth";
import { listReports } from "@/lib/kuehl/reports";
import type { Report } from "@/lib/kuehl/types";
import { approveReportAction, deleteReportAction, rejectReportAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Moderation", robots: { index: false, follow: false } };

function ReportItem({ r, actions }: { r: Report; actions: ("approve" | "reject" | "delete")[] }) {
  const osm = `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=18/${r.lat}/${r.lon}`;
  return (
    <li className="k-card" style={{ display: "grid", gap: 8, listStyle: "none" }}>
      <div className="k-row">
        <b>{r.category}</b>
        <span className="k-small">{new Date(r.createdAt).toLocaleString("de-DE")}</span>
      </div>
      <p>{r.description || <span className="k-unk">Ohne Beschreibung</span>}</p>
      <a href={osm} target="_blank" rel="noreferrer" className="k-small">
        Position {r.lat.toFixed(5)}, {r.lon.toFixed(5)} in OpenStreetMap ansehen
      </a>
      <div className="k-actions" style={{ marginTop: 0 }}>
        {actions.includes("approve") && (
          <form action={approveReportAction}>
            <input type="hidden" name="id" value={r.id} />
            <button className="k-btn2" type="submit">Freigeben</button>
          </form>
        )}
        {actions.includes("reject") && (
          <form action={rejectReportAction}>
            <input type="hidden" name="id" value={r.id} />
            <button className="k-btn2" type="submit">Ablehnen</button>
          </form>
        )}
        {actions.includes("delete") && (
          <form action={deleteReportAction}>
            <input type="hidden" name="id" value={r.id} />
            <button className="k-btn2" type="submit">Löschen</button>
          </form>
        )}
      </div>
    </li>
  );
}

export default async function ModerationPage() {
  if (!(await isLoggedIn())) {
    return (
      <section className="k-view">
        <h1 className="k-h1">Moderation</h1>
        <div className="k-card">
          {isAdminConfigured() ? (
            <p>
              Bitte melde dich zuerst im <Link href="/admin">Moderationsbereich</Link> an und komm dann hierher zurück.
            </p>
          ) : (
            <p>Der Moderationsbereich ist noch nicht eingerichtet (ADMIN_PASSWORD und SESSION_SECRET fehlen).</p>
          )}
        </div>
      </section>
    );
  }

  const pending = listReports("pending");
  const approved = listReports("approved");

  return (
    <section className="k-view">
      <h1 className="k-h1">Meldungen prüfen</h1>
      <h2 style={{ fontSize: 20 }}>Neu ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="k-muted">Nichts zu prüfen.</p>
      ) : (
        <ul style={{ display: "grid", gap: 12, padding: 0, margin: 0 }}>
          {pending.map((r) => (
            <ReportItem key={r.id} r={r} actions={["approve", "reject"]} />
          ))}
        </ul>
      )}
      <h2 style={{ fontSize: 20 }}>Auf der Karte ({approved.length})</h2>
      {approved.length === 0 ? (
        <p className="k-muted">Noch keine freigegebenen Meldungen.</p>
      ) : (
        <ul style={{ display: "grid", gap: 12, padding: 0, margin: 0 }}>
          {approved.map((r) => (
            <ReportItem key={r.id} r={r} actions={["reject", "delete"]} />
          ))}
        </ul>
      )}
    </section>
  );
}

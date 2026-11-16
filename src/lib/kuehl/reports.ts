import type Database from "better-sqlite3";
import { getDb } from "@/lib/db";
import { inCityBounds } from "./geo";
import { REPORT_CATEGORIES, type Report, type ReportCategory, type ReportStatus } from "./types";

/*
 * Bürgermeldungen. Bewusst ohne Namen, E-Mail oder IP-Adresse: gespeichert
 * werden nur Kategorie, Beschreibung und Position. Öffentlich sichtbar wird eine
 * Meldung erst nach Freigabe in der Moderation.
 */

let ready = false;

function db(): Database.Database {
  const conn = getDb();
  if (!ready) {
    conn.exec(`
      CREATE TABLE IF NOT EXISTS kuehl_reports (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        category    TEXT    NOT NULL,
        description TEXT    NOT NULL DEFAULT '',
        lat         REAL    NOT NULL,
        lon         REAL    NOT NULL,
        status      TEXT    NOT NULL DEFAULT 'pending',
        created_at  TEXT    NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_kuehl_reports_status ON kuehl_reports(status);
    `);
    ready = true;
  }
  return conn;
}

export interface ReportInput {
  category: string;
  description: string;
  lat: number;
  lon: number;
}

export type ValidationResult =
  | { ok: true; value: { category: ReportCategory; description: string; lat: number; lon: number } }
  | { ok: false; error: string };

export const MAX_DESCRIPTION = 600;

export function validateReport(input: Partial<ReportInput>): ValidationResult {
  const category = String(input.category ?? "");
  if (!(REPORT_CATEGORIES as readonly string[]).includes(category)) {
    return { ok: false, error: "Bitte wähle aus, was du melden möchtest." };
  }
  const lat = Number(input.lat);
  const lon = Number(input.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, error: "Bitte tippe auf der Karte an, wo der Ort ist." };
  }
  if (!inCityBounds(lat, lon)) {
    return { ok: false, error: "Der Ort liegt außerhalb von Mülheim an der Ruhr." };
  }
  const description = String(input.description ?? "").trim();
  if (description.length > MAX_DESCRIPTION) {
    return { ok: false, error: `Die Beschreibung darf höchstens ${MAX_DESCRIPTION} Zeichen lang sein.` };
  }
  return {
    ok: true,
    value: {
      category: category as ReportCategory,
      description,
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
    },
  };
}

type Row = Record<string, unknown>;
const toReport = (r: Row): Report => ({
  id: r.id as number,
  category: r.category as ReportCategory,
  description: r.description as string,
  lat: r.lat as number,
  lon: r.lon as number,
  status: r.status as ReportStatus,
  createdAt: r.created_at as string,
});

export function insertReport(v: { category: ReportCategory; description: string; lat: number; lon: number }): Report {
  const createdAt = new Date().toISOString();
  const info = db()
    .prepare(
      `INSERT INTO kuehl_reports (category, description, lat, lon, status, created_at)
       VALUES (@category, @description, @lat, @lon, 'pending', @createdAt)`,
    )
    .run({ ...v, createdAt });
  return { id: Number(info.lastInsertRowid), ...v, status: "pending", createdAt };
}

export function listReports(status: ReportStatus, limit = 200): Report[] {
  return (
    db()
      .prepare("SELECT * FROM kuehl_reports WHERE status = ? ORDER BY created_at DESC LIMIT ?")
      .all(status, limit) as Row[]
  ).map(toReport);
}

export function setReportStatus(id: number, status: ReportStatus): void {
  db().prepare("UPDATE kuehl_reports SET status = ? WHERE id = ?").run(status, id);
}

export function deleteReport(id: number): void {
  db().prepare("DELETE FROM kuehl_reports WHERE id = ?").run(id);
}

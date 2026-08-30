import type { User, UserRole } from "@jobflow/types";

/** Zeile der Tabelle users, so wie pg sie liefert. */
export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  phone: string | null;
  blocked_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Datenbankzeile -> API-Objekt.
 *
 * Diese Uebersetzung ist die Stelle, an der password_hash verschwindet. Sie
 * findet an genau einer Stelle statt, damit der Hash nicht irgendwann doch
 * ueber einen neuen Endpunkt nach aussen gelangt.
 */
export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    phone: row.phone,
    blockedAt: row.blocked_at === null ? null : row.blocked_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

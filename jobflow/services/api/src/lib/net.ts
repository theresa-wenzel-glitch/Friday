import type { IncomingMessage } from "node:http";

/**
 * Kuerzt eine IP-Adresse auf /24 (IPv4) bzw. /48 (IPv6).
 *
 * Das reicht, um Missbrauch zu erkennen und Anfragen zu begrenzen, speichert
 * aber keinen vollstaendigen Bewegungsverlauf einer einzelnen Person.
 */
export function ipPrefix(address: string | undefined): string {
  if (!address) return "unbekannt";
  const clean = address.startsWith("::ffff:") ? address.slice(7) : address;

  if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts.length !== 4) return "unbekannt";
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }

  const groups = clean.split(":").filter((group) => group.length > 0);
  if (groups.length === 0) return "unbekannt";
  return `${groups.slice(0, 3).join(":")}::/48`;
}

export function clientIpPrefix(req: IncomingMessage): string {
  // Hinter einem Reverse Proxy steht die echte Adresse im ersten Eintrag von
  // X-Forwarded-For. Der Header ist faelschbar - er darf deshalb nur fuer
  // Rate Limiting und Protokollierung genutzt werden, nie fuer Berechtigungen.
  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return ipPrefix(first?.trim() ?? req.socket.remoteAddress ?? undefined);
}

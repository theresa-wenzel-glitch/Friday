/**
 * Sehr einfache Ratenbegrenzung im Arbeitsspeicher.
 *
 * Reicht für einen einzelnen Server-Prozess und soll vor allem verhindern,
 * dass jemand die hinterlegten Kontaktadressen automatisiert abgreift.
 * Bei mehreren Instanzen müsste das auf einen gemeinsamen Speicher umgestellt
 * werden (z. B. Redis).
 */
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    const retryAfterMs = windowMs - (now - hits[0]);
    buckets.set(key, hits);
    return { allowed: false, retryAfterMs };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Gelegentlich aufräumen, damit die Map nicht unbegrenzt wächst.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}

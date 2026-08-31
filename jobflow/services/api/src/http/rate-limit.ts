/**
 * Rate Limiting mit einem gleitenden Zählfenster im Arbeitsspeicher.
 *
 * Für eine Instanz reicht das. Sobald mehrere Instanzen hinter einem Load
 * Balancer laufen, gehört der Zähler in einen gemeinsamen Speicher (Redis) -
 * bis dahin wäre das unnötige Infrastruktur.
 */
export interface RateLimitRule {
  /** Erlaubte Anfragen je Fenster. */
  limit: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private lastSweep = 0;

  /** Liefert false, wenn das Kontingent erschöpft ist. */
  check(key: string, rule: RateLimitRule, now: number = Date.now()): boolean {
    this.sweep(now);
    const bucket = this.buckets.get(key);
    if (bucket === undefined || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
      return true;
    }
    if (bucket.count >= rule.limit) return false;
    bucket.count += 1;
    return true;
  }

  /** Wie lange der Aufrufer warten muss, in Sekunden. */
  retryAfterSeconds(key: string, now: number = Date.now()): number {
    const bucket = this.buckets.get(key);
    if (bucket === undefined) return 0;
    return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  }

  /** Alte Einträge entfernen, damit die Map nicht unbegrenzt wächst. */
  private sweep(now: number): void {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }

  reset(): void {
    this.buckets.clear();
  }
}

/**
 * Anmeldung und Registrierung sind streng begrenzt: dort wird geraten und
 * ausprobiert. Der Rest ist großzügiger.
 */
export const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60_000 },
  write: { limit: 60, windowMs: 60_000 },
  read: { limit: 300, windowMs: 60_000 },
  ai: { limit: 20, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitRule>;

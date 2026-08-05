"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "beendet";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `noch ${days} Tag${days === 1 ? "" : "e"} ${hours} Std.`;
  if (hours > 0) return `noch ${hours} Std. ${minutes} Min.`;
  return `noch ${minutes} Min.`;
}

/** Reine Restzeit-Anzeige - die eigentliche Phase (läuft/beendet) kommt
 * immer serverseitig aus start_at/end_at, das hier ist nur Komfort. */
export function AuctionCountdown({ endAt }: { endAt: string }) {
  const target = new Date(endAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Vor der Hydration nichts anzeigen, damit Server- und Client-Markup
  // übereinstimmen (der Countdown hängt von der aktuellen Uhrzeit ab).
  if (now === null) return null;

  return <span>{formatRemaining(target - now)}</span>;
}

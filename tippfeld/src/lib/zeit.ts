/*
 * Datums- und Zeitausgabe. Immer mit fester Zeitzone und fester Sprache, damit
 * der Server genau dasselbe ausgibt wie der Browser.
 */
const ZEITZONE = "Europe/Berlin";

const kurz = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ZEITZONE,
});

const nurZeit = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ZEITZONE,
});

const lang = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ZEITZONE,
});

const tag = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: ZEITZONE,
});

export function anstossKurz(iso: string): string {
  return kurz.format(new Date(iso)).replace(",", "");
}

export function anstossZeit(iso: string): string {
  return nurZeit.format(new Date(iso));
}

export function anstossLang(iso: string): string {
  return `${lang.format(new Date(iso))} Uhr`;
}

export function datum(iso: string): string {
  return tag.format(new Date(iso));
}

/**
 * Wie lange die Tippfrist noch läuft. Nur in Serverkomponenten verwenden - der
 * Wert ändert sich mit der Zeit und würde im Browser abweichen.
 */
export function verbleibend(iso: string, jetzt = Date.now()): string | null {
  const millisekunden = new Date(iso).getTime() - jetzt;
  if (millisekunden <= 0) return null;
  const minuten = Math.floor(millisekunden / 60000);
  if (minuten < 60) return `noch ${minuten} Min.`;
  const stunden = Math.floor(minuten / 60);
  if (stunden < 24) return `noch ${stunden} Std.`;
  const tage = Math.floor(stunden / 24);
  return tage === 1 ? "noch 1 Tag" : `noch ${tage} Tage`;
}

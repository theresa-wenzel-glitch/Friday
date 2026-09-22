/*
 * Holt Farben, Bausteine, Symbole und Grafiken aus ../design-system in die App.
 * Das Designsystem bleibt die einzige Quelle der Wahrheit - hier wird nur kopiert
 * und in React-Bauteile übersetzt. Nach Änderungen am Designsystem einmal
 * "npm run design:sync" ausführen.
 */
import { readdir, readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hier = dirname(fileURLToPath(import.meta.url));
const system = join(hier, "..", "..", "design-system");
const app = join(hier, "..");

const kopf = "/* Automatisch erzeugt aus ../design-system - nicht von Hand ändern. */\n";

// 1. Stylesheets
for (const datei of ["tokens.css", "components.css"]) {
  const inhalt = await readFile(join(system, datei), "utf8");
  await writeFile(join(app, "src", "app", datei), kopf + inhalt);
}

// 2. Illustrationen nach public/grafik
await mkdir(join(app, "public", "grafik"), { recursive: true });
for (const datei of await readdir(join(system, "illustrations"))) {
  await copyFile(join(system, "illustrations", datei), join(app, "public", "grafik", datei));
}

// 3. Symbole als React-Bauteil
const jsxAttribut = (name) =>
  ({
    "stroke-width": "strokeWidth",
    "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin",
    "stroke-opacity": "strokeOpacity",
    "fill-opacity": "fillOpacity",
    "fill-rule": "fillRule",
    "clip-rule": "clipRule",
  })[name] ?? name;

const dateien = (await readdir(join(system, "icons"))).filter((d) => d.endsWith(".svg")).sort();
const eintraege = [];
for (const datei of dateien) {
  const roh = await readFile(join(system, "icons", datei), "utf8");
  const inneres = roh
    .replace(/[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/\s*<title>[\s\S]*?<\/title>/, "")
    .replace(/([a-z]+(?:-[a-z]+)+)=/g, (_, name) => `${jsxAttribut(name)}=`)
    .trim();
  const titel = (roh.match(/<title>([\s\S]*?)<\/title>/) ?? [, datei])[1];
  eintraege.push({ name: datei.replace(/\.svg$/, ""), titel, inneres });
}

const bauteil = `${kopf}import type { SVGProps } from "react";

export type SymbolName =
${eintraege.map((e) => `  | "${e.name}"`).join("\n")};

/** Die Beschriftung aus dem Designsystem, für aria-label wenn ein Symbol allein steht. */
export const symbolTitel: Record<SymbolName, string> = {
${eintraege.map((e) => `  "${e.name}": "${e.titel}",`).join("\n")}
};

const formen: Record<SymbolName, React.ReactNode> = {
${eintraege.map((e) => `  "${e.name}": (
    <>
${e.inneres
  .split("\n")
  .map((z) => "      " + z.trim())
  .join("\n")}
    </>
  ),`).join("\n")}
};

type Props = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: SymbolName;
  /** Ohne Beschriftung gilt das Symbol als schmückend und wird vorgelesen übersprungen. */
  beschriftung?: string;
};

export function Symbol({ name, beschriftung, className, ...rest }: Props) {
  const beschriftet = Boolean(beschriftung);
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["tf-symbol", className].filter(Boolean).join(" ")}
      role={beschriftet ? "img" : undefined}
      aria-label={beschriftung}
      aria-hidden={beschriftet ? undefined : true}
      focusable="false"
      {...rest}
    >
      {formen[name]}
    </svg>
  );
}
`;

await writeFile(join(app, "src", "components", "Symbol.tsx"), bauteil);
console.log(`Designsystem übernommen: 2 Stylesheets, ${eintraege.length} Symbole, Grafiken kopiert.`);

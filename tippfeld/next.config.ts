import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Im selben Git-Projekt liegt noch eine zweite App. Ohne diese Angabe würde
// Next den übergeordneten Ordner für die Projektwurzel halten.
const wurzel = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: wurzel },
  outputFileTracingRoot: wurzel,
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module and must not be bundled by webpack/turbopack.
  serverExternalPackages: ["better-sqlite3"],
  output: "standalone",
  experimental: {
    serverActions: {
      // Standard sind 1 MB. Ein Foto darf 5 MB haben, dazu kommen die
      // übrigen Formularfelder - sonst bricht der Upload im Server ab,
      // bevor die eigene Prüfung überhaupt greift.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;

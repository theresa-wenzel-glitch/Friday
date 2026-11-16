import { Suspense } from "react";
import type { Metadata } from "next";
import { KarteClient } from "./KarteClient";

export const metadata: Metadata = { title: "Stadtkarte" };

export default function KartePage() {
  return (
    <Suspense>
      <KarteClient />
    </Suspense>
  );
}

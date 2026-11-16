import { Suspense } from "react";
import type { Metadata } from "next";
import { MeldenClient } from "./MeldenClient";

export const metadata: Metadata = { title: "Ort melden" };

export default function MeldenPage() {
  return (
    <Suspense>
      <MeldenClient />
    </Suspense>
  );
}

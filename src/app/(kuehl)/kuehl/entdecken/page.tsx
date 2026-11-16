import { Suspense } from "react";
import type { Metadata } from "next";
import { EntdeckenClient } from "./EntdeckenClient";

export const metadata: Metadata = { title: "Entdecken" };

export default function EntdeckenPage() {
  return (
    <Suspense>
      <EntdeckenClient />
    </Suspense>
  );
}

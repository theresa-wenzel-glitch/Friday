"use client";

import { SoundLabProvider } from "@/components/soundlab/SoundLabProvider";
import { AppShell } from "@/components/soundlab/AppShell";

export default function SoundLabAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SoundLabProvider>
      <AppShell>{children}</AppShell>
    </SoundLabProvider>
  );
}

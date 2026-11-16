import { AppShell } from "@/components/kuehl/AppShell";
import { KuehlProvider } from "@/components/kuehl/KuehlProvider";

export default function KuehlLayout({ children }: { children: React.ReactNode }) {
  return (
    <KuehlProvider>
      <AppShell>{children}</AppShell>
    </KuehlProvider>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/bautagebuch/Navigation";
import { brauchtSitzung } from "@/lib/bautagebuch/sitzung";
import { logoutAction } from "../actions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { betrieb, person } = await brauchtSitzung();

  return (
    <div className="min-h-screen pb-24 sm:pb-10">
      <header style={{ background: "var(--btb-asphalt)", color: "var(--btb-asphalt-fg)" }}>
        <div className="btb-stripes h-1.5" aria-hidden />
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/bautagebuch/app" className="min-w-0 flex-1 no-underline">
            <span className="block truncate text-base font-bold">{betrieb.name}</span>
            <span className="block truncate text-xs opacity-70">Bautagebuch · angemeldet als {person}</span>
          </Link>
          <Navigation />
          <form action={logoutAction}>
            <button type="submit" className="rounded-lg px-2 py-2 text-xs font-semibold opacity-70 hover:opacity-100">
              Abmelden
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
    </div>
  );
}

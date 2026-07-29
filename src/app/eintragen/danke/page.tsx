import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Danke",
  robots: { index: false },
};

export default function ThanksPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl mb-4">Danke - der Eintrag ist angekommen.</h1>
      <p className="muted mb-8">
        Wir sichten ihn kurz und schalten ihn dann frei. Das dauert in der Regel
        ein bis zwei Tage. Wenn du eine Rückfrage-Adresse angegeben hast, melden
        wir uns, falls etwas unklar ist.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/hengste" className="btn btn-primary no-underline">
          Verzeichnis ansehen
        </Link>
        <Link href="/eintragen" className="btn btn-secondary no-underline">
          Noch einen Hengst eintragen
        </Link>
      </div>
    </div>
  );
}

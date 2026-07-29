import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl mb-3">Diese Seite gibt es nicht.</h1>
      <p className="muted mb-8">
        Vielleicht wurde der Eintrag entfernt oder die Adresse hat sich
        vertippt. Über die Suche findest du bestimmt weiter.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/hengste" className="btn btn-primary no-underline">
          Zur Hengstsuche
        </Link>
        <Link href="/" className="btn btn-secondary no-underline">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}

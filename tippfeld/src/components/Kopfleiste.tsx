import Link from "next/link";
import { Symbol } from "./Symbol";

export function Kopfleiste({
  titel,
  zurueck,
  rechts,
}: {
  titel: string;
  zurueck?: string;
  rechts?: React.ReactNode;
}) {
  return (
    <header className="kopfleiste">
      {zurueck ? (
        <Link href={zurueck} className="kopfleiste__zurueck" aria-label="Zurück">
          <Symbol name="zurueck" />
        </Link>
      ) : (
        <span className="marke-klein__zeichen" aria-hidden="true">
          <span className="marke-klein__punkt" />
        </span>
      )}
      <h1 className="kopfleiste__titel">{titel}</h1>
      {rechts}
    </header>
  );
}

import type { Metadata } from "next";
import { Icon } from "@/components/kuehl/icons";

export const metadata: Metadata = { title: "Hitzeschutz" };

const GUIDE: { title: string; icon: "drop" | "house" | "sun" | "tree" | "compass"; items: string[] }[] = [
  {
    title: "Ausreichend trinken",
    icon: "drop",
    items: [
      "Über den Tag verteilt trinken, nicht erst, wenn du Durst hast.",
      "Wasser, ungesüßte Tees und Saftschorlen sind gut geeignet.",
      "Alkohol, sehr süße und stark koffeinhaltige Getränke meiden.",
      "Wer wegen einer Herz- oder Nierenerkrankung wenig trinken soll: die Trinkmenge bei Hitze mit der Arztpraxis absprechen.",
    ],
  },
  {
    title: "Wohnung kühl halten",
    icon: "house",
    items: [
      "Früh morgens und nachts lüften, tagsüber Fenster geschlossen halten.",
      "Sonnenschutz außen (Rollläden, Markisen) hält deutlich mehr Wärme ab als Vorhänge innen.",
      "Geräte ausschalten, die nicht gebraucht werden. Sie geben Wärme ab.",
      "Feuchte Tücher oder ein kühles Fußbad helfen beim Abkühlen.",
    ],
  },
  {
    title: "Unterwegs bei Hitze",
    icon: "sun",
    items: [
      "Die heißeste Zeit zwischen 11 und 17 Uhr möglichst im Schatten oder drinnen verbringen.",
      "Schattige Wege wählen, Kopfbedeckung, Sonnenbrille und Sonnencreme nutzen.",
      "Wasserflasche mitnehmen und Pausen im Schatten einplanen.",
      "Kinder und Tiere nie im geparkten Auto lassen, auch nicht kurz.",
    ],
  },
  {
    title: "Ältere und kranke Menschen",
    icon: "tree",
    items: [
      "Ältere Menschen spüren Durst oft weniger. Erinnere sie regelmäßig ans Trinken.",
      "Ruf an heißen Tagen Nachbarn und Angehörige an, die allein leben, oder schau vorbei.",
      "Manche Medikamente wirken bei Hitze anders. Bei Fragen hilft die Apotheke oder Arztpraxis.",
    ],
  },
  {
    title: "Babys und Kinder",
    icon: "tree",
    items: [
      "Babys und Kleinkinder nie in die pralle Sonne bringen.",
      "Leichte, helle Kleidung und einen Sonnenhut anziehen.",
      "Immer wieder etwas zu trinken anbieten. Gestillte Babys öfter anlegen.",
    ],
  },
  {
    title: "Arbeit und Sport",
    icon: "compass",
    items: [
      "Anstrengende Arbeit und Sport in die kühlen Morgen- oder Abendstunden legen.",
      "Regelmäßig Pausen im Schatten oder in kühlen Räumen machen.",
      "Arbeitgeber müssen bei Hitze Schutzmaßnahmen prüfen. Sprich deine Vorgesetzten an.",
    ],
  },
];

export default function HitzeschutzPage() {
  return (
    <section className="k-view">
      <h1 className="k-h1">Hitzeschutz</h1>

      <div className="k-emerg">
        <h2 style={{ fontSize: 21 }}>Warnzeichen erkennen</h2>
        <p>
          Verwirrtheit, Bewusstlosigkeit, sehr hohe Körpertemperatur, heiße und trockene Haut, Krampfanfälle: Das kann ein
          Hitzschlag sein. Das ist ein Notfall.
        </p>
        <div className="k-nums">
          <a className="k-num" href="tel:112">
            <b>112</b>
            <span>Notruf, sofort anrufen</span>
          </a>
          <a className="k-num" href="tel:116117">
            <b>116 117</b>
            <span>Ärztlicher Bereitschaftsdienst</span>
          </a>
        </div>
        <p style={{ fontSize: 14 }}>
          Bis Hilfe kommt: Person in den Schatten oder einen kühlen Raum bringen, enge Kleidung lockern, mit feuchten
          Tüchern kühlen. Ist die Person wach und kann schlucken, kleine Schlucke Wasser geben.
        </p>
      </div>

      <div className="k-card">
        <h2 style={{ fontSize: 19 }}>Erste Anzeichen ernst nehmen</h2>
        <p style={{ marginTop: 6 }}>
          Kopfschmerzen, Schwindel, Übelkeit, starkes Schwitzen, Muskelkrämpfe oder große Erschöpfung zeigen: Der Körper
          kommt mit der Hitze nicht mehr zurecht. Dann sofort in den Schatten, trinken, ausruhen. Wird es nicht besser,
          die 116 117 anrufen.
        </p>
      </div>

      {GUIDE.map((g) => (
        <details key={g.title}>
          <summary>
            <span style={{ color: "var(--k-forest)" }}>
              <Icon name={g.icon} size={22} />
            </span>
            {g.title}
          </summary>
          <ul>
            {g.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </details>
      ))}

      <p className="k-small">
        Allgemeine Hinweise, angelehnt an die Empfehlungen öffentlicher Gesundheitsstellen wie dem Bundesinstitut für
        Öffentliche Gesundheit (
        <a href="https://www.klima-mensch-gesundheit.de" target="_blank" rel="noreferrer">
          klima-mensch-gesundheit.de
        </a>
        ). Sie ersetzen keine ärztliche Beratung.
      </p>
    </section>
  );
}

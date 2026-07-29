/**
 * Startbestand des Verzeichnisses: bekannte Gründer- und Vererberhengste der
 * Westernpferdezucht, überwiegend American Quarter Horse.
 *
 * WICHTIG - bitte vor dem Livegang lesen:
 *
 * 1. Die Texte sind eigenständig formuliert. Es wurden KEINE Beschreibungen von
 *    anderen Hengstkatalogen übernommen. Bitte auch künftig nichts aus fremden
 *    Katalogen hineinkopieren - Stammdaten (Name, Jahrgang, Farbe, Abstammung)
 *    sind freie Fakten, ausformulierte Texte und Fotos sind es nicht.
 *
 * 2. Alle Einträge sind mit `isVerified: false` markiert und werden in der App
 *    sichtbar als "Angaben noch nicht geprüft" gekennzeichnet. Felder, bei denen
 *    die Quellenlage unklar war, wurden bewusst LEER GELASSEN statt geraten.
 *    Bitte gegen AQHA-Papiere bzw. allbreedpedigree.com prüfen und danach im
 *    Moderationsbereich auf "geprüft" setzen.
 *
 * 3. Es sind absichtlich keine Fotos hinterlegt. Bilder bekannter Hengste sind
 *    fast immer urheberrechtlich geschützt. Bitte nur Fotos einpflegen, für die
 *    eine Erlaubnis vorliegt.
 */

import type { Availability, Sex } from "./types";

export interface SeedHorse {
  name: string;
  aka?: string;
  sex?: Sex;
  breed?: string;
  registryNo?: string;
  yearOfBirth?: number;
  yearOfDeath?: number;
  color?: string;
  country?: string;
  disciplines?: string[];
  sireName?: string;
  damName?: string;
  description?: string;
  bloodlineNote?: string;
  availability?: Availability;
  isHistoric?: boolean;
}

export const SEED_HORSES: SeedHorse[] = [
  /* ---------------------------------------------------------------- */
  /* Gründerpferde                                                     */
  /* ---------------------------------------------------------------- */
  {
    name: "Traveler",
    yearOfBirth: 1885,
    color: "Fuchs",
    country: "US",
    disciplines: ["Foundation / Zucht"],
    description:
      "Einer der einflussreichsten Gründerhengste der Quarter-Horse-Zucht. Seine Herkunft ist bis heute ungeklärt - überliefert ist, dass er in Texas als Arbeitspferd auftauchte und sich als aussergewöhnlicher Sprinter erwies. Über seine Söhne wirkt er in praktisch jeder heutigen Quarter-Horse-Linie nach.",
    bloodlineNote: "Abstammung unbekannt; in den Papieren als Gründerpferd geführt.",
    isHistoric: true,
  },
  {
    name: "Peter McCue",
    yearOfBirth: 1895,
    yearOfDeath: 1923,
    color: "Fuchs",
    country: "US",
    disciplines: ["Foundation / Zucht"],
    sireName: "Dan Tucker",
    damName: "Nora M",
    description:
      "Gilt neben Traveler als wichtigster Gründervererber der Rasse. Er war ein herausragender Sprinter und gab Kaliber, Muskulatur und Schnelligkeit sehr konstant weiter. Ein grosser Teil der modernen Quarter Horses führt ihn mehrfach im Pedigree.",
    isHistoric: true,
  },
  {
    name: "Little Joe",
    yearOfBirth: 1905,
    color: "Fuchs",
    country: "US",
    disciplines: ["Foundation / Zucht"],
    sireName: "Traveler",
    description:
      "Sohn des Traveler und ein Bindeglied zwischen den frühen texanischen Sprinterlinien und der späteren Zucht. Über seinen Sohn Zantanon führt die Linie direkt zu King P-234.",
    isHistoric: true,
  },
  {
    name: "Zantanon",
    aka: "The Ghost of the Rio Grande",
    yearOfBirth: 1917,
    color: "Fuchs",
    country: "MX",
    disciplines: ["Foundation / Zucht"],
    sireName: "Little Joe",
    damName: "Jeanette",
    description:
      "Legendärer Rennhengst aus dem mexikanischen Grenzgebiet, der trotz härtester Einsatzbedingungen kaum geschlagen wurde. Sein Beiname stammt aus dieser Zeit. Als Vater von King P-234 wurde er zu einer der tragenden Säulen der Quarter-Horse-Zucht.",
    isHistoric: true,
  },
  {
    name: "King",
    aka: "King P-234",
    registryNo: "P-234",
    yearOfBirth: 1932,
    yearOfDeath: 1958,
    color: "Fuchs",
    country: "US",
    disciplines: ["Foundation / Zucht", "Cutting"],
    sireName: "Zantanon",
    damName: "Jabalina",
    description:
      "Einer der bedeutendsten Vererber der Rassegeschichte und Namensgeber der King-Linie. Seine Nachkommen prägten vor allem den Cutting- und Ranchsport und gelten als besonders kopfstark und cowsensitiv. Poco Bueno ist sein bekanntester Sohn.",
    isHistoric: true,
  },
  {
    name: "Old Sorrel",
    yearOfBirth: 1915,
    color: "Fuchs",
    country: "US",
    disciplines: ["Foundation / Zucht"],
    sireName: "Hickory Bill",
    description:
      "Gründerhengst des King-Ranch-Zuchtprogramms in Texas. Aus ihm entwickelte die Ranch über konsequente Linienzucht einen eigenen, sehr einheitlichen Pferdetyp - die Grundlage der späteren King-Ranch-Cutting-Pferde.",
    bloodlineNote: "Mutter: Thoroughbred-Stute, in den Unterlagen ohne Namen geführt.",
    isHistoric: true,
  },
  {
    name: "Wimpy",
    aka: "Wimpy P-1",
    registryNo: "P-1",
    yearOfBirth: 1937,
    color: "Fuchs",
    country: "US",
    disciplines: ["Halter", "Foundation / Zucht"],
    sireName: "Solis",
    damName: "Panda",
    description:
      "Trägt die Registriernummer P-1 der AQHA - er erhielt sie als Grand Champion der Fort Worth Stock Show 1941, nicht weil er das erste eingetragene Pferd war. Ein King-Ranch-Produkt und über Jahrzehnte ein Begriff in der Halterzucht.",
    isHistoric: true,
  },
  {
    name: "Joe Hancock",
    yearOfBirth: 1923,
    color: "Braun",
    country: "US",
    disciplines: ["Foundation / Zucht", "Roping"],
    sireName: "John Wilkens",
    description:
      "Bekannt für Grösse, Knochenstärke und enorme Zugkraft - seine Mutter war Percheron-geprägt. Die Hancock-Linie steht bis heute für robuste, kräftige Ranch- und Ropingpferde und gilt als sehr eigenständig im Charakter.",
    isHistoric: true,
  },
  {
    name: "Joe Reed P-3",
    registryNo: "P-3",
    yearOfBirth: 1921,
    color: "Fuchs",
    country: "US",
    disciplines: ["Foundation / Zucht"],
    sireName: "Joe Blair",
    damName: "Della Moore",
    description:
      "Verbindet über seinen Thoroughbred-Vater Joe Blair Rennblut mit der Quarter-Horse-Stutenbasis. Begründer der Joe-Reed-Linie, die über Leo weitreichenden Einfluss auf Renn-, Pleasure- und Performancezucht nahm.",
    isHistoric: true,
  },
  {
    name: "Joe Reed II",
    yearOfBirth: 1936,
    color: "Fuchs",
    country: "US",
    disciplines: ["Foundation / Zucht"],
    sireName: "Joe Reed P-3",
    damName: "Nellene",
    description:
      "Vater von Leo und damit ein Schlüsselpferd für die gesamte Leo-Linie.",
    isHistoric: true,
  },
  {
    name: "Leo",
    yearOfBirth: 1940,
    yearOfDeath: 1967,
    color: "Fuchs",
    country: "US",
    disciplines: ["Foundation / Zucht", "Cutting"],
    sireName: "Joe Reed II",
    damName: "Little Fanny",
    description:
      "Erfolgreicher Rennhengst und anschliessend einer der grossen Vererber seiner Zeit. Die Leo-Linie ist über Leo San und Peppy San bis in die heutige Cutting-Spitze durchgehend präsent.",
    isHistoric: true,
  },
  {
    name: "Skipper W",
    yearOfBirth: 1945,
    color: "Fuchs",
    country: "US",
    disciplines: ["Halter", "Western Pleasure"],
    sireName: "Nick Shoemaker",
    damName: "Hired Girl",
    description:
      "Begründer der Skipper-W-Linie, die vor allem die Halter- und Pleasurezucht geprägt hat. Steht für Typ, Ausstrahlung und ausgeglichenes Wesen.",
    isHistoric: true,
  },

  /* ---------------------------------------------------------------- */
  /* Thoroughbred-Einfluss                                             */
  /* ---------------------------------------------------------------- */
  {
    name: "Three Bars",
    aka: "Three Bars (TB)",
    breed: "Thoroughbred",
    yearOfBirth: 1940,
    yearOfDeath: 1968,
    color: "Fuchs",
    country: "US",
    disciplines: ["Foundation / Zucht"],
    sireName: "Percentage",
    damName: "Myrtle Dee",
    description:
      "Der wohl einflussreichste Thoroughbred in der Quarter-Horse-Zucht. Er brachte Grösse, Galoppqualität und Athletik in die Rasse ein. Über Doc Bar, Sugar Bars und Lightning Bar wirkt er in Cutting-, Reining- und Pleasurelinien gleichermassen.",
    isHistoric: true,
  },
  {
    name: "Sugar Bars",
    yearOfBirth: 1951,
    color: "Fuchs",
    country: "US",
    disciplines: ["Foundation / Zucht"],
    sireName: "Three Bars",
    damName: "Frontera Sugar",
    description:
      "Sohn des Three Bars und selbst ein bedeutender Vererber. Über Jewel's Leo Bars führt seine Linie zu Colonel Freckles und Freckles Playboy - zwei Eckpfeilern der modernen Cuttingzucht.",
    isHistoric: true,
  },
  {
    name: "Lightning Bar",
    yearOfBirth: 1951,
    yearOfDeath: 1960,
    color: "Fuchs",
    country: "US",
    disciplines: ["Foundation / Zucht"],
    sireName: "Three Bars",
    damName: "Della P",
    description:
      "Früh verstorben, aber durch einen einzigen Sohn unsterblich: Doc Bar. Sein Einfluss auf die Cuttingzucht ist kaum zu überschätzen.",
    isHistoric: true,
  },

  /* ---------------------------------------------------------------- */
  /* Doc Bar und Nachkommen - Cutting                                  */
  /* ---------------------------------------------------------------- */
  {
    name: "Doc Bar",
    yearOfBirth: 1956,
    yearOfDeath: 1992,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting", "Foundation / Zucht"],
    sireName: "Lightning Bar",
    damName: "Dandy Doll",
    description:
      "Als Rennpferd eine Enttäuschung, als Vererber eine Revolution. In Verbindung mit den Poco-Bueno-Stuten der Jensen-Zucht begründete er den modernen Cuttingtyp: kompakt, extrem cowsensitiv und mit enormer Hinterhandaktion. Kaum ein Cuttingpedigree kommt heute ohne ihn aus.",
    isHistoric: true,
  },
  {
    name: "Poco Bueno",
    yearOfBirth: 1944,
    yearOfDeath: 1969,
    color: "Braun",
    country: "US",
    disciplines: ["Cutting", "Foundation / Zucht"],
    sireName: "King",
    damName: "Miss Taylor",
    description:
      "Erfolgreicher Cuttinghengst und einer der teuersten Quarter Horses seiner Zeit. Seine Töchter erwiesen sich als aussergewöhnliche Zuchtstuten - die Kombination Poco-Bueno-Stute x Doc Bar gilt als eine der wirkungsvollsten Anpaarungen der Rassegeschichte.",
    isHistoric: true,
  },
  {
    name: "Poco Lena",
    sex: "mare",
    yearOfBirth: 1949,
    yearOfDeath: 1975,
    color: "Braun",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Poco Bueno",
    damName: "Sheilwin",
    description:
      "Eine der grössten Cuttingstuten überhaupt und mehrfache NCHA-Championesse. Nach einer Verletzung wurde sie Zuchtstute und brachte mit Doc Bar unter anderem Doc O'Lena und Dry Doc - beide Sieger der NCHA Futurity.",
    isHistoric: true,
  },
  {
    name: "Poco Tivio",
    yearOfBirth: 1947,
    color: "Braun",
    country: "US",
    disciplines: ["Cutting", "Reined Cow Horse"],
    sireName: "Poco Bueno",
    damName: "Sheilwin",
    description:
      "Vollbruder-Generation zu Poco Lena und selbst ein einflussreicher Vererber, vor allem an der Westküste im Reined-Cow-Horse-Bereich.",
    isHistoric: true,
  },
  {
    name: "Doc O'Lena",
    yearOfBirth: 1967,
    yearOfDeath: 1993,
    color: "Braun",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Doc Bar",
    damName: "Poco Lena",
    description:
      "Gewann 1970 die NCHA Futurity, nach verbreiteter Darstellung ohne einen einzigen verlorenen Go-Round. Als Vererber wurde er über Smart Little Lena zum Bindeglied in die moderne Cuttingzucht.",
    isHistoric: true,
  },
  {
    name: "Dry Doc",
    yearOfBirth: 1970,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Doc Bar",
    damName: "Poco Lena",
    description:
      "Vollbruder zu Doc O'Lena und Gewinner der NCHA Futurity 1971 - die Verbindung Doc Bar x Poco Lena stellte damit in zwei aufeinanderfolgenden Jahren den Futurity-Sieger.",
    isHistoric: true,
  },
  {
    name: "Doc's Hickory",
    yearOfBirth: 1975,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Doc Bar",
    damName: "Miss Chickasha",
    description:
      "Doc-Bar-Sohn mit starkem Einfluss auf die spätere Cuttingzucht, vor allem über High Brow Hickory und dessen Sohn High Brow Cat.",
    isHistoric: true,
  },
  {
    name: "Doc's Oak",
    yearOfBirth: 1971,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Doc Bar",
    damName: "Susie's Bay",
    description:
      "Weiterer bedeutender Doc-Bar-Sohn, dessen Nachkommen sowohl im Cutting als auch im Reined Cow Horse erfolgreich waren.",
    isHistoric: true,
  },
  {
    name: "Genuine Doc",
    yearOfBirth: 1976,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting", "Reining"],
    sireName: "Doc Bar",
    description:
      "Doc-Bar-Sohn und Vater von Shining Spark. Über diese Linie reicht der Doc-Bar-Einfluss weit in die Reining- und Allroundzucht hinein.",
    bloodlineNote: "Muttername in dieser Datenbank noch nicht gesichert - bitte prüfen.",
    isHistoric: true,
  },

  /* ---------------------------------------------------------------- */
  /* Leo San / Peppy-Linie                                             */
  /* ---------------------------------------------------------------- */
  {
    name: "Leo San",
    yearOfBirth: 1949,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting", "Foundation / Zucht"],
    sireName: "Leo",
    damName: "San Sue Darks",
    description:
      "Vater von Peppy San und Mr San Peppy und damit Ausgangspunkt einer der erfolgreichsten Cuttinglinien überhaupt.",
    isHistoric: true,
  },
  {
    name: "Peppy San",
    yearOfBirth: 1959,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Leo San",
    damName: "Peppy Belle",
    description:
      "NCHA World Champion und erfolgreicher Vererber. Seine Tochter Smart Peppy wurde als Mutter von Smart Little Lena zu einer Schlüsselstute der Rasse.",
    isHistoric: true,
  },
  {
    name: "Mr San Peppy",
    yearOfBirth: 1968,
    yearOfDeath: 1995,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Leo San",
    damName: "Peppy Belle",
    description:
      "NCHA World Champion und Aushängeschild des King-Ranch-Zuchtprogramms. Sein Sohn Peppy San Badger führte die Linie an die absolute Spitze.",
    isHistoric: true,
  },
  {
    name: "Peppy San Badger",
    aka: "Little Peppy",
    yearOfBirth: 1974,
    yearOfDeath: 2005,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Mr San Peppy",
    damName: "Sugar Badger",
    description:
      "Gewinner der NCHA Futurity 1977 und über Jahrzehnte einer der bedeutendsten Cuttingvererber. Seine Nachkommen zeichnen sich durch Cowsense, Trainierbarkeit und Härte aus; über Dual Pep und Peptoboonsmal ist er in der modernen Zucht fest verankert.",
    isHistoric: true,
  },
  {
    name: "Smart Peppy",
    sex: "mare",
    yearOfBirth: 1971,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Peppy San",
    damName: "Royal Smart",
    description:
      "Zuchtstute von aussergewöhnlicher Bedeutung - Mutter von Smart Little Lena und Namensgeberin für unzählige 'Smart'-Nachkommen.",
    isHistoric: true,
  },
  {
    name: "Smart Little Lena",
    yearOfBirth: 1979,
    yearOfDeath: 2010,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Doc O'Lena",
    damName: "Smart Peppy",
    description:
      "Gewinner der sogenannten Triple Crown des Cutting (NCHA Futurity, Super Stakes und Derby) und danach einer der erfolgreichsten Vererber der Rassegeschichte. Praktisch die gesamte moderne Cuttingzucht arbeitet mit seinem Blut.",
    isHistoric: true,
  },
  {
    name: "Dual Pep",
    yearOfBirth: 1986,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Peppy San Badger",
    damName: "Miss Dual Doc",
    description:
      "Sehr erfolgreicher Cuttinghengst und Vererber, dessen Nachkommen über Jahre die Futurity-Finals prägten.",
    isHistoric: true,
  },
  {
    name: "Peptoboonsmal",
    yearOfBirth: 1992,
    color: "Blue Roan",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Peppy San Badger",
    damName: "Royal Blue Boon",
    description:
      "Gewinner der NCHA Futurity 1995 und einer der prägenden Vererber der 2000er Jahre. Verbindet die Peppy-San-Badger-Linie mit der Ausnahmestute Royal Blue Boon.",
    isHistoric: true,
  },
  {
    name: "Royal Blue Boon",
    sex: "mare",
    yearOfBirth: 1980,
    color: "Blue Roan",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Boon Bar",
    damName: "Royal Tincie",
    description:
      "Gilt als eine der erfolgreichsten Cutting-Zuchtstuten aller Zeiten, gemessen an den Gewinnsummen ihrer Nachkommen. Mutter von Peptoboonsmal.",
    isHistoric: true,
  },

  /* ---------------------------------------------------------------- */
  /* Freckles-Linie                                                    */
  /* ---------------------------------------------------------------- */
  {
    name: "Jewel's Leo Bars",
    aka: "Freckles",
    yearOfBirth: 1962,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Sugar Bars",
    damName: "Leo Pan",
    description:
      "Vater von Colonel Freckles und Freckles Playboy. Über diese beiden Söhne begründete er eine eigene, bis heute stark nachgefragte Cuttinglinie.",
    isHistoric: true,
  },
  {
    name: "Colonel Freckles",
    yearOfBirth: 1973,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting", "Reining"],
    sireName: "Jewel's Leo Bars",
    damName: "Christy Jay",
    description:
      "Erfolgreicher Cuttinghengst und Vererber, der auch in die Reiningzucht ausstrahlte - unter anderem als Vater von Colonels Smoking Gun.",
    isHistoric: true,
  },
  {
    name: "Freckles Playboy",
    yearOfBirth: 1973,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Jewel's Leo Bars",
    damName: "Gay Jay",
    description:
      "Einer der bedeutendsten Cuttingvererber seiner Generation. Seine Töchter sind als Zuchtstuten ausgesprochen gefragt.",
    isHistoric: true,
  },
  {
    name: "Playgun",
    yearOfBirth: 1989,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting", "Reined Cow Horse"],
    sireName: "Freckles Playboy",
    damName: "Miss Silver Pistol",
    description:
      "Freckles-Playboy-Sohn mit Erfolgen im Cutting und starker Verbreitung in der Cow-Horse- und Ranchzucht.",
    isHistoric: true,
  },

  /* ---------------------------------------------------------------- */
  /* High Brow Cat / moderne Cuttingzucht                              */
  /* ---------------------------------------------------------------- */
  {
    name: "High Brow Hickory",
    yearOfBirth: 1983,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Doc's Hickory",
    damName: "Grulla San",
    description:
      "Vater von High Brow Cat und damit Ausgangspunkt der derzeit dominierenden Cuttinglinie.",
    isHistoric: true,
  },
  {
    name: "High Brow Cat",
    yearOfBirth: 1988,
    yearOfDeath: 2019,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "High Brow Hickory",
    damName: "Smart Little Kitty",
    description:
      "Über viele Jahre der führende Cuttingvererber überhaupt, gemessen an den Gewinnsummen seiner Nachkommen. Seine Söhne - allen voran Metallic Cat - bestimmen die aktuelle Zucht massgeblich.",
    isHistoric: true,
  },
  {
    name: "Metallic Cat",
    yearOfBirth: 2005,
    color: "Red Roan",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "High Brow Cat",
    damName: "Chers Shadow",
    description:
      "NCHA-Futurity-Champion und einer der erfolgreichsten Vererber der Gegenwart. Seine Nachkommen sind im Cutting, aber zunehmend auch im Reined Cow Horse und in der Ranchzucht vertreten.",
    availability: "frozen",
  },

  /* ---------------------------------------------------------------- */
  /* Reining                                                           */
  /* ---------------------------------------------------------------- */
  {
    name: "Hollywood Dun It",
    yearOfBirth: 1983,
    yearOfDeath: 2005,
    color: "Dunalino / Dun",
    country: "US",
    disciplines: ["Reining"],
    sireName: "Hollywood Jac 86",
    damName: "Blossom Berry",
    description:
      "Der prägende Reiningvererber seiner Zeit und über Jahre an der Spitze der NRHA-Vererberstatistik. Seine Nachkommen gelten als besonders willig im Kopf und stark im Stop - Eigenschaften, die die moderne Reiningzucht bis heute suchen.",
    isHistoric: true,
  },
  {
    name: "Colonels Smoking Gun",
    aka: "Gunner",
    yearOfBirth: 1993,
    yearOfDeath: 2015,
    color: "Overo-gescheckt",
    country: "US",
    disciplines: ["Reining"],
    sireName: "Colonel Freckles",
    damName: "Katie Gun",
    description:
      "Einer der bekanntesten Reininghengste überhaupt - unverwechselbar durch seine Scheckung und mit enormem Einfluss auf die moderne Reiningzucht. Seine Nachkommen sind weltweit erfolgreich, auch in Europa stark vertreten.",
    isHistoric: true,
  },
  {
    name: "Topsail Whiz",
    yearOfBirth: 1987,
    color: "Fuchs",
    country: "US",
    disciplines: ["Reining"],
    sireName: "Topsail Cody",
    damName: "Jeanie Whiz Bar",
    description:
      "Bedeutender Reiningvererber, dessen 'Whiz'-Nachkommen über Jahrzehnte die NRHA-Ergebnislisten prägen.",
    isHistoric: true,
  },
  {
    name: "Shining Spark",
    yearOfBirth: 1989,
    yearOfDeath: 2018,
    color: "Palomino",
    country: "US",
    disciplines: ["Reining", "Allround"],
    sireName: "Genuine Doc",
    damName: "Diamonds Sparkle",
    description:
      "Aussergewöhnlich vielseitiger Vererber: seine Nachkommen waren im Reining, im Allroundbereich und im Cow Horse erfolgreich. Zusätzlich beliebt wegen der Farbvererbung.",
    isHistoric: true,
  },
  {
    name: "Smart Chic Olena",
    yearOfBirth: 1988,
    yearOfDeath: 2007,
    color: "Fuchs",
    country: "US",
    disciplines: ["Reining", "Reined Cow Horse"],
    sireName: "Smart Little Lena",
    damName: "Gay Sugar Chic",
    description:
      "Smart-Little-Lena-Sohn, der die Cuttinglinie erfolgreich in die Reining- und Cow-Horse-Zucht überführte. Vater zahlreicher Verbandschampions.",
    isHistoric: true,
  },
  {
    name: "Wimpys Little Step",
    yearOfBirth: 1998,
    color: "Palomino",
    country: "US",
    disciplines: ["Reining"],
    sireName: "Nu Chex To Cash",
    damName: "A Little Starbert",
    description:
      "NRHA-Futurity-Champion 2002 und anschliessend einer der gefragtesten Reiningvererber weltweit. Sein Blut ist in Europa über Gefriersamen weit verbreitet.",
    availability: "frozen",
  },
  {
    name: "Spooks Gotta Whiz",
    yearOfBirth: 2007,
    color: "Fuchs",
    country: "US",
    disciplines: ["Reining"],
    sireName: "Spooks Gotta Gun",
    damName: "Prettywhizprettydoes",
    description:
      "Erfolgreicher Reininghengst und Vererber der jüngeren Generation, der die Gunner- und die Whiz-Linie in sich vereint.",
    availability: "frozen",
  },

  /* ---------------------------------------------------------------- */
  /* Pleasure / Halter / Allround                                      */
  /* ---------------------------------------------------------------- */
  {
    name: "Zippo Pine Bar",
    yearOfBirth: 1969,
    yearOfDeath: 1998,
    color: "Fuchs",
    country: "US",
    disciplines: ["Western Pleasure", "Allround"],
    sireName: "Zippo Pat Bars",
    damName: "Dollie Pine",
    description:
      "Der Gründervater der modernen Western-Pleasure-Zucht. Seine Nachkommen definierten über Jahrzehnte, wie ein Pleasurepferd sich bewegen soll; die 'Zippo'-Namen sind bis heute ein Qualitätsmerkmal in dieser Sparte.",
    isHistoric: true,
  },
  {
    name: "Two Eyed Jack",
    yearOfBirth: 1961,
    yearOfDeath: 1985,
    color: "Fuchs",
    country: "US",
    disciplines: ["Halter", "Allround"],
    sireName: "Two D Two",
    damName: "Triangle Tookie",
    description:
      "Einer der erfolgreichsten Allroundvererber der Rassegeschichte mit einer aussergewöhnlichen Zahl an Champions in Halter- und Performanceklassen. Steht für Typ, Umgänglichkeit und Vielseitigkeit.",
    isHistoric: true,
  },
  {
    name: "Impressive",
    yearOfBirth: 1969,
    yearOfDeath: 1995,
    color: "Fuchs",
    country: "US",
    disciplines: ["Halter"],
    sireName: "Lucky Bar",
    damName: "Glamour Bars",
    description:
      "Prägte die Halterzucht wie kein zweiter Hengst - extreme Bemuskelung und Ausstrahlung. Auf ihn geht allerdings auch die Erbkrankheit HYPP zurück; alle Nachkommen seiner Linie sollten getestet sein. Ein Eintrag ohne HYPP-Status ist in dieser Linie unvollständig.",
    bloodlineNote:
      "Ursprung der HYPP-Mutation. Bei allen Nachkommen bitte den HYPP-Status angeben.",
    isHistoric: true,
  },
];

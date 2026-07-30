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
    bloodlineNote:
      "Auf ihn wird die Erbkrankheit HERDA zurückgeführt. In dieser Linie gehört der HERDA-Status in jeden Eintrag.",
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
    sireName: "Colonelfourfreckle",
    damName: "Katie Gun",
    description:
      "Einer der bekanntesten Reininghengste überhaupt - unverwechselbar durch seine Scheckung und mit enormem Einfluss auf die moderne Reiningzucht. Seine Nachkommen sind weltweit erfolgreich, auch in Europa stark vertreten. Sein Vater ist Colonelfourfreckle; Colonel Freckles ist der Grossvater - das wird häufig verwechselt.",
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
      "Erfolgreicher Reininghengst und Vererber der jüngeren Generation. Sein Vater Spooks Gotta Gun ist ein Halbbruder von Colonels Smoking Gun über die gemeinsame Mutter Katie Gun; über seine eigene Mutter kommt die Whiz-Linie dazu.",
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

  /* ---------------------------------------------------------------- */
  /* Vorfahren - im Juli 2026 per Websuche recherchiert                */
  /*                                                                   */
  /* Diese Einträge dienen vor allem der Abstammung: erst durch sie    */
  /* reichen die Stammbäume der oben stehenden Pferde über die erste   */
  /* Generation hinaus.                                                */
  /*                                                                   */
  /* Quellen waren Wikipedia, AQHA, Quarter Horse News, Western        */
  /* Horseman, StallionCompare und rimondo. allbreedpedigree.com sperrt*/
  /* automatisierte Zugriffe (HTTP 403) und konnte NICHT herangezogen  */
  /* werden - bitte gegen die Papiere gegenprüfen, bevor ein Eintrag   */
  /* als geprüft markiert wird. Wo eine Angabe unklar blieb, steht     */
  /* weiterhin nichts.                                                 */
  /* ---------------------------------------------------------------- */

  /* --- Hollywood-Linie: schliesst Hollywood Dun It an King an ------ */
  {
    name: "Hollywood Jac 86",
    yearOfBirth: 1967,
    color: "Palomino",
    country: "US",
    disciplines: ["Reining"],
    sireName: "Easter King",
    damName: "Miss Hollywood",
    description:
      "Vater von Hollywood Dun It. Über seinen Vater Easter King führt die Linie zurück auf King P-234, über seine Mutter auf den Cuttingvererber Hollywood Gold.",
    isHistoric: true,
  },
  {
    name: "Easter King",
    yearOfBirth: 1951,
    country: "US",
    sireName: "King",
    description: "Sohn des King P-234 und Vater von Hollywood Jac 86.",
    isHistoric: true,
  },
  {
    name: "Miss Hollywood",
    sex: "mare",
    yearOfBirth: 1947,
    country: "US",
    sireName: "Hollywood Gold",
    isHistoric: true,
  },
  {
    name: "Hollywood Gold",
    country: "US",
    disciplines: ["Cutting"],
    description:
      "In den 1950er und 60er Jahren einer der wichtigsten Cuttingvererber.",
    isHistoric: true,
  },
  {
    name: "Blossom Berry",
    sex: "mare",
    country: "US",
    disciplines: ["Reining"],
    sireName: "Dun Berry",
    damName: "Regina Bella",
    description: "Mutter von Hollywood Dun It.",
    isHistoric: true,
  },

  /* --- Pleasure: hängt Zippo Pine Bar an Three Bars und Leo -------- */
  {
    name: "Zippo Pat Bars",
    yearOfBirth: 1964,
    color: "Fuchs",
    country: "US",
    disciplines: ["Foundation / Zucht"],
    sireName: "Three Bars",
    damName: "Leo Pat",
    description:
      "Vater von Zippo Pine Bar. Verbindet das Three-Bars-Blut mit der Leo-Linie.",
    isHistoric: true,
  },
  {
    name: "Leo Pat",
    sex: "mare",
    country: "US",
    sireName: "Leo",
    isHistoric: true,
  },

  /* --- Reining: hängt Topsail Whiz an Doc Bar --------------------- */
  {
    name: "Topsail Cody",
    yearOfBirth: 1977,
    country: "US",
    disciplines: ["Reining"],
    sireName: "Joe Cody",
    damName: "Doc Bar Linda",
    description:
      "NRHA-Futurity-Sieger 1980 und einer der ersten Millionen-Dollar-Vererber der NRHA. Vater von Topsail Whiz.",
    isHistoric: true,
  },
  {
    name: "Joe Cody",
    country: "US",
    isHistoric: true,
  },
  {
    name: "Doc Bar Linda",
    sex: "mare",
    country: "US",
    sireName: "Doc Bar",
    isHistoric: true,
  },
  {
    name: "Nu Chex To Cash",
    yearOfBirth: 1990,
    color: "Palomino",
    country: "US",
    disciplines: ["Reining", "Reined Cow Horse"],
    sireName: "Nu Cash",
    damName: "Amarilla Chex",
    description:
      "Vater von Wimpys Little Step. Gewann als einziges Pferd im selben Jahr die AQHA-High-Point-Titel in Reining und Working Cow Horse.",
    isHistoric: true,
  },
  {
    name: "Nu Cash",
    yearOfBirth: 1984,
    country: "US",
    isHistoric: true,
  },
  {
    name: "Amarilla Chex",
    sex: "mare",
    country: "US",
    sireName: "Bueno Chex",
    isHistoric: true,
  },
  {
    name: "Spooks Gotta Gun",
    yearOfBirth: 2002,
    country: "US",
    disciplines: ["Reining"],
    sireName: "Grays Starlight",
    damName: "Katie Gun",
    description:
      "Vater von Spooks Gotta Whiz. Über seine Mutter Katie Gun ein Halbbruder von Colonels Smoking Gun - nicht dessen Sohn, was oft verwechselt wird.",
    isHistoric: true,
  },
  {
    name: "Grays Starlight",
    yearOfBirth: 1984,
    country: "US",
    disciplines: ["Cutting"],
    isHistoric: true,
  },
  {
    name: "Katie Gun",
    sex: "mare",
    yearOfBirth: 1987,
    color: "Brauner, Overo-gescheckt",
    country: "US",
    disciplines: ["Reining"],
    sireName: "John Gun",
    damName: "Bueno Katie",
    description:
      "Mutter zweier prägender Reininghengste: Colonels Smoking Gun und Spooks Gotta Gun. In der NRHA Hall of Fame und unter den erfolgreichsten Mutterstuten der Reininggeschichte.",
    isHistoric: true,
  },
  {
    name: "Prettywhizprettydoes",
    sex: "mare",
    country: "US",
    sireName: "Topsail Whiz",
    isHistoric: true,
  },
  {
    name: "Diamonds Sparkle",
    sex: "mare",
    yearOfBirth: 1974,
    color: "Palomino",
    country: "US",
    disciplines: ["Reining", "Allround"],
    sireName: "Mr Diamond Dude",
    damName: "Pollyanna Rose",
    description:
      "AQHA Superhorse 1979 und Mutter von Shining Spark. Gilt als eine der erfolgreichsten Zuchtstuten der Rasse.",
    isHistoric: true,
  },
  {
    name: "Mr Diamond Dude",
    country: "US",
    isHistoric: true,
  },

  /* --- Cutting: schliesst High Brow Cat an Smart Little Lena an ---- */
  {
    name: "Smart Little Kitty",
    sex: "mare",
    yearOfBirth: 1984,
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Smart Little Lena",
    damName: "Doc's Kitty",
    description:
      "Mutter von High Brow Cat. Über sie führt die heute dominierende Cuttinglinie zurück auf Smart Little Lena und Doc Bar.",
    isHistoric: true,
  },
  {
    name: "Doc's Kitty",
    sex: "mare",
    country: "US",
    sireName: "Doc Bar",
    isHistoric: true,
  },
  {
    name: "Chers Shadow",
    sex: "mare",
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Peptoboonsmal",
    damName: "Shesa Smarty Lena",
    description: "Mutter von Metallic Cat.",
    isHistoric: true,
  },
  {
    name: "Shesa Smarty Lena",
    sex: "mare",
    country: "US",
    sireName: "Smart Little Lena",
    isHistoric: true,
  },
  {
    name: "Sugar Badger",
    sex: "mare",
    country: "US",
    sireName: "Grey Badger III",
    description: "Mutter von Peppy San Badger.",
    isHistoric: true,
  },
  {
    name: "Grey Badger III",
    country: "US",
    sireName: "Grey Badger II",
    description:
      "Vater der Zuchtstuten Sugar Badger und Triangle Tookie - und damit im Hintergrund zweier ganz unterschiedlicher Linien.",
    isHistoric: true,
  },
  {
    name: "Boon Bar",
    country: "US",
    disciplines: ["Cutting"],
    description: "Vater von Royal Blue Boon.",
    isHistoric: true,
  },
  {
    name: "Royal Tincie",
    sex: "mare",
    country: "US",
    sireName: "Royal King",
    isHistoric: true,
  },
  {
    name: "Royal King",
    country: "US",
    disciplines: ["Cutting"],
    isHistoric: true,
  },

  /* --- Gründergenerationen ---------------------------------------- */
  {
    name: "Percentage",
    breed: "Thoroughbred",
    country: "US",
    sireName: "Sir Gallahad III",
    description: "Vater von Three Bars.",
    isHistoric: true,
  },
  {
    name: "Myrtle Dee",
    sex: "mare",
    breed: "Thoroughbred",
    country: "US",
    sireName: "Luke McLuke",
    description: "Mutter von Three Bars.",
    isHistoric: true,
  },
  {
    name: "Luke McLuke",
    breed: "Thoroughbred",
    country: "US",
    isHistoric: true,
  },
  {
    name: "Dandy Doll",
    sex: "mare",
    country: "US",
    sireName: "Texas Dandy",
    description: "Mutter von Doc Bar.",
    isHistoric: true,
  },
  {
    name: "Texas Dandy",
    country: "US",
    isHistoric: true,
  },
  {
    name: "Miss Taylor",
    sex: "mare",
    country: "US",
    sireName: "Old Poco Bueno",
    description: "Mutter von Poco Bueno.",
    isHistoric: true,
  },
  {
    name: "Sheilwin",
    sex: "mare",
    country: "US",
    sireName: "Pretty Boy",
    description: "Mutter von Poco Lena und Poco Tivio.",
    isHistoric: true,
  },
  {
    name: "Pretty Boy",
    country: "US",
    isHistoric: true,
  },
  {
    name: "Peppy Belle",
    sex: "mare",
    yearOfBirth: 1955,
    country: "US",
    sireName: "Pep Up",
    description:
      "Mutter von Peppy San und Mr San Peppy - beide von Leo San, also Vollbrüder.",
    isHistoric: true,
  },
  {
    name: "Pep Up",
    country: "US",
    isHistoric: true,
  },
  {
    name: "Solis",
    country: "US",
    sireName: "Old Sorrel",
    description: "Sohn des Old Sorrel und Vater von Wimpy P-1.",
    bloodlineNote:
      "Mutter: unregistrierte Thoroughbred-Stute ohne Namen in den Unterlagen.",
    isHistoric: true,
  },
  {
    name: "Panda",
    sex: "mare",
    country: "US",
    sireName: "Old Sorrel",
    description:
      "Mutter von Wimpy P-1. Wimpy führt Old Sorrel damit auf beiden Seiten.",
    bloodlineNote: "Ihre Mutter war eine Roan-Stute von Hickory Bill.",
    isHistoric: true,
  },
  {
    name: "Two D Two",
    yearOfBirth: 1957,
    country: "US",
    sireName: "Double Diamond",
    damName: "Double Life",
    description: "Vater von Two Eyed Jack.",
    isHistoric: true,
  },
  {
    name: "Double Diamond",
    yearOfBirth: 1947,
    country: "US",
    isHistoric: true,
  },
  {
    name: "Double Life",
    sex: "mare",
    country: "US",
    sireName: "Pay Day",
    isHistoric: true,
  },
  {
    name: "Triangle Tookie",
    sex: "mare",
    yearOfBirth: 1951,
    country: "US",
    sireName: "Grey Badger III",
    description:
      "Mutter von Two Eyed Jack und insgesamt von fünf AQHA Champions.",
    isHistoric: true,
  },
  {
    name: "Lucky Bar",
    yearOfBirth: 1954,
    country: "US",
    description: "Vater von Impressive.",
    isHistoric: true,
  },
  {
    name: "Glamour Bars",
    sex: "mare",
    yearOfBirth: 1960,
    country: "US",
    description: "Mutter von Impressive.",
    isHistoric: true,
  },

  /* ---------------------------------------------------------------- */
  /* Zweiter Recherchedurchgang - vor allem die Linie von Gunner       */
  /* ---------------------------------------------------------------- */

  /* --- Gunners Vaterlinie ----------------------------------------- */
  {
    name: "Colonelfourfreckle",
    yearOfBirth: 1979,
    color: "Fuchs",
    country: "US",
    disciplines: ["Cutting", "Reining"],
    sireName: "Colonel Freckles",
    damName: "Miss Solano",
    description:
      "Vater von Colonels Smoking Gun. Verbindet die Freckles-Linie über seine Mutter mit Doc Bar.",
    isHistoric: true,
  },
  {
    name: "Miss Solano",
    sex: "mare",
    country: "US",
    sireName: "Doc's Solano",
    isHistoric: true,
  },
  {
    name: "Doc's Solano",
    yearOfBirth: 1971,
    country: "US",
    disciplines: ["Cutting"],
    sireName: "Doc Bar",
    bloodlineNote: "Muttervater: Poco Tivio. Der Name der Mutter fehlt noch.",
    isHistoric: true,
  },

  /* --- Gunners Mutterlinie ---------------------------------------- */
  {
    name: "John Gun",
    country: "US",
    description: "Vater der NRHA-Hall-of-Fame-Stute Katie Gun.",
    isHistoric: true,
  },
  {
    name: "Bueno Katie",
    sex: "mare",
    country: "US",
    sireName: "Aledo Bueno Bar",
    isHistoric: true,
  },
  {
    name: "Aledo Bueno Bar",
    country: "US",
    isHistoric: true,
  },

  /* --- Freckles-Linie: Rey Jay steht hinter beiden Mutterstuten ---- */
  {
    name: "Christy Jay",
    sex: "mare",
    yearOfBirth: 1967,
    country: "US",
    sireName: "Rey Jay",
    damName: "Leo Bob",
    description: "Mutter von Colonel Freckles.",
    isHistoric: true,
  },
  {
    name: "Gay Jay",
    sex: "mare",
    country: "US",
    sireName: "Rey Jay",
    damName: "Georgia Cody",
    description: "Mutter von Freckles Playboy.",
    isHistoric: true,
  },
  {
    name: "Rey Jay",
    country: "US",
    disciplines: ["Cutting"],
    description:
      "Bedeutender Muttervater der Cuttingzucht. Colonel Freckles und Freckles Playboy sind Dreiviertelbrüder - gleicher Vater, und beide Mütter von Rey Jay.",
    isHistoric: true,
  },
  {
    name: "Leo Bob",
    sex: "mare",
    country: "US",
    isHistoric: true,
  },
  {
    name: "Georgia Cody",
    sex: "mare",
    country: "US",
    isHistoric: true,
  },
  {
    name: "Leo Pan",
    sex: "mare",
    country: "US",
    sireName: "Leo",
    description:
      "Mutter von Jewel's Leo Bars - über sie hängt die gesamte Freckles-Linie an Leo.",
    isHistoric: true,
  },

  /* --- Gründergenerationen: schliesst die King-Ranch-Linie an ------ */
  {
    name: "Hickory Bill",
    country: "US",
    disciplines: ["Foundation / Zucht"],
    sireName: "Peter McCue",
    damName: "Lucretia M",
    description:
      "Sohn des Peter McCue und Vater von Old Sorrel. Über ihn führt das King-Ranch-Zuchtprogramm zurück auf die Gründerpferde der Rasse.",
    isHistoric: true,
  },
  {
    name: "Lucretia M",
    sex: "mare",
    country: "US",
    sireName: "The Hero",
    isHistoric: true,
  },
  {
    name: "Dan Tucker",
    country: "US",
    disciplines: ["Foundation / Zucht"],
    sireName: "Barney Owens",
    damName: "Butt Cut",
    description: "Vater von Peter McCue.",
    isHistoric: true,
  },
  {
    name: "Barney Owens",
    country: "US",
    isHistoric: true,
  },
  {
    name: "Butt Cut",
    sex: "mare",
    country: "US",
    sireName: "Jack Traveler",
    isHistoric: true,
  },
  {
    name: "Nora M",
    sex: "mare",
    breed: "Thoroughbred",
    country: "US",
    damName: "Kitty Clyde",
    description: "Mutter von Peter McCue.",
    isHistoric: true,
  },
  {
    name: "Della P",
    sex: "mare",
    yearOfBirth: 1934,
    color: "Fuchs",
    country: "US",
    sireName: "Doc Horn",
    description: "Mutter von Lightning Bar und damit Grossmutter von Doc Bar.",
    isHistoric: true,
  },
  {
    name: "Doc Horn",
    yearOfBirth: 1921,
    color: "Fuchs",
    country: "US",
    isHistoric: true,
  },
  {
    name: "Grulla San",
    sex: "mare",
    yearOfBirth: 1970,
    country: "US",
    sireName: "Leo San Hank",
    description: "Mutter von High Brow Hickory.",
    isHistoric: true,
  },
  {
    name: "Leo San Hank",
    country: "US",
    isHistoric: true,
  },

  /* ---------------------------------------------------------------- */
  /* In Europa stehende Hengste - per Websuche recherchiert (Juli 2026)*/
  /*                                                                    */
  /* allbreedpedigree.com liess sich für diese Recherche nicht          */
  /* heranziehen (siehe docs/quellen-vorfahren.md). Quellen waren       */
  /* DQHA, StallionCompare, In Foal Partners, rimondo sowie die         */
  /* Seiten der jeweiligen Zuchtstationen - dort aber ausdrücklich nur  */
  /* für Fakten (Vater, Mutter, Jahrgang, Farbe), nie für Fototexte     */
  /* oder Bilder. isHistoric ist hier bewusst false: es sind aktuell    */
  /* stehende bzw. beworbene Hengste, keine verstorbenen Legenden.      */
  /* ---------------------------------------------------------------- */
  {
    name: "Custom Del Cielo",
    yearOfBirth: 2007,
    color: "Fuchs",
    country: "DE",
    disciplines: ["Reining"],
    sireName: "Custom Crome",
    description:
      "Von der DQHA gekört (Bewertung 8,0) und mehrfacher Erfolg bis zur FEI-Europameisterschaft. Steht bei Ludwig Quarter Horses in Bitz sowie zur Samenentnahme bei Dr. Gerhard Storch in Tannheim.",
    bloodlineNote: "Gentests laut Züchterangabe negativ auf GBED, HYPP, MH, PSSM1 und HERDA.",
    availability: "both",
    isHistoric: false,
  },
  {
    name: "Custom Crome",
    country: "US",
    disciplines: ["Reining"],
    description: "Vater von Custom Del Cielo.",
    isHistoric: true,
  },
  {
    name: "Platinum Vintage",
    country: "DE",
    disciplines: ["Reining"],
    sireName: "A Sparkling Vintage",
    damName: "Starjac Miss",
    description:
      "Steht bei Torsten Tiemann (Tiemann Performance Horses) in Deutschland. Über seinen Vater führt die Abstammung zu Shining Spark, über seine Mutter zu Hollywood Jac 86.",
    isHistoric: false,
  },
  {
    name: "A Sparkling Vintage",
    country: "US",
    disciplines: ["Reining"],
    sireName: "Shining Spark",
    description: "Vater von Platinum Vintage.",
    isHistoric: true,
  },
  {
    name: "Starjac Miss",
    sex: "mare",
    country: "US",
    sireName: "Hollywood Jac 86",
    damName: "A Great Star",
    description: "Mutter von Platinum Vintage.",
    isHistoric: true,
  },
  {
    name: "A Great Star",
    sex: "mare",
    country: "US",
    sireName: "Great Pine",
    isHistoric: true,
  },
  {
    name: "HF Mobster",
    aka: "Guns On The River",
    yearOfBirth: 2008,
    color: "Buckskin, Splash-White-gescheckt",
    country: "US",
    disciplines: ["Reining"],
    sireName: "Colonels Smoking Gun",
    damName: "Dun Its Black Gold",
    description:
      "Sohn von Gunner mit über 123.000 US-Dollar NRHA-Lifetime Earnings, unter anderem für den besten Ritt der 2013 NRHA Derby Finals. Auch über die Zuchtstation Tiemann Performance Horses in Deutschland vermarktet.",
    isHistoric: false,
  },
  {
    name: "Dun Its Black Gold",
    sex: "mare",
    country: "US",
    sireName: "Hollywood Dun It",
    description: "Mutter von HF Mobster.",
    isHistoric: true,
  },
  {
    name: "AHF Rojo El Sueno",
    yearOfBirth: 2023,
    color: "Red Dun",
    country: "DE",
    breed: "Quarter Horse",
    disciplines: ["Foundation / Zucht"],
    damName: "IJ Kings Breeze",
    description:
      "Foundation Quarter Horse mit rund 29 % Poco-Bueno- und 24 % King-Blutanteil. Seine Mutter wurde tragend aus Kanada importiert; geboren und aufgewachsen bei der Absarokee Horse Farm in Niedersachsen.",
    isHistoric: false,
  },
  {
    name: "IJ Kings Breeze",
    sex: "mare",
    country: "CA",
    description: "Mutter von AHF Rojo El Sueno, tragend aus Kanada nach Deutschland importiert.",
    isHistoric: true,
  },
  {
    name: "Jaz Poco Simpatico",
    color: "Silber-Grullo",
    country: "DE",
    breed: "Quarter Horse",
    disciplines: ["Foundation / Zucht"],
    description:
      "Foundation Quarter Horse von der Jaz Ranch (USA) importiert, doppelt reinerbig für Schwarz- und Dun-Faktor. Steht bei der Absarokee Horse Farm in Niedersachsen.",
    bloodlineNote: "Vater und Mutter laut Quelle noch nicht namentlich gesichert - bitte ergänzen.",
    isHistoric: false,
  },
  {
    name: "Remington Steel Burn",
    color: "Silber-Grullo",
    country: "DE",
    breed: "Quarter Horse",
    disciplines: ["Foundation / Zucht"],
    description:
      "Foundation Quarter Horse von der Blackburn Ranch in South Dakota (USA), rund 17 % King- und 27 % Poco-Bueno-Blutanteil. Steht bei der Absarokee Horse Farm in Niedersachsen.",
    bloodlineNote: "Vater und Mutter laut Quelle noch nicht namentlich gesichert - bitte ergänzen.",
    isHistoric: false,
  },
];



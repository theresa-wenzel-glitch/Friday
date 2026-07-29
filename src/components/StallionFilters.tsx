import Link from "next/link";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { withParam, type SearchParams, type StallionFilters } from "@/lib/queries";

const REGION_CHIPS = [
  { value: "", label: "Alle Länder" },
  { value: "EU", label: "Europa" },
  { value: "US", label: "USA & Kanada" },
  { value: "WORLD", label: "Übrige Welt" },
];

const SORT_OPTIONS = [
  { value: "name", label: "Name (A–Z)" },
  { value: "newest", label: "Zuletzt eingetragen" },
  { value: "youngest", label: "Jüngste zuerst" },
  { value: "oldest", label: "Älteste zuerst" },
  { value: "feeAsc", label: "Decktaxe aufsteigend" },
  { value: "feeDesc", label: "Decktaxe absteigend" },
];

const SEMEN_OPTIONS = [
  { value: "", label: "Egal" },
  { value: "frozen", label: "Gefrorenes Sperma" },
  { value: "shipped", label: "Frischsamen-Versand" },
  { value: "live", label: "Natursprung" },
  { value: "eu", label: "In der EU verfügbar" },
];

export function StallionFiltersBar({
  filters,
  params,
  breeds,
  disciplines,
}: {
  filters: StallionFilters;
  params: SearchParams;
  breeds: string[];
  disciplines: string[];
}) {
  return (
    <div className="filters">
      {/* Ein einfaches GET-Formular: funktioniert auch ohne JavaScript. */}
      <form method="get" action="/hengste">
        <div className="filter-row">
          <div className="filter-field grow">
            <label htmlFor="q">Suche</label>
            <input
              id="q"
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="Hengst, Vater, Muttervater oder Station …"
            />
          </div>

          <div className="filter-field">
            <label htmlFor="country">Land</label>
            <select id="country" name="country" defaultValue={filters.country}>
              <option value="">Alle</option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="discipline">Disziplin</label>
            <select id="discipline" name="discipline" defaultValue={filters.discipline}>
              <option value="">Alle</option>
              {disciplines.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="breed">Rasse</label>
            <select id="breed" name="breed" defaultValue={filters.breed}>
              <option value="">Alle</option>
              {breeds.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="semen">Verfügbarkeit</label>
            <select id="semen" name="semen" defaultValue={filters.semen}>
              {SEMEN_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="maxFee">Decktaxe bis</label>
            <input
              id="maxFee"
              type="number"
              name="maxFee"
              min={0}
              step={100}
              defaultValue={filters.maxFee ?? ""}
              placeholder="z. B. 1500"
            />
          </div>

          <div className="filter-field">
            <label htmlFor="sort">Sortierung</label>
            <select id="sort" name="sort" defaultValue={filters.sort}>
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Region wird ueber die Chips gesetzt, hier nur mitgeschickt. */}
          {filters.region && <input type="hidden" name="region" value={filters.region} />}

          <div className="filter-field" style={{ flex: "0 0 auto", minWidth: 0 }}>
            <button className="btn btn-primary" type="submit">
              Suchen
            </button>
          </div>
        </div>
      </form>

      <div className="chips">
        {REGION_CHIPS.map((chip) => (
          <Link
            key={chip.value || "all"}
            className="chip"
            aria-current={filters.region === chip.value}
            href={`/hengste${withParam(params, { region: chip.value || null })}`}
          >
            {chip.label}
          </Link>
        ))}
        <Link className="chip" href="/hengste" style={{ marginLeft: "auto" }}>
          Filter zurücksetzen
        </Link>
      </div>
    </div>
  );
}

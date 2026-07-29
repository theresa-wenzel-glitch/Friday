import { allBreedSearchUrl, pedigreeColumns, type PedigreeInput } from "@/lib/pedigree";

/**
 * Drei Generationen als Spalten. Jeder Vorfahre verlinkt direkt auf die Suche
 * bei allbreedpedigree.com, wo der vollstaendige Stammbaum steht.
 */
export function PedigreeTree({ stallion }: { stallion: PedigreeInput }) {
  const [gen1, gen2] = pedigreeColumns(stallion);

  return (
    <div className="pedigree">
      <div className="pedigree-col">
        {gen1.map((node, i) =>
          node ? (
            <a
              key={i}
              className={`ped-node ${node.kind}`}
              href={allBreedSearchUrl(node.name)}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span className="role">{node.kind === "sire" ? "Vater" : "Mutter"}</span>
              <span>{node.name}</span>
            </a>
          ) : (
            <div key={i} className="ped-empty" />
          ),
        )}
      </div>

      <div className="pedigree-col">
        {gen2.map((node, i) =>
          node ? (
            <a
              key={i}
              className={`ped-node ${node.kind}`}
              href={allBreedSearchUrl(node.name)}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span className="role">
                {["Vater d. Vaters", "Mutter d. Vaters", "Vater d. Mutter", "Mutter d. Mutter"][i]}
              </span>
              <span>{node.name}</span>
            </a>
          ) : (
            <div key={i} className="ped-empty" />
          ),
        )}
      </div>
    </div>
  );
}

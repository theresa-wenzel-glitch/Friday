import Link from "next/link";
import type { PedigreeNode } from "@/lib/types";
import { pedigreeColumns } from "@/lib/pedigree";

/**
 * Klassisches Pedigree-Raster: je Generation eine Spalte, Vaterlinie oben.
 * Umgesetzt als CSS-Grid, in dem jeder Vorfahr über `gridRow` genau so viele
 * Zeilen einnimmt, wie er Nachfahren-Plätze abdeckt. Dadurch stehen die Kästen
 * wie in einer gedruckten Abstammung ineinander verschachtelt.
 */
export function PedigreeChart({
  root,
  generations = 4,
}: {
  root: PedigreeNode;
  generations?: number;
}) {
  const columns = pedigreeColumns(root, generations);
  const rows = 2 ** generations;

  return (
    <div className="scroll-x -mx-4 px-4 pb-2">
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${generations}, minmax(9.5rem, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(2.6rem, auto))`,
          minWidth: `${generations * 10}rem`,
        }}
      >
        {columns.map((column, genIndex) => {
          const span = rows / column.length;
          return column.map((node, slotIndex) => (
            <PedigreeCell
              key={`${genIndex}-${slotIndex}`}
              node={node}
              gridColumn={genIndex + 1}
              gridRowStart={slotIndex * span + 1}
              gridRowSpan={span}
              // Der oberste Platz jeder Spalte ist immer der Vater.
              isSireSide={slotIndex % 2 === 0}
            />
          ));
        })}
      </div>
    </div>
  );
}

function PedigreeCell({
  node,
  gridColumn,
  gridRowStart,
  gridRowSpan,
  isSireSide,
}: {
  node: PedigreeNode | null;
  gridColumn: number;
  gridRowStart: number;
  gridRowSpan: number;
  isSireSide: boolean;
}) {
  const style = {
    gridColumn,
    gridRow: `${gridRowStart} / span ${gridRowSpan}`,
  };

  if (!node) {
    return (
      <div
        style={{ ...style, border: "1px dashed var(--line)" }}
        className="rounded-md flex items-center justify-center text-xs muted"
        aria-label="Vorfahr nicht erfasst"
      >
        —
      </div>
    );
  }

  const inner = (
    <>
      <span className="block text-sm font-semibold leading-tight">
        {node.name}
      </span>
      {(node.yearOfBirth || node.color) && (
        <span className="block text-xs muted leading-tight mt-0.5">
          {[node.yearOfBirth, node.color].filter(Boolean).join(" · ")}
        </span>
      )}
    </>
  );

  const className =
    "rounded-md px-2.5 py-2 flex flex-col justify-center no-underline transition-colors";

  const cellStyle = {
    ...style,
    backgroundColor: isSireSide ? "var(--surface)" : "var(--surface-muted)",
    border: "1px solid var(--line)",
    // Vaterseite bekommt einen kräftigeren linken Rand - erleichtert das Lesen.
    borderLeft: `3px solid ${isSireSide ? "var(--accent)" : "var(--line)"}`,
  };

  if (node.slug) {
    return (
      <Link
        href={`/hengste/${node.slug}`}
        style={cellStyle}
        className={`${className} hover:shadow-sm`}
        title={`${node.name} - Datenblatt öffnen`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      style={cellStyle}
      className={className}
      title={`${node.name} - noch kein eigener Datensatz`}
    >
      {inner}
    </div>
  );
}

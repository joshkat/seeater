import type { SeatingRow } from "../../lib/seatingRows";

/**
 * Fold-over (tent) place cards, two per row: the top half is printed upside
 * down so the name reads from both sides once folded along the dashed line.
 */
export function PlaceCards({ rows }: { rows: SeatingRow[] }): JSX.Element {
  return (
    <section className="grid grid-cols-2 gap-0">
      {rows.map((row) => (
        <article
          key={row.guest.id}
          className="flex h-[2.6in] break-inside-avoid flex-col border border-dashed border-neutral-400"
        >
          <div className="flex flex-1 rotate-180 items-center justify-center border-b border-dashed border-neutral-300 text-2xl font-semibold">
            {row.guest.name}
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-1">
            <span className="text-2xl font-semibold">{row.guest.name}</span>
            <span className="text-sm text-neutral-500">
              {row.tableName}
              {row.guest.meal && ` · ${row.guest.meal}`}
            </span>
          </div>
        </article>
      ))}
      {rows.length === 0 && <p>No one is seated in this layout yet.</p>}
    </section>
  );
}

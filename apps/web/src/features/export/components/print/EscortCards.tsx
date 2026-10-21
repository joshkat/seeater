import type { SeatingRow } from "../../lib/seatingRows";

/** Small escort cards (name + table), alphabetical, three per row, to cut out. */
export function EscortCards({ rows }: { rows: SeatingRow[] }): JSX.Element {
  return (
    <section className="grid grid-cols-3 gap-0">
      {rows.map((row) => (
        <article
          key={row.guest.id}
          className="flex h-[1.6in] break-inside-avoid flex-col items-center justify-center gap-1 border border-dashed border-neutral-400 p-2 text-center"
        >
          <span className="text-lg font-semibold">{row.guest.name}</span>
          <span className="text-sm uppercase tracking-wide text-neutral-600">{row.tableName}</span>
        </article>
      ))}
      {rows.length === 0 && <p>No one is seated in this layout yet.</p>}
    </section>
  );
}

import { type SeatingRow, sortName } from "../../lib/seatingRows";

/** Alphabetical "find your seat" board: Surname, First … Table. */
export function FindYourSeatSheet({
  title,
  rows,
}: {
  title: string;
  rows: SeatingRow[];
}): JSX.Element {
  return (
    <section>
      <h1 className="mb-1 text-center text-3xl font-bold">{title}</h1>
      <p className="mb-6 text-center text-neutral-500">Find your seat</p>
      <ol className="columns-3 gap-8 text-[15px]">
        {rows.map((row) => {
          const [last, ...first] = sortName(row.guest.name).split(" ");
          return (
            <li
              key={row.guest.id}
              className="flex break-inside-avoid justify-between gap-2 border-b border-dotted border-neutral-300 py-1"
            >
              <span>
                <strong>{last}</strong>
                {first.length > 0 && `, ${first.join(" ")}`}
              </span>
              <span className="whitespace-nowrap">{row.tableName}</span>
            </li>
          );
        })}
      </ol>
      {rows.length === 0 && <p className="text-center">No one is seated in this layout yet.</p>}
    </section>
  );
}

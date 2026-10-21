import type { SeatingRow } from "../../lib/seatingRows";

interface RosterSheetsProps {
  title: string;
  rosters: { tableName: string; rows: SeatingRow[] }[];
}

/** One block per table: seat number, guest, meal and needs (for staff and caterers). */
export function RosterSheets({ title, rosters }: RosterSheetsProps): JSX.Element {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">{title} — table rosters</h1>
      <div className="grid grid-cols-2 gap-6">
        {rosters.map((roster) => (
          <article key={roster.tableName} className="break-inside-avoid">
            <h2 className="mb-1 border-b border-neutral-400 text-lg font-semibold">
              {roster.tableName} <span className="text-sm font-normal">({roster.rows.length})</span>
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {roster.rows.map((row) => (
                  <tr key={row.guest.id} className="align-top">
                    <td className="w-8 tabular-nums text-neutral-500">{row.seatNumber}</td>
                    <td>
                      {row.guest.name}
                      {row.guest.isChild && " (child)"}
                    </td>
                    <td className="text-neutral-600">{row.guest.meal}</td>
                    <td className="text-xs text-neutral-600">
                      {[row.guest.dietary, row.guest.accessibility].filter(Boolean).join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </div>
      {rosters.length === 0 && <p>No one is seated in this layout yet.</p>}
    </section>
  );
}

import type { TableStats } from "@seating/shared";

/** One table in the stats: fill, meals, children and needs. */
export function TableStatsRow({ table }: { table: TableStats }): JSX.Element {
  const full = table.chairs > 0 && table.seated >= table.chairs;
  return (
    <tr>
      <td className="font-medium">{table.label}</td>
      <td>
        <div className="flex items-center gap-2">
          <progress
            className={`progress w-16 ${full ? "progress-success" : "progress-primary"}`}
            value={table.seated}
            max={Math.max(1, table.chairs)}
          />
          <span className="tabular-nums">
            {table.seated}/{table.chairs}
          </span>
        </div>
      </td>
      <td>
        {table.meals.length === 0
          ? "—"
          : table.meals.map(([meal, count]) => `${meal} ${count}`).join(", ")}
      </td>
      <td className="tabular-nums">{table.children || "—"}</td>
      <td className="text-xs text-base-content/70">{table.needs.join("; ") || "—"}</td>
    </tr>
  );
}

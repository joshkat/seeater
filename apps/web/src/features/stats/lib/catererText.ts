import type { LayoutStats } from "@seating/shared";

/** Plain-text meal summary per table, for pasting into an email to a caterer. */
export function catererText(eventName: string, stats: LayoutStats): string {
  const lines = [`${eventName} — ${stats.name}`, ""];
  const meals = stats.meals.map(([meal, count]) => `${meal} ${count}`).join(", ");
  lines.push(`All tables: ${meals || "no meals yet"}`, "");
  for (const table of stats.tables) {
    if (table.seated === 0) continue;
    const tableMeals = table.meals.map(([meal, count]) => `${meal} ${count}`).join(", ");
    lines.push(`${table.label} (${table.seated} guests): ${tableMeals || "—"}`);
    if (table.children > 0) lines.push(`  Children: ${table.children}`);
    for (const need of table.needs) lines.push(`  ${need}`);
  }
  return lines.join("\n");
}

/**
 * The display name for a table: its custom label if set, otherwise a stable
 * fallback "Table N" based on its position in the (creation-ordered) list.
 * Used by the canvas, properties panel, and the guest seating list so the table
 * number is always visible even when the user hasn't named it.
 */
export function tableDisplayName(label: string, index: number): string {
  const trimmed = label.trim();
  return trimmed || `Table ${index + 1}`;
}

/** The display name of the table with this id ("the table" if it's gone). */
export function tableNameById(tables: { id: string; label: string }[], tableId: string): string {
  const index = tables.findIndex((table) => table.id === tableId);
  return index === -1 ? "the table" : tableDisplayName(tables[index].label, index);
}

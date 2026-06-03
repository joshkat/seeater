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

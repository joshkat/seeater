import type { RoomObject, Table } from "@seating/shared";
import { ROOM_OBJECT_DEFAULTS } from "@seating/shared";
import { type KeyboardEvent, useState } from "react";

import { tableDisplayName } from "../lib/tableLabel";

interface CanvasKeyboard {
  /** The table or room object Tab moved to (shown with a focus ring). */
  focusedItem: Table | RoomObject | null;
  /** What a screen reader hears about it. */
  announcement: string;
  handlers: {
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    onBlur: () => void;
  };
}

function describe(item: Table | RoomObject, tables: Table[]): string {
  if ("seats" in item) {
    const name = tableDisplayName(item.label, tables.indexOf(item));
    const chairs = `${item.seats.length} chair${item.seats.length === 1 ? "" : "s"}`;
    return `${name}, ${chairs}. Enter edits seating; arrow keys move it.`;
  }
  const name = item.label.trim() || ROOM_OBJECT_DEFAULTS[item.kind].name;
  return `${name}. Arrow keys move it.`;
}

/**
 * Keyboard access to the floor plan (the canvas itself has no DOM nodes):
 * with the canvas focused, Tab / Shift+Tab step through the tables, then the
 * room objects, selecting each; past the last one Tab leaves the canvas as
 * usual. Enter on a table opens Edit seating. Arrow keys, Delete and Escape
 * are the editor's global shortcuts, which act on the selection.
 */
export function useCanvasKeyboard(
  tables: Table[],
  objects: RoomObject[],
  selectedIds: string[],
  select: (id: string | null) => void,
  openSeating: (tableId: string) => void,
): CanvasKeyboard {
  const [focusId, setFocusId] = useState<string | null>(null);
  const items: (Table | RoomObject)[] = [...tables, ...objects];
  // Clicking something else (or Escape) moves the selection away: no ring.
  const focusedItem =
    focusId && selectedIds.includes(focusId)
      ? (items.find((item) => item.id === focusId) ?? null)
      : null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    // Keys on the zoom buttons, minimap etc. inside the canvas are theirs.
    if (event.target !== event.currentTarget) return;
    if (event.key === "Tab" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const index = focusedItem ? items.indexOf(focusedItem) : -1;
      const next = event.shiftKey ? index - 1 : index + 1;
      // Before the first item (Shift+Tab) is the canvas itself; Tab past the
      // last item, or Shift+Tab from the canvas, leaves it.
      if (next >= items.length || (event.shiftKey && index === -1)) {
        setFocusId(null);
        return;
      }
      event.preventDefault();
      if (next < 0) {
        setFocusId(null);
        select(null);
        return;
      }
      setFocusId(items[next].id);
      select(items[next].id);
      return;
    }
    if (event.key === "Enter" && focusedItem && "seats" in focusedItem) {
      event.preventDefault();
      if (focusedItem.seats.length > 0) openSeating(focusedItem.id);
    }
  };

  return {
    focusedItem,
    announcement: focusedItem ? describe(focusedItem, tables) : "",
    handlers: { onKeyDown, onBlur: () => setFocusId(null) },
  };
}

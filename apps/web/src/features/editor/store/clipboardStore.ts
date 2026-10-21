import type { ClipboardItems } from "@seating/shared";
import { create } from "zustand";

/**
 * The editor's copy / paste clipboard: tables and room objects copied with
 * ⌘/Ctrl+C. In memory for this session, so it carries across layouts and
 * events (not the system clipboard).
 */
interface ClipboardState {
  items: ClipboardItems | null;
  set: (items: ClipboardItems) => void;
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  items: null,
  set(items) {
    set({ items: items.tables.length + items.objects.length > 0 ? items : null });
  },
}));

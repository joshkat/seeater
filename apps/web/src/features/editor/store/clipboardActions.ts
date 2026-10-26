import { shortcutLabel } from "../../../lib/platform";
import { COARSE_POINTER_QUERY, DESKTOP_QUERY } from "../../../lib/useMediaQuery";
import { useSeatingFlowStore } from "../../guests/store/seatingFlowStore";
import { copiedNotice } from "../lib/clipboardNotice";
import { useClipboardStore } from "./clipboardStore";
import { useEditorStore } from "./editorStore";

function matches(query: string): boolean {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

/** Copies the selection (toolbar Copy, Select ▾ → Copy or ⌘/Ctrl+C) and says
 * what was copied and how to paste it, so the copy is never silent. */
export function copySelection(): void {
  useEditorStore.getState().copySelected();
  const items = useClipboardStore.getState().items;
  if (!items) return;
  // Paste is a toolbar button on wide screens and in Select ▾ below them
  // (see Toolbar); touch screens have no ⌘V to mention.
  const text = copiedNotice(items.tables.length, items.objects.length, {
    where: matches(DESKTOP_QUERY) ? "toolbar" : "menu",
    shortcut: matches(COARSE_POINTER_QUERY) ? null : shortcutLabel("V"),
  });
  useSeatingFlowStore.getState().showNotice(text);
}

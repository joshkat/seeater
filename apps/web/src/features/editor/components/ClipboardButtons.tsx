import { shortcutLabel } from "../../../lib/platform";
import { copySelection } from "../store/clipboardActions";
import { useClipboardStore } from "../store/clipboardStore";
import { useEditorStore } from "../store/editorStore";

/** Toolbar Copy and Paste (n) — the visible side of ⌘/Ctrl+C and V. The
 * clipboard is kept for the session, so Paste works in other layouts and events. */
export function ClipboardButtons(): JSX.Element {
  const hasSelection = useEditorStore((state) => state.selectedIds.length > 0);
  const paste = useEditorStore((state) => state.paste);
  const clipboard = useClipboardStore((state) => state.items);
  const pasteCount = clipboard ? clipboard.tables.length + clipboard.objects.length : 0;

  return (
    <>
      <button
        type="button"
        className="btn btn-sm"
        disabled={!hasSelection}
        title={`Copy the selection (${shortcutLabel("C")})`}
        onClick={copySelection}
      >
        Copy
      </button>
      {/* Fixed width so the toolbar doesn't shift when the count appears. */}
      <button
        type="button"
        className="btn btn-sm min-w-24"
        disabled={pasteCount === 0}
        title={`Paste copies here (${shortcutLabel("V")})`}
        onClick={paste}
      >
        {pasteCount > 0 ? `Paste (${pasteCount})` : "Paste"}
      </button>
    </>
  );
}

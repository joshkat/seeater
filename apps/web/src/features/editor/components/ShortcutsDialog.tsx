import { useRef } from "react";
import { useModalFocus } from "../../../lib/useModalFocus";
import { isApplePlatform, shortcutLabel } from "../../../lib/platform";
import { NUDGE_STEP, NUDGE_STEP_LARGE } from "../hooks/useKeyboardShortcuts";
import { useShortcutsDialogStore } from "../store/shortcutsDialogStore";

function shortcutGroups(): { title: string; rows: [string, string][] }[] {
  return [
    {
      title: "Editing",
      rows: [
        [shortcutLabel("Z"), "Undo"],
        [`${shortcutLabel("Z", { shift: true })}${isApplePlatform() ? "" : " or Ctrl+Y"}`, "Redo"],
        [shortcutLabel("A"), "Select every table and room object"],
        [
          `${shortcutLabel("C")} / ${shortcutLabel("V")}`,
          "Copy / paste (also into another layout or event)",
        ],
        [shortcutLabel("D"), "Duplicate the selection"],
        ["Delete or ⌫", "Delete the selection"],
      ],
    },
    {
      title: "Moving",
      rows: [
        ["← ↑ → ↓", `Nudge the selection (${NUDGE_STEP} cm)`],
        ["Shift + arrow", `Nudge further (${NUDGE_STEP_LARGE} cm)`],
        ["Scroll / pinch", "Zoom the room"],
      ],
    },
    {
      title: "Anywhere",
      rows: [
        ["Esc", "Back out: close a prompt or drawer, or clear the selection"],
        ["?", "This list"],
      ],
    },
  ];
}

/** The keyboard-shortcuts cheat sheet (? or the toolbar's ⌨ button). */
export function ShortcutsDialog(): JSX.Element | null {
  const boxRef = useRef<HTMLDivElement>(null);
  const open = useShortcutsDialogStore((state) => state.open);
  const setOpen = useShortcutsDialogStore((state) => state.setOpen);
  useModalFocus(boxRef, open);
  if (!open) return null;

  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={() => setOpen(false)}
    >
      <div
        ref={boxRef}
        className="modal-box flex max-w-lg flex-col gap-4 text-base-content"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => (event.key === "Escape" || event.key === "?") && setOpen(false)}
      >
        <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
        {shortcutGroups().map((group) => (
          <section key={group.title}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/60">
              {group.title}
            </h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {group.rows.map(([keys, action]) => (
                <div key={action} className="contents">
                  <dt>
                    <kbd className="kbd kbd-sm whitespace-nowrap">{keys}</kbd>
                  </dt>
                  <dd>{action}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <div className="modal-action mt-0">
          <button
            type="button"
            autoFocus
            className="btn btn-primary btn-sm"
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

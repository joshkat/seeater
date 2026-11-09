import { useState } from "react";

import { useActiveLayoutId, useLayouts } from "../../hooks/useDocumentSelectors";
import {
  createLayout,
  removeLayout,
  renameLayoutTo,
  switchToLayout,
} from "../../store/layoutActions";
import { LayoutTab } from "./LayoutTab";
import { NewLayoutDialog } from "./NewLayoutDialog";

/** Layout tabs over the canvas: switch, add, rename, duplicate, delete. */
export function LayoutTabs(): JSX.Element {
  const layouts = useLayouts();
  const activeId = useActiveLayoutId();
  const [creating, setCreating] = useState(false);
  const active = layouts.find((layout) => layout.id === activeId);

  return (
    <>
      <nav
        aria-label="Layouts"
        className="absolute left-1/2 top-3 z-10 flex max-w-[calc(100%-7rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-box bg-base-100/90 p-1 shadow"
      >
        {layouts.map((layout) => (
          <LayoutTab
            key={layout.id}
            layout={layout}
            active={layout.id === activeId}
            canDelete={layouts.length > 1}
            onSelect={() => switchToLayout(layout.id)}
            onRename={(name) => renameLayoutTo(layout.id, name)}
            onDuplicate={() => createLayout(`${layout.name} (copy)`, "tables-and-seating")}
            onDelete={() => removeLayout(layout.id, layout.name)}
          />
        ))}
        <button
          type="button"
          className="btn btn-sm whitespace-nowrap"
          title="Add a layout (e.g. ceremony and reception)"
          onClick={() => setCreating(true)}
        >
          + Layout
        </button>
      </nav>
      {creating && (
        <NewLayoutDialog
          currentName={active?.name ?? "this layout"}
          onCreate={createLayout}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}

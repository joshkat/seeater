import { useState } from "react";

import { useBackdrop, useRoomObjects, useTables } from "../../editor/hooks/useDocumentSelectors";
import { useEditorStore } from "../../editor/store/editorStore";
import { ApplyTemplateDialog } from "./ApplyTemplateDialog";

/** Over an empty floor: how to get started (a table, or a whole room from a template). */
export function EmptyRoomHint(): JSX.Element | null {
  const tables = useTables();
  const objects = useRoomObjects();
  const backdrop = useBackdrop();
  const addTable = useEditorStore((state) => state.addTable);
  const [choosing, setChoosing] = useState(false);

  if (tables.length > 0 || objects.length > 0 || backdrop) {
    return choosing ? <ApplyTemplateDialog onClose={() => setChoosing(false)} /> : null;
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-4">
        <div className="pointer-events-auto flex max-w-sm flex-col items-center gap-3 rounded-box border border-base-300 bg-base-100/95 p-6 text-center text-base-content shadow">
          <p className="font-semibold">This room is empty</p>
          <p className="text-sm text-base-content/60">
            Add tables from the toolbar (+ Tables has real sizes, rows of chairs and grids), or set
            up a whole room from a template.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => addTable("round")}
            >
              Add a round table
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setChoosing(true)}>
              Use a template…
            </button>
          </div>
        </div>
      </div>
      {choosing && <ApplyTemplateDialog onClose={() => setChoosing(false)} />}
    </>
  );
}

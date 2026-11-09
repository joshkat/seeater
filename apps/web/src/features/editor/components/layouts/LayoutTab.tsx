import type { Layout } from "@seating/shared";
import { useState } from "react";

interface LayoutTabProps {
  layout: Layout;
  active: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** One layout tab. The active one has a ⋯ menu (rename, duplicate, delete). */
export function LayoutTab({
  layout,
  active,
  canDelete,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
}: LayoutTabProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(layout.name);

  if (editing) {
    const commit = (): void => {
      onRename(draft);
      setEditing(false);
    };
    return (
      <input
        autoFocus
        aria-label="Layout name"
        className="input input-sm w-36"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  if (!active) {
    return (
      <button type="button" className="btn btn-sm" onClick={onSelect}>
        {layout.name}
      </button>
    );
  }

  return (
    <div className="join">
      <button
        type="button"
        aria-current="true"
        className="btn btn-primary join-item btn-sm"
        title="Double-click to rename"
        onDoubleClick={() => {
          setDraft(layout.name);
          setEditing(true);
        }}
      >
        {layout.name}
      </button>
      <div className="dropdown dropdown-end join-item">
        <button
          type="button"
          tabIndex={0}
          aria-label={`${layout.name} layout actions`}
          className="btn btn-primary join-item btn-sm px-2"
        >
          ⋯
        </button>
        <ul className="dropdown-content menu z-20 mt-1 w-44 rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
          <li>
            <button
              type="button"
              onClick={() => {
                setDraft(layout.name);
                setEditing(true);
              }}
            >
              Rename
            </button>
          </li>
          <li>
            <button type="button" onClick={onDuplicate}>
              Duplicate
            </button>
          </li>
          {canDelete && (
            <li>
              <button type="button" className="text-error" onClick={onDelete}>
                Delete layout
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

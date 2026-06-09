import { useState } from "react";

import { AuthControls } from "../../auth/components/AuthControls";
import { useNavStore } from "../../dashboard/store/navStore";
import { GuestPanel } from "../../guests/components/GuestPanel";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useEditorStore } from "../store/editorStore";
import { EditorCanvas } from "./canvas/EditorCanvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { SaveStatusBadge } from "./SaveStatusBadge";
import { Toolbar } from "./Toolbar";

/** Inline-editable event title in the header. */
function EventTitle(): JSX.Element {
  const name = useEditorStore((state) => state.name);
  const renameFloorPlan = useEditorStore((state) => state.renameFloorPlan);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (editing) {
    return (
      <input
        autoFocus
        className="input input-bordered input-sm w-64"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          void renameFloorPlan(draft);
          setEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            void renameFloorPlan(draft);
            setEditing(false);
          }
          if (event.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="rounded px-1 text-lg font-semibold text-base-content hover:bg-base-200"
      title="Click to rename"
      onClick={() => {
        setDraft(name);
        setEditing(true);
      }}
    >
      {name || "Untitled event"}
    </button>
  );
}

/** Top-level seating editor for the currently open event. */
export function EditorPage(): JSX.Element {
  const loadStatus = useEditorStore((state) => state.loadStatus);
  const goToDashboard = useNavStore((state) => state.goToDashboard);

  useKeyboardShortcuts();

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-base-300 bg-base-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-accent btn-sm" onClick={goToDashboard}>
            ← Events
          </button>
          <EventTitle />
        </div>
        <div className="flex items-center gap-3">
          <SaveStatusBadge />
          <AuthControls />
        </div>
      </header>

      <div className="border-b border-base-300 bg-base-100 px-4 py-2.5">
        <Toolbar />
      </div>

      <div className="flex min-h-0 flex-1">
        <GuestPanel />
        <div className="relative min-w-0 flex-1">
          {loadStatus === "loading" && (
            <div className="absolute inset-0 grid place-items-center text-base-content/60">
              Loading floor plan…
            </div>
          )}
          {loadStatus === "error" && (
            <div className="absolute inset-0 grid place-items-center text-error">
              Could not load the floor plan. Is the API running?
            </div>
          )}
          {loadStatus === "ready" && <EditorCanvas />}
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}

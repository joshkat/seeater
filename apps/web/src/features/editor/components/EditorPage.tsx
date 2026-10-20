import { useState } from "react";
import { Link } from "react-router";

import { AuthControls } from "../../auth/components/AuthControls";
import { SyncStatusBadge } from "../../sync/components/SyncStatusBadge";
import { GuestPanel } from "../../guests/components/GuestPanel";
import { SeatingPrompts } from "../../guests/components/seating/SeatingPrompts";
import { DragGhost } from "../../dnd/components/DragGhost";
import { PlacementDialog } from "../../placement/components/PlacementDialog";
import { VersionHistoryButton } from "../../versions/components/VersionHistoryButton";
import { VersionHistoryDialog } from "../../versions/components/VersionHistoryDialog";
import { useAutoVersions } from "../../versions/hooks/useAutoVersions";
import { useEventName } from "../hooks/useDocumentSelectors";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { useEditorStore } from "../store/editorStore";
import { EditorCanvas } from "./canvas/EditorCanvas";
import { DrawerBackdrop } from "./DrawerBackdrop";
import { PropertiesPanel } from "./PropertiesPanel";
import { SaveStatusBadge } from "./SaveStatusBadge";
import { Toolbar } from "./Toolbar";

/** Inline-editable event title in the header. */
function EventTitle(): JSX.Element {
  const name = useEventName();
  const renameEvent = useEditorStore((state) => state.renameEvent);
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
          renameEvent(draft);
          setEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            renameEvent(draft);
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

/** The seating editor for the open event (rendered once it has loaded). */
export function EditorPage(): JSX.Element {
  useKeyboardShortcuts();
  useUnsavedChangesGuard();
  useAutoVersions();

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-base-300 bg-base-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="btn btn-secondary btn-sm">
            ← Events
          </Link>
          <EventTitle />
        </div>
        <div className="flex items-center gap-3">
          <VersionHistoryButton />
          <SaveStatusBadge />
          <SyncStatusBadge />
          <AuthControls />
        </div>
      </header>

      <div className="border-b border-base-300 bg-base-100 px-4 py-2.5">
        <Toolbar />
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <GuestPanel />
        <div className="relative min-w-0 flex-1">
          <EditorCanvas />
          <SeatingPrompts />
        </div>
        <PropertiesPanel />
        <DrawerBackdrop />
      </div>
      <PlacementDialog />
      <VersionHistoryDialog />
      <DragGhost />
    </div>
  );
}

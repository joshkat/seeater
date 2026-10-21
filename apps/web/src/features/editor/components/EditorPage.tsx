import { useState } from "react";
import { Link } from "react-router";

import { AuthControls } from "../../auth/components/AuthControls";
import { SyncStatusBadge } from "../../sync/components/SyncStatusBadge";
import { GuestPanel } from "../../guests/components/GuestPanel";
import { GuestDetailsDialog } from "../../guests/components/details/GuestDetailsDialog";
import { SeatingPrompts } from "../../guests/components/seating/SeatingPrompts";
import { DragGhost } from "../../dnd/components/DragGhost";
import { PlacementDialog } from "../../placement/components/PlacementDialog";
import { ExportMenu } from "../../export/components/ExportMenu";
import { PrintView } from "../../export/components/PrintView";
import { CheckInLink } from "../../checkin/components/CheckInLink";
import { VersionHistoryButton } from "../../versions/components/VersionHistoryButton";
import { VersionHistoryDialog } from "../../versions/components/VersionHistoryDialog";
import { useAutoVersions } from "../../versions/hooks/useAutoVersions";
import { useEventName } from "../hooks/useDocumentSelectors";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { useEditorStore } from "../store/editorStore";
import { EditorCanvas } from "./canvas/EditorCanvas";
import { EmptyRoomHint } from "../../templates/components/EmptyRoomHint";
import { DrawerBackdrop } from "./DrawerBackdrop";
import { LayoutTabs } from "./layouts/LayoutTabs";
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
        className="input input-bordered input-sm w-64 max-w-full"
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
      className="min-w-0 truncate rounded px-1 text-lg font-semibold text-base-content hover:bg-base-200"
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
      <header className="relative z-50 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-base-300 bg-base-100 px-4 py-3 max-sm:px-3 max-sm:py-2">
        <div className="flex min-w-0 items-center gap-3 max-sm:w-full">
          <Link to="/" className="btn btn-secondary btn-sm" title="All events">
            ←<span className="max-sm:hidden"> Events</span>
          </Link>
          <EventTitle />
        </div>
        <div className="flex flex-wrap items-center gap-3 max-sm:gap-2">
          <CheckInLink />
          <ExportMenu />
          <VersionHistoryButton />
          <SaveStatusBadge />
          <SyncStatusBadge />
          <AuthControls />
        </div>
      </header>

      <div className="relative z-40 border-b border-base-300 bg-base-100 px-4 py-2.5 max-sm:px-3 max-sm:py-2">
        <Toolbar />
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <GuestPanel />
        <div className="relative min-w-0 flex-1">
          <EditorCanvas />
          <LayoutTabs />
          <EmptyRoomHint />
          <SeatingPrompts />
        </div>
        <PropertiesPanel />
        <DrawerBackdrop />
      </div>
      <PlacementDialog />
      <VersionHistoryDialog />
      <GuestDetailsDialog />
      <PrintView />
      <DragGhost />
    </div>
  );
}

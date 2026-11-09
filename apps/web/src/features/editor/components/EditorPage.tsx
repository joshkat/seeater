import { useState } from "react";
import { Link } from "react-router";

import { useDocumentTitle } from "../../../lib/useDocumentTitle";
import { PHONE_QUERY, useMediaQuery } from "../../../lib/useMediaQuery";

import { AuthControls } from "../../auth/components/AuthControls";
import { ShareButton } from "../../sharing/components/ShareButton";
import { ShareDialog } from "../../sharing/components/ShareDialog";
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
import { SelectSeveralChip } from "./canvas/SelectSeveralChip";
import { EmptyRoomHint } from "../../templates/components/EmptyRoomHint";
import { DrawerBackdrop } from "./DrawerBackdrop";
import { LayoutTabs } from "./layouts/LayoutTabs";
import { PhoneBottomBar } from "./PhoneBottomBar";
import { PropertiesPanel } from "./PropertiesPanel";
import { SaveStatusBadge } from "./SaveStatusBadge";
import { ShortcutsDialog } from "./ShortcutsDialog";
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

  // The page's heading is the event name; the button inside renames it.
  return (
    <h1 className="min-w-0 truncate text-lg font-semibold text-base-content">
      <button
        type="button"
        className="max-w-full truncate rounded px-1 hover:bg-base-200"
        title="Click to rename"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
      >
        {name || "Untitled event"}
      </button>
    </h1>
  );
}

/** The seating editor for the open event (rendered once it has loaded). */
export function EditorPage(): JSX.Element {
  useKeyboardShortcuts();
  useUnsavedChangesGuard();
  useAutoVersions();
  const name = useEventName();
  useDocumentTitle(`${name || "Untitled event"} · Seating`);
  // Phones: the header keeps ← and the title; everything else is in the
  // bottom bar (PhoneBottomBar) and its ⋯ menu.
  const phone = useMediaQuery(PHONE_QUERY);

  return (
    <div className="flex h-screen flex-col text-base-content">
      <header className="relative z-50 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-base-300 bg-base-100 px-4 py-3 max-sm:px-3 max-sm:py-2">
        <div className="flex min-w-0 items-center gap-3 max-sm:flex-1">
          <Link to="/" className="btn btn-secondary btn-sm" title="All events">
            ←<span className="max-sm:hidden"> Events</span>
          </Link>
          <EventTitle />
        </div>
        <div className="flex flex-wrap items-center gap-3 max-sm:gap-2">
          {!phone && (
            <>
              <CheckInLink />
              <ExportMenu />
              <VersionHistoryButton />
              <ShareButton />
            </>
          )}
          <SaveStatusBadge />
          <SyncStatusBadge />
          <AuthControls />
        </div>
      </header>

      {!phone && (
        <div className="relative z-40 border-b border-base-300 bg-base-100 px-4 py-2.5">
          <Toolbar />
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <GuestPanel />
        <div className="relative min-w-0 flex-1">
          <EditorCanvas />
          <LayoutTabs />
          <EmptyRoomHint />
          <SelectSeveralChip />
          <SeatingPrompts />
        </div>
        <PropertiesPanel />
        <DrawerBackdrop />
      </div>
      {phone && <PhoneBottomBar />}
      <PlacementDialog />
      <VersionHistoryDialog />
      <ShareDialog />
      <ShortcutsDialog />
      <GuestDetailsDialog />
      <PrintView />
      <DragGhost />
    </div>
  );
}

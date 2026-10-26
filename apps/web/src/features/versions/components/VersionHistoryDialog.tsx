import { useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useModalFocus } from "../../../lib/useModalFocus";
import { useDocumentId } from "../../editor/hooks/useDocumentSelectors";
import type { EventVersionRecord } from "../../storage/db/SeatingDb";
import { deleteVersion } from "../../storage/repository/versionRepository";
import { activeDb } from "../../storage/store/storageStore";
import { useVersions } from "../hooks/useVersions";
import { copyVersionToNewEvent, restoreVersion, saveNamedVersion } from "../lib/versionActions";
import { useVersionDialogStore } from "../store/versionDialogStore";
import { SaveVersionForm } from "./SaveVersionForm";
import { VersionRow } from "./VersionRow";

/**
 * Version history for the open event: save a named version, and restore,
 * copy or delete any saved one. Automatic versions are taken on open and
 * every 10 minutes of editing (useAutoVersions).
 */
export function VersionHistoryDialog(): JSX.Element | null {
  const boxRef = useRef<HTMLDivElement>(null);
  const open = useVersionDialogStore((state) => state.open);
  const setOpen = useVersionDialogStore((state) => state.setOpen);
  useModalFocus(boxRef, open);
  const eventId = useDocumentId();
  const versions = useVersions(open ? eventId : null);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      console.error(failure);
      setError("That version couldn’t be read. It may be damaged.");
    } finally {
      setBusy(false);
    }
  }

  const handleRestore = (version: EventVersionRecord) =>
    run(async () => {
      await restoreVersion(version);
      setOpen(false);
    });

  const handleCopy = (version: EventVersionRecord) =>
    run(async () => {
      const id = await copyVersionToNewEvent(version);
      setOpen(false);
      navigate(`/events/${id}`);
    });

  const handleDelete = (version: EventVersionRecord) =>
    run(async () => {
      if (version.kind === "named" && !window.confirm(`Delete the version “${version.label}”?`)) {
        return;
      }
      await deleteVersion(activeDb(), version.id);
    });

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Version history">
      <div
        ref={boxRef}
        className="modal-box flex max-h-[85vh] w-full max-w-2xl flex-col gap-3 text-base-content"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Version history</h2>
            <p className="text-sm text-base-content/60">
              Saved automatically when you open the event and every 10 minutes while you edit. Kept
              on this device only.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="btn btn-ghost btn-sm btn-square"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>

        <SaveVersionForm onSave={(label) => run(() => saveNamedVersion(label))} />
        {error && <p className="text-sm text-error">{error}</p>}

        <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          {versions === undefined && <li className="text-sm text-base-content/60">Loading…</li>}
          {versions?.length === 0 && (
            <li className="text-sm text-base-content/60">No versions yet.</li>
          )}
          {versions?.map((version) => (
            <VersionRow
              key={version.id}
              version={version}
              busy={busy}
              onRestore={() => void handleRestore(version)}
              onCopy={() => void handleCopy(version)}
              onDelete={() => void handleDelete(version)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

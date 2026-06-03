import { useEditorStore } from "../store/editorStore";
import type { SaveStatus } from "../types";

const TEXT: Record<SaveStatus, string> = {
  idle: "All changes saved",
  saving: "Saving…",
  saved: "All changes saved",
  error: "Save failed — retrying on next edit",
};

const TONE: Record<SaveStatus, string> = {
  idle: "text-success",
  saving: "text-warning",
  saved: "text-success",
  error: "text-error",
};

const DOT: Record<SaveStatus, string> = {
  idle: "bg-success",
  saving: "bg-warning",
  saved: "bg-success",
  error: "bg-error",
};

/** Compact autosave indicator shown in the editor header. */
export function SaveStatusBadge(): JSX.Element {
  const saveStatus = useEditorStore((state) => state.saveStatus);

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${TONE[saveStatus]}`}>
      <span aria-hidden className={`h-2 w-2 rounded-full ${DOT[saveStatus]}`} />
      {TEXT[saveStatus]}
    </span>
  );
}

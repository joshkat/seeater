import { type SaveStatus, useDocumentStore } from "../store/documentStore";

const TEXT: Record<SaveStatus, string> = {
  saving: "Saving…",
  saved: "Saved on this device",
  error: "Couldn't save on this device",
};

const TONE: Record<SaveStatus, string> = {
  saving: "text-warning",
  saved: "text-success",
  error: "text-error",
};

const DOT: Record<SaveStatus, string> = {
  saving: "bg-warning",
  saved: "bg-success",
  error: "bg-error",
};

/** Compact autosave indicator shown in the editor header. */
export function SaveStatusBadge(): JSX.Element {
  const saveStatus = useDocumentStore((state) => state.saveStatus);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm ${TONE[saveStatus]}`}
      title={TEXT[saveStatus]}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${DOT[saveStatus]}`} />
      {/* Phones: just the dot, unless saving failed. */}
      <span className={saveStatus === "error" ? "" : "max-sm:sr-only"}>{TEXT[saveStatus]}</span>
    </span>
  );
}

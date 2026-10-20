import { useVersionDialogStore } from "../store/versionDialogStore";

/** Editor header button that opens version history. */
export function VersionHistoryButton(): JSX.Element {
  const setOpen = useVersionDialogStore((state) => state.setOpen);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      title="Version history: save, restore or copy earlier versions"
      onClick={() => setOpen(true)}
    >
      History
    </button>
  );
}

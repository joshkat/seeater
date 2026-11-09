import { syncConfigured } from "../../auth/lib/authConfig";
import { useShareDialogStore } from "../store/shareDialogStore";

/** Editor header button that opens the Share dialog (only in builds with sync). */
export function ShareButton(): JSX.Element | null {
  const setOpen = useShareDialogStore((state) => state.setOpen);
  if (!syncConfigured) return null;
  return (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      title="Invite people to edit or view, or get a read-only link"
      onClick={() => setOpen(true)}
    >
      Share
    </button>
  );
}

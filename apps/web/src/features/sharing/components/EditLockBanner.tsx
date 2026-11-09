import type { LockHolder } from "@seating/shared";

interface EditLockBannerProps {
  holder: LockHolder;
  /** True when they took over while you were editing. */
  tookOver: boolean;
  onEditAnyway: () => void;
}

/** "Sam is editing" over a read-only event, with "Edit anyway". */
export function EditLockBanner({
  holder,
  tookOver,
  onEditAnyway,
}: EditLockBannerProps): JSX.Element {
  const who = holder.isYou ? "You're" : `${holder.name} is`;
  const message = holder.isYou
    ? "You're editing this in another tab or on another device, so it's read-only here."
    : tookOver
      ? `${holder.name} took over editing. Your changes so far are saved; this now updates live.`
      : `${who} editing this event, so it's read-only for now. It updates live and unlocks when they're done.`;

  return (
    <div
      role="status"
      className="alert alert-warning alert-soft flex flex-wrap py-2 text-sm text-base-content"
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        className="btn btn-sm"
        title="Take over editing. If you both change it at once, one of you gets a conflicted copy."
        onClick={onEditAnyway}
      >
        Edit anyway
      </button>
    </div>
  );
}

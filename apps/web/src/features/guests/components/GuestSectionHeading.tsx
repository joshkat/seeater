import type { ReactNode } from "react";

/** A section title inside the guest list ("To seat (5)", "Seated (39)"). */
export function GuestSectionHeading({
  children,
  aside,
}: {
  children: ReactNode;
  /** Something on the right of the title, e.g. a Show / Hide button. */
  aside?: ReactNode;
}): JSX.Element {
  return (
    <div className="mb-1 flex items-center justify-between gap-2 rounded-field bg-base-200 px-2 py-1">
      <h3 className="text-xs font-semibold text-base-content">{children}</h3>
      {aside}
    </div>
  );
}

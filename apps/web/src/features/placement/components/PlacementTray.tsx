import type { ReactNode } from "react";

interface PlacementTrayProps {
  count: number;
  /** A guest is picked or dragged from a chair: the tray accepts them back. */
  inviting: boolean;
  onActivate: () => void;
  children: ReactNode;
  /** "+ Add guest…", under the chips. */
  footer?: ReactNode;
}

/** Guests in the dialog without a chair. Also a drop zone: drop (or tap the
 * tray with a seated guest picked) to take someone off their chair. */
export function PlacementTray({
  count,
  inviting,
  onActivate,
  children,
  footer,
}: PlacementTrayProps): JSX.Element {
  return (
    <section
      data-drop-zone="placement-tray"
      aria-label="Guests without a chair"
      onClick={(event) => {
        if (event.target === event.currentTarget) onActivate();
      }}
      className={`flex min-h-24 flex-col gap-2 rounded-box border-2 border-dashed p-3 ${
        inviting ? "border-primary bg-primary/5" : "border-base-300"
      }`}
    >
      <h3 className="pointer-events-none text-xs font-semibold uppercase tracking-wide text-base-content/60">
        To place ({count})
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
      {count === 0 && (
        <p className="pointer-events-none text-xs text-base-content/70">
          Everyone has a chair. Drag someone here to take them off the table.
        </p>
      )}
      {footer}
    </section>
  );
}

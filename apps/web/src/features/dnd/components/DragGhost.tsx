import { useDragStore } from "../store/dragStore";

/** The chip that follows the pointer during a drag. It ignores pointer events
 * so the drop target underneath can be found. */
export function DragGhost(): JSX.Element | null {
  const drag = useDragStore((state) => state.drag);
  if (!drag) return null;
  const { payload, point, pointerType } = drag;
  const count = payload.kind === "guests" ? payload.guestIds.length : 1;
  // Under a finger, lift the chip above it so it stays visible.
  const lift = pointerType === "touch" ? -56 : 12;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-content shadow-lg"
      style={{ transform: `translate(${point.x + 12}px, ${point.y + lift}px)` }}
    >
      {payload.label}
      {count > 1 && <span className="badge badge-sm">{count}</span>}
    </div>
  );
}

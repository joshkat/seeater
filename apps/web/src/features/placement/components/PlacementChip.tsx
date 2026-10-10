import type { PointerEvent } from "react";

interface PlacementChipProps {
  name: string;
  color: string;
  /** Where they end up if left here, e.g. "stays at Table 5". */
  note: string | null;
  picked: boolean;
  onActivate: () => void;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
}

/** A guest waiting for a chair: tap to pick (then tap a chair), or drag it. */
export function PlacementChip({
  name,
  color,
  note,
  picked,
  onActivate,
  onPointerDown,
}: PlacementChipProps): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={picked}
      className={`btn h-auto min-h-11 touch-none flex-col items-start gap-0 py-1.5 text-left ${
        picked ? "btn-primary" : "btn-outline"
      }`}
      onClick={onActivate}
      onPointerDown={onPointerDown}
    >
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
        {name}
      </span>
      {note && <span className="text-[10px] font-normal opacity-70">{note}</span>}
    </button>
  );
}

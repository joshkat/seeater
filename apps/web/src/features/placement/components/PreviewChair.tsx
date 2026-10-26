import type { KeyboardEvent, PointerEvent } from "react";

import { PREVIEW_CHAIR_RADIUS, type PreviewChair as Chair } from "../lib/previewGeometry";

export interface ChairOccupant {
  name: string;
  initials: string;
  color: string;
}

interface PreviewChairProps {
  chair: Chair;
  occupant: ChairOccupant | null;
  /** A guest is picked or being dragged, so empty chairs invite a drop. */
  inviting: boolean;
  /** The pointer is over this chair mid-drag. */
  hovered: boolean;
  /** This chair's occupant is the picked guest. */
  picked: boolean;
  onActivate: () => void;
  onPointerDown: (event: PointerEvent<SVGGElement>) => void;
}

/** One chair in the placement preview: initials when taken, the seat number
 * when empty, and the guest's first name outside. Tap, Enter or drop to use. */
export function PreviewChair({
  chair,
  occupant,
  inviting,
  hovered,
  picked,
  onActivate,
  onPointerDown,
}: PreviewChairProps): JSX.Element {
  const label = occupant ? `Seat ${chair.number}, ${occupant.name}` : `Seat ${chair.number}, empty`;
  const circleClass = hovered
    ? "fill-primary/25 stroke-primary"
    : occupant
      ? picked
        ? "stroke-primary"
        : "stroke-base-content/70"
      : inviting
        ? "fill-base-100 stroke-primary"
        : "fill-base-200 stroke-base-content/40";

  return (
    <g
      data-seat-id={chair.seatId}
      role="button"
      tabIndex={0}
      aria-label={label}
      className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-primary"
      onClick={onActivate}
      onPointerDown={onPointerDown}
      onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
      }}
    >
      <circle
        cx={chair.x}
        cy={chair.y}
        r={PREVIEW_CHAIR_RADIUS}
        className={circleClass}
        strokeWidth={picked || hovered ? 4 : 2}
        strokeDasharray={!occupant && inviting && !hovered ? "5 4" : undefined}
        style={occupant && !hovered ? { fill: occupant.color } : undefined}
      />
      <text
        x={chair.x}
        y={chair.y}
        textAnchor="middle"
        dominantBaseline="central"
        className={`pointer-events-none select-none text-[13px] font-bold ${
          occupant ? "fill-white" : "fill-base-content/70"
        }`}
      >
        {occupant ? occupant.initials : chair.number}
      </text>
      {occupant && (
        <text
          x={chair.labelX}
          y={chair.labelY}
          textAnchor={chair.labelAnchor}
          dominantBaseline="central"
          className="pointer-events-none select-none fill-base-content text-[13px]"
        >
          {occupant.name.split(/\s+/)[0].slice(0, 12)}
        </text>
      )}
    </g>
  );
}

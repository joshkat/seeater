import type { PointerEvent } from "react";

import type { PreviewLayout } from "../lib/previewGeometry";
import { type ChairOccupant, PreviewChair } from "./PreviewChair";

interface TablePreviewProps {
  layout: PreviewLayout;
  tableName: string;
  occupantFor: (seatId: string) => ChairOccupant | null;
  pickedSeatId: string | null;
  hoveredSeatId: string | null;
  inviting: boolean;
  onChairActivate: (seatId: string) => void;
  onChairPointerDown: (event: PointerEvent<SVGGElement>, seatId: string) => void;
}

/** The table drawn with its real chair layout, as a drop zone for guests. */
export function TablePreview({
  layout,
  tableName,
  occupantFor,
  pickedSeatId,
  hoveredSeatId,
  inviting,
  onChairActivate,
  onChairPointerDown,
}: TablePreviewProps): JSX.Element {
  const { table } = layout;

  return (
    <svg
      viewBox={layout.viewBox}
      data-drop-zone="placement-seat"
      role="group"
      aria-label={`${tableName} chairs`}
      className="h-auto max-h-[60vh] w-full touch-none"
    >
      <g transform={`rotate(${table.rotation})`}>
        {table.shape === "round" ? (
          <circle
            r={table.width / 2}
            className="fill-base-100 stroke-base-content/50"
            strokeWidth={2}
          />
        ) : (
          <rect
            x={-table.width / 2}
            y={-table.height / 2}
            width={table.width}
            height={table.height}
            rx={8}
            className="fill-base-100 stroke-base-content/50"
            strokeWidth={2}
          />
        )}
      </g>
      <text
        textAnchor="middle"
        dominantBaseline="central"
        className="pointer-events-none select-none fill-base-content/70 text-[14px] font-semibold"
      >
        {tableName}
      </text>
      {layout.chairs.map((chair) => (
        <PreviewChair
          key={chair.seatId}
          chair={chair}
          occupant={occupantFor(chair.seatId)}
          inviting={inviting}
          hovered={hoveredSeatId === chair.seatId}
          picked={pickedSeatId === chair.seatId}
          onActivate={() => onChairActivate(chair.seatId)}
          onPointerDown={(event) => onChairPointerDown(event, chair.seatId)}
        />
      ))}
    </svg>
  );
}

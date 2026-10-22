import type { RoomShape } from "../lib/roomShapes";

/** Tables and room objects as plain SVG (inside an <svg> in plan units). */
export function RoomShapes({
  shapes,
  strokeWidth,
}: {
  shapes: RoomShape[];
  strokeWidth: number;
}): JSX.Element {
  return (
    <g>
      {shapes.map((shape, index) =>
        shape.kind === "round" ? (
          <circle
            key={index}
            cx={shape.x}
            cy={shape.y}
            r={shape.w / 2}
            className="fill-base-100 stroke-base-content/50"
            strokeWidth={strokeWidth}
          />
        ) : (
          <rect
            key={index}
            x={shape.x - shape.w / 2}
            y={shape.y - shape.h / 2}
            width={shape.w}
            height={shape.h}
            transform={`rotate(${shape.rotation} ${shape.x} ${shape.y})`}
            className={
              shape.object
                ? "fill-primary/15 stroke-primary/50"
                : "fill-base-100 stroke-base-content/50"
            }
            strokeWidth={strokeWidth}
          />
        ),
      )}
    </g>
  );
}

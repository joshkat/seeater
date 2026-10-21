import type { EventTemplate } from "@seating/shared";

import { templateShapes } from "../lib/templatePreviews";

/** A small SVG thumbnail of a template's room. */
export function TemplatePreview({ template }: { template: EventTemplate }): JSX.Element {
  const { width, height, shapes } = templateShapes(template);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className="h-20 w-full rounded-field bg-base-200"
    >
      {shapes.map((shape, index) =>
        shape.kind === "round" ? (
          <circle
            key={index}
            cx={shape.x}
            cy={shape.y}
            r={shape.w / 2}
            className="fill-base-100 stroke-base-content/50"
            strokeWidth={12}
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
            strokeWidth={10}
          />
        ),
      )}
    </svg>
  );
}

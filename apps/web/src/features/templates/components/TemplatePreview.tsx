import type { EventTemplate } from "@seating/shared";

import { RoomShapes } from "../../editor/components/RoomShapes";
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
      <RoomShapes shapes={shapes} strokeWidth={10} />
    </svg>
  );
}

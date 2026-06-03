import type { Size } from "@seating/shared";
import { Line } from "react-konva";

import type { AlignmentGuide } from "../../types";

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
  dimensions: Size;
}

/** Dashed guide lines shown while a table snaps to another table's center. */
export function AlignmentGuides({ guides, dimensions }: AlignmentGuidesProps): JSX.Element {
  return (
    <>
      {guides.map((guide, index) => (
        <Line
          key={`${guide.axis}-${index}`}
          points={
            guide.axis === "x"
              ? [guide.position, 0, guide.position, dimensions.height]
              : [0, guide.position, dimensions.width, guide.position]
          }
          stroke="#2563eb"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      ))}
    </>
  );
}

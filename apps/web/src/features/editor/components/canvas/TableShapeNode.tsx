import type { Size, TableShape } from "@seating/shared";
import { Circle, Rect } from "react-konva";

interface TableShapeNodeProps {
  /** Table id, exposed as a Konva attr so drops on the body can target it. */
  tableId: string;
  shape: TableShape;
  size: Size;
  selected: boolean;
}

const FILL = "#ffffff";
const STROKE = "#475569";
const STROKE_SELECTED = "#2563eb";

/** Draws the table outline (round or rectangle), centered on the group origin. */
export function TableShapeNode({
  tableId,
  shape,
  size,
  selected,
}: TableShapeNodeProps): JSX.Element {
  const stroke = selected ? STROKE_SELECTED : STROKE;
  const strokeWidth = selected ? 2.5 : 1.5;

  if (shape === "round") {
    return (
      <Circle
        tableId={tableId}
        radius={size.width / 2}
        fill={FILL}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }

  return (
    <Rect
      tableId={tableId}
      width={size.width}
      height={size.height}
      offsetX={size.width / 2}
      offsetY={size.height / 2}
      cornerRadius={6}
      fill={FILL}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

import type { Size, TableShape } from "@seating/shared";
import { Circle, Rect } from "react-konva";

interface TableShapeNodeProps {
  /** Table id, exposed as a Konva attr so drops on the body can target it. */
  tableId: string;
  shape: TableShape;
  size: Size;
  selected: boolean;
  /** Guests being dragged would land here. */
  dropHighlight?: boolean;
}

const FILL = "#ffffff";
const STROKE = "#475569";
const STROKE_SELECTED = "#2563eb";
const FILL_DROP = "#dcfce7";
const STROKE_DROP = "#16a34a";

/** Draws the table outline (round or rectangle), centered on the group origin. */
export function TableShapeNode({
  tableId,
  shape,
  size,
  selected,
  dropHighlight = false,
}: TableShapeNodeProps): JSX.Element {
  const stroke = dropHighlight ? STROKE_DROP : selected ? STROKE_SELECTED : STROKE;
  const strokeWidth = dropHighlight ? 4 : selected ? 2.5 : 1.5;
  const fill = dropHighlight ? FILL_DROP : FILL;

  if (shape === "round") {
    return (
      <Circle
        tableId={tableId}
        radius={size.width / 2}
        fill={fill}
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
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

import type { RoomObject, Table } from "@seating/shared";
import { CHAIR_CLEARANCE, roomObjectBounds, tableBounds } from "@seating/shared";
import { Rect } from "react-konva";

/** Space between the item (chairs included) and its focus ring. */
const RING_PAD = 8;

interface KeyboardFocusRingProps {
  item: Table | RoomObject;
  /** Plan units per screen pixel, so the ring keeps a 2px line at any zoom. */
  scale: number;
}

/** The visible keyboard-focus ring around the table or room object that Tab
 * moved to (the canvas's own stand-in for a focus outline). */
export function KeyboardFocusRing({ item, scale }: KeyboardFocusRingProps): JSX.Element {
  const isTable = "seats" in item;
  const bounds = isTable ? tableBounds(item) : roomObjectBounds(item);
  const pad = RING_PAD + (isTable && item.shape !== "row" ? CHAIR_CLEARANCE : 0);
  return (
    <Rect
      name="keyboard-focus"
      x={bounds.minX - pad}
      y={bounds.minY - pad}
      width={bounds.maxX - bounds.minX + pad * 2}
      height={bounds.maxY - bounds.minY + pad * 2}
      cornerRadius={8 / scale}
      stroke="#2563eb"
      strokeWidth={2 / scale}
      dash={[6 / scale, 4 / scale]}
      listening={false}
    />
  );
}

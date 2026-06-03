import type { Point } from "@seating/shared";
import { CHAIR_RADIUS } from "@seating/shared";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Circle, Group, Text } from "react-konva";

/** Visual info for a guest occupying this seat, if any. */
export interface SeatOccupant {
  initials: string;
  color: string;
  /** The seated guest has declined — shown with a red ring and dimmed chair. */
  declined: boolean;
}

interface ChairNodeProps {
  seatId: string;
  offset: Point;
  /** When true (custom mode + selected table), the chair can be dragged. */
  editable: boolean;
  occupant: SeatOccupant | null;
  tableRotation: number;
  onMove: (offset: Point) => void;
  onSeatClick: (seatId: string) => void;
}

/**
 * A single chair, positioned relative to its table's center. Shows the seated
 * guest's initials when occupied, can be dragged to reposition in custom mode,
 * and reports clicks for click-to-assign.
 */
export function ChairNode({
  seatId,
  offset,
  editable,
  occupant,
  tableRotation,
  onMove,
  onSeatClick,
}: ChairNodeProps): JSX.Element {
  const stopBubble = (event: KonvaEventObject<DragEvent>): void => {
    event.cancelBubble = true;
  };

  const handleDragEnd = (event: KonvaEventObject<DragEvent>): void => {
    event.cancelBubble = true;
    const node = event.target as Konva.Group;
    onMove({ x: node.x(), y: node.y() });
  };

  const handleClick = (event: KonvaEventObject<MouseEvent>): void => {
    event.cancelBubble = true;
    onSeatClick(seatId);
  };

  const declined = occupant?.declined ?? false;
  const fill = occupant ? occupant.color : editable ? "#fde68a" : "#e2e8f0";
  const stroke = declined ? "#dc2626" : occupant ? "#1e293b" : editable ? "#d97706" : "#94a3b8";

  return (
    <Group
      x={offset.x}
      y={offset.y}
      // Dim declined guests so they read as "not attending" on the map.
      opacity={declined ? 0.6 : 1}
      draggable={editable}
      onDragStart={stopBubble}
      onDragMove={stopBubble}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      <Circle
        seatId={seatId}
        radius={CHAIR_RADIUS}
        fill={fill}
        stroke={stroke}
        strokeWidth={declined ? 2.5 : 1.5}
      />
      {occupant && (
        <Text
          text={occupant.initials}
          fontSize={9}
          fontStyle="700"
          fill="#ffffff"
          width={CHAIR_RADIUS * 2}
          height={CHAIR_RADIUS * 2}
          offsetX={CHAIR_RADIUS}
          offsetY={CHAIR_RADIUS}
          align="center"
          verticalAlign="middle"
          listening={false}
          rotation={tableRotation != 0 ? -tableRotation : 0}
        />
      )}
    </Group>
  );
}

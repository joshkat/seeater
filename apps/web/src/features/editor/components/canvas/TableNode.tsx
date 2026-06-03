import type { Point, Size, Table } from "@seating/shared";
import { resolveSeatPositions } from "@seating/shared";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group, Text } from "react-konva";

import { resolveSnap } from "../../geometry/snapping";
import { clampTablePosition } from "../../geometry/viewport";
import { tableDisplayName } from "../../lib/tableLabel";
import type { AlignmentGuide } from "../../types";
import { ChairNode, type SeatOccupant } from "./ChairNode";
import { TableShapeNode } from "./TableShapeNode";

/** Smallest allowed table dimension after a resize. */
const MIN_SIZE = 40;

interface TableNodeProps {
  table: Table;
  selected: boolean;
  /** 1-based position used for the auto "Table N" name when unlabeled. */
  tableNumber: number;
  /** Floor-plan canvas size, used to clamp the table inside bounds. */
  dimensions: Size;
  /** Snap threshold in floor-plan units (screen px / scale). */
  threshold: number;
  otherCenters: Point[];
  /** Occupancy info keyed by seat id, for rendering seated guests. */
  occupants: Map<string, SeatOccupant>;
  onSelect: (id: string, additive: boolean) => void;
  onTransform: (id: string, patch: { position?: Point; size?: Size; rotation?: number }) => void;
  onSeatMove: (id: string, seatIndex: number, offset: Point) => void;
  onSeatClick: (seatId: string) => void;
  onGuides: (guides: AlignmentGuide[]) => void;
  registerNode: (id: string, node: Konva.Group | null) => void;
}

export function TableNode({
  table,
  selected,
  tableNumber,
  dimensions,
  threshold,
  otherCenters,
  occupants,
  onSelect,
  onTransform,
  onSeatMove,
  onSeatClick,
  onGuides,
  registerNode,
}: TableNodeProps): JSX.Element {
  const seats = [...table.seats].sort((a, b) => a.index - b.index);
  const seatPositions = resolveSeatPositions(table);
  const chairsEditable = selected && table.chairLayoutMode === "custom";

  const handleSelect = (event: KonvaEventObject<MouseEvent>): void => {
    event.cancelBubble = true;
    onSelect(table.id, event.evt.shiftKey);
  };

  const handleDragMove = (event: KonvaEventObject<DragEvent>): void => {
    const node = event.target as Konva.Group;
    // Clamp before snapping so the table can never be dragged out of bounds.
    const clamped = clampTablePosition({ x: node.x(), y: node.y() }, table.size, dimensions);
    const snapped = resolveSnap({ position: clamped, otherCenters, threshold });
    node.position(snapped.position);
    onGuides(snapped.guides);
  };

  const handleDragEnd = (event: KonvaEventObject<DragEvent>): void => {
    const node = event.target as Konva.Group;
    const pos = clampTablePosition({ x: node.x(), y: node.y() }, table.size, dimensions);
    onTransform(table.id, { position: pos });
    onGuides([]);
  };

  const handleTransformEnd = (event: KonvaEventObject<Event>): void => {
    const node = event.target as Konva.Group;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    let width = Math.max(MIN_SIZE, table.size.width * scaleX);
    let height = Math.max(MIN_SIZE, table.size.height * scaleY);
    if (table.shape === "round") {
      const diameter = Math.max(width, height);
      width = diameter;
      height = diameter;
    }

    const pos = clampTablePosition({ x: node.x(), y: node.y() }, { width, height }, dimensions);
    onTransform(table.id, { position: pos, size: { width, height }, rotation: node.rotation() });
  };

  return (
    <Group
      ref={(node) => registerNode(table.id, node)}
      x={table.position.x}
      y={table.position.y}
      rotation={table.rotation}
      draggable
      onClick={handleSelect}
      onTap={handleSelect}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      <TableShapeNode
        tableId={table.id}
        shape={table.shape}
        size={table.size}
        selected={selected}
      />

      {seats.map((seat, index) => (
        <ChairNode
          key={seat.id}
          seatId={seat.id}
          offset={seatPositions[index] ?? { x: 0, y: 0 }}
          editable={chairsEditable}
          occupant={occupants.get(seat.id) ?? null}
          onMove={(offset) => onSeatMove(table.id, seat.index, offset)}
          onSeatClick={onSeatClick}
          tableRotation={table.rotation}
        />
      ))}

      <Text
        text={tableDisplayName(table.label, tableNumber - 1)}
        fontSize={14}
        fontStyle="600"
        fill="#0f172a"
        width={140}
        offsetX={70}
        offsetY={7}
        align="center"
        listening={false}
        rotation={table.rotation != 0 ? -table.rotation : 0}
      />
    </Group>
  );
}

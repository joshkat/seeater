import type { Point, RoomObject, RoomObjectPatch, Size } from "@seating/shared";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Arc, Group, Rect, Text } from "react-konva";

import { clampTablePosition } from "../../geometry/viewport";
import { ROOM_OBJECT_STYLE } from "../../lib/roomObjectStyle";

interface RoomObjectNodeProps {
  object: RoomObject;
  selected: boolean;
  dimensions: Size;
  onSelect: (id: string, additive: boolean) => void;
  onChange: (id: string, patch: RoomObjectPatch) => void;
  registerNode: (id: string, node: Konva.Group | null) => void;
}

/** A dance floor, stage, wall, label… on the canvas: drag, resize, rotate. */
export function RoomObjectNode({
  object,
  selected,
  dimensions,
  onSelect,
  onChange,
  registerNode,
}: RoomObjectNodeProps): JSX.Element {
  const style = ROOM_OBJECT_STYLE[object.kind];
  const { width, height } = object.size;
  const isLabel = object.kind === "label";

  const select = (event: KonvaEventObject<MouseEvent | TouchEvent>): void => {
    event.cancelBubble = true;
    onSelect(object.id, event.evt.shiftKey);
  };

  const clamp = (point: Point): Point => clampTablePosition(point, object.size, dimensions);

  return (
    <Group
      ref={(node) => registerNode(object.id, node)}
      x={object.position.x}
      y={object.position.y}
      rotation={object.rotation}
      draggable
      onClick={select}
      onTap={select}
      onDragMove={(event) => {
        const node = event.target as Konva.Group;
        node.position(clamp(node.position()));
      }}
      onDragEnd={(event) => {
        const node = event.target as Konva.Group;
        onChange(object.id, { position: clamp(node.position()) });
      }}
      onTransformEnd={(event) => {
        const node = event.target as Konva.Group;
        const size = { width: width * node.scaleX(), height: height * node.scaleY() };
        node.scaleX(1);
        node.scaleY(1);
        onChange(object.id, { position: clamp(node.position()), size, rotation: node.rotation() });
      }}
    >
      <Rect
        width={width}
        height={height}
        offsetX={width / 2}
        offsetY={height / 2}
        cornerRadius={object.kind === "wall" || object.kind === "door" ? 0 : 6}
        fill={style.fill}
        stroke={selected ? "#2563eb" : isLabel ? "rgba(148,163,184,0.6)" : style.stroke}
        strokeWidth={selected ? 2.5 : 1.5}
        dash={object.kind === "area" || isLabel ? [6, 4] : undefined}
      />
      {object.kind === "door" && (
        <Arc
          x={-width / 2}
          y={height / 2}
          innerRadius={0}
          outerRadius={width}
          angle={90}
          rotation={-90}
          stroke={style.stroke}
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      )}
      {object.kind !== "wall" && (
        <Text
          text={object.label}
          width={width}
          offsetX={width / 2}
          offsetY={isLabel ? height * 0.3 : 8}
          fontSize={isLabel ? Math.max(10, height * 0.6) : 14}
          fontStyle={isLabel ? "600" : "500"}
          fill={style.text}
          align="center"
          listening={false}
          rotation={object.rotation !== 0 ? -object.rotation : 0}
        />
      )}
    </Group>
  );
}

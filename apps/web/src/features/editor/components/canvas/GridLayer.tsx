import type { Size } from "@seating/shared";
import { GRID_SIZE } from "@seating/shared";
import { Layer, Line, Rect } from "react-konva";

interface GridLayerProps {
  dimensions: Size;
}

/**
 * Non-interactive background: the floor-plan area plus a light grid. Rendered
 * with listening disabled so clicks fall through to the stage (for deselect).
 */
export function GridLayer({ dimensions }: GridLayerProps): JSX.Element {
  const { width, height } = dimensions;
  const verticals: number[] = [];
  for (let x = GRID_SIZE; x < width; x += GRID_SIZE) verticals.push(x);
  const horizontals: number[] = [];
  for (let y = GRID_SIZE; y < height; y += GRID_SIZE) horizontals.push(y);

  return (
    <Layer listening={false}>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#ffffff"
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      {verticals.map((x) => (
        <Line
          name="grid-line"
          key={`v-${x}`}
          points={[x, 0, x, height]}
          stroke="#eef2f7"
          strokeWidth={1}
        />
      ))}
      {horizontals.map((y) => (
        <Line
          name="grid-line"
          key={`h-${y}`}
          points={[0, y, width, y]}
          stroke="#eef2f7"
          strokeWidth={1}
        />
      ))}
    </Layer>
  );
}

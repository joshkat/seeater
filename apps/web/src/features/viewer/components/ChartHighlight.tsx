import type { ChartScene } from "../../export/lib/chartScene";

interface ChartHighlightProps {
  scene: ChartScene;
  tableId: string;
  seatId: string | null;
}

/** Rings the picked guest's table and chair on the chart (plan units). */
export function ChartHighlight({
  scene,
  tableId,
  seatId,
}: ChartHighlightProps): JSX.Element | null {
  const table = scene.tables.find((candidate) => candidate.id === tableId);
  if (!table) return null;
  const chair = seatId ? scene.chairs.find((candidate) => candidate.seatId === seatId) : undefined;
  // Clear of the chairs around the table.
  const gap = scene.chairRadius * 3;
  return (
    <g data-testid="chart-highlight" pointerEvents="none">
      <g
        transform={`translate(${table.center.x} ${table.center.y}) rotate(${table.rotation})`}
        className="fill-primary/10 stroke-primary motion-safe:animate-pulse"
      >
        {table.shape === "round" ? (
          <circle r={table.width / 2 + gap} strokeWidth={4} vectorEffect="non-scaling-stroke" />
        ) : (
          <rect
            x={-table.width / 2 - gap}
            y={-table.height / 2 - gap}
            width={table.width + 2 * gap}
            height={table.height + 2 * gap}
            rx={gap}
            strokeWidth={4}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </g>
      {chair && (
        <circle
          cx={chair.center.x}
          cy={chair.center.y}
          r={scene.chairRadius + 4}
          className="fill-primary/50 stroke-primary"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}

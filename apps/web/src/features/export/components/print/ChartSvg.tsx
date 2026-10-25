import { ROOM_OBJECT_STYLE } from "../../../editor/lib/roomObjectStyle";
import type { ChartScene } from "../../lib/chartScene";

interface ChartSvgProps {
  scene: ChartScene;
  /** For the accessible name, e.g. "Seating chart — Reception". */
  label: string;
}

/**
 * The printed floor plan, drawn as vector SVG from the layout (not a canvas
 * screenshot): crisp at any size, any layout, and text sized to print at a
 * readable minimum (see chartScene).
 */
export function ChartSvg({ scene, label }: ChartSvgProps): JSX.Element {
  const { bounds, chairRadius, tableFont, nameFont } = scene;
  const line = Math.max(1, tableFont / 12);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      overflow="visible"
      className="h-auto max-h-[8in] w-full"
    >
      {scene.objects.map((object) => {
        const style = ROOM_OBJECT_STYLE[object.kind];
        return (
          <g
            key={object.id}
            transform={`translate(${object.center.x} ${object.center.y}) rotate(${object.rotation})`}
          >
            <rect
              x={-object.width / 2}
              y={-object.height / 2}
              width={object.width}
              height={object.height}
              rx={object.kind === "wall" || object.kind === "door" ? 0 : 6}
              fill={style.fill}
              stroke={object.kind === "label" ? "none" : style.stroke}
              strokeWidth={line}
              strokeDasharray={object.kind === "area" ? `${line * 4} ${line * 3}` : undefined}
            />
            {object.kind !== "wall" && object.label && (
              <text
                transform={`rotate(${-object.rotation})`}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={tableFont}
                fontWeight={600}
                fill={style.text}
              >
                {object.label}
              </text>
            )}
          </g>
        );
      })}

      {scene.tables.map((table) => (
        <g
          key={table.id}
          transform={`translate(${table.center.x} ${table.center.y}) rotate(${table.rotation})`}
        >
          {table.shape === "round" ? (
            <circle
              r={table.width / 2}
              className="fill-white stroke-neutral-600"
              strokeWidth={line}
            />
          ) : (
            <rect
              x={-table.width / 2}
              y={-table.height / 2}
              width={table.width}
              height={table.height}
              rx={table.shape === "row" ? table.height / 2 : 4}
              className={
                table.shape === "row"
                  ? "fill-none stroke-neutral-300"
                  : "fill-white stroke-neutral-600"
              }
              strokeWidth={line}
            />
          )}
        </g>
      ))}

      {scene.chairs.map((chair) => (
        <circle
          key={chair.seatId}
          cx={chair.center.x}
          cy={chair.center.y}
          r={chairRadius}
          fill={chair.fill ?? undefined}
          className={
            chair.fill
              ? "stroke-neutral-700"
              : chair.occupied
                ? "fill-neutral-400 stroke-neutral-700"
                : "fill-white stroke-neutral-500"
          }
          strokeWidth={line}
        />
      ))}

      {scene.chairs.map(
        (chair) =>
          chair.name && (
            <text
              key={`name-${chair.seatId}`}
              transform={`translate(${chair.nameAt.x} ${chair.nameAt.y}) rotate(${chair.nameAngle})`}
              textAnchor={chair.nameFlipped ? "end" : "start"}
              dominantBaseline="central"
              fontSize={nameFont}
              className="fill-neutral-900"
            >
              {chair.name}
            </text>
          ),
      )}

      {/* Table names last, haloed, so nothing draws over them. */}
      {scene.tables.map((table) => (
        <text
          key={`label-${table.id}`}
          x={table.label.x}
          y={table.label.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={tableFont}
          fontWeight={700}
          stroke="white"
          strokeWidth={tableFont / 4}
          paintOrder="stroke"
          className="fill-neutral-900"
        >
          {table.name}
        </text>
      ))}
    </svg>
  );
}

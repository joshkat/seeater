import type { Table } from "@seating/shared";
import { resolveSeatPositions } from "@seating/shared";

/** Chair radius in the preview, in viewBox units (rendered ~1:1 to px or larger). */
export const PREVIEW_CHAIR_RADIUS = 22;
/** Room for a name beyond each chair. */
const LABEL_GAP = 10;
const LABEL_ROOM = 70;

export interface PreviewChair {
  seatId: string;
  /** 1-based seat number. */
  number: number;
  x: number;
  y: number;
  /** Where the name label goes (just outside the chair, away from the table). */
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "middle" | "end";
}

export interface PreviewLayout {
  chairs: PreviewChair[];
  table: { shape: Table["shape"]; width: number; height: number; rotation: number };
  viewBox: string;
}

function rotate(point: { x: number; y: number }, degrees: number): { x: number; y: number } {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

/**
 * Lays out a table for the placement preview: the real chair arrangement
 * (rotation included), spread out uniformly when chairs are close together so
 * each one is a comfortable tap target.
 */
export function previewLayout(table: Table): PreviewLayout {
  const seats = [...table.seats].sort((a, b) => a.index - b.index);
  const raw = resolveSeatPositions(table).map((p) => rotate(p, table.rotation));

  let minDistance = Infinity;
  for (let i = 0; i < raw.length; i += 1) {
    for (let j = i + 1; j < raw.length; j += 1) {
      minDistance = Math.min(minDistance, Math.hypot(raw[i].x - raw[j].x, raw[i].y - raw[j].y));
    }
  }
  const wanted = PREVIEW_CHAIR_RADIUS * 2.3;
  const scale =
    Number.isFinite(minDistance) && minDistance > 0 ? Math.max(1, wanted / minDistance) : 1;

  const chairs: PreviewChair[] = seats.map((seat, i) => {
    const x = (raw[i]?.x ?? 0) * scale;
    const y = (raw[i]?.y ?? 0) * scale;
    const length = Math.hypot(x, y) || 1;
    const out = PREVIEW_CHAIR_RADIUS + LABEL_GAP;
    const ux = x / length;
    const uy = y / length;
    return {
      seatId: seat.id,
      number: seat.index + 1,
      x,
      y,
      labelX: x + ux * out,
      labelY: y + uy * out,
      labelAnchor: ux > 0.35 ? "start" : ux < -0.35 ? "end" : "middle",
    };
  });

  const halfW = (table.size.width * scale) / 2;
  const halfH = (table.size.height * scale) / 2;
  const corners = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
    { x: halfW, y: -halfH },
  ].map((p) => rotate(p, table.rotation));
  const xs = [...chairs.map((c) => c.x), ...corners.map((c) => c.x)];
  const ys = [...chairs.map((c) => c.y), ...corners.map((c) => c.y)];
  const pad = PREVIEW_CHAIR_RADIUS + LABEL_GAP + LABEL_ROOM;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - PREVIEW_CHAIR_RADIUS - LABEL_GAP - 24;
  const maxY = Math.max(...ys) + PREVIEW_CHAIR_RADIUS + LABEL_GAP + 24;

  return {
    chairs,
    table: {
      shape: table.shape,
      width: table.size.width * scale,
      height: table.size.height * scale,
      rotation: table.rotation,
    },
    viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
  };
}

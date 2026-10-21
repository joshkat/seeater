import type { RoomObjectKind } from "@seating/shared";

/** How each room object kind is drawn on the canvas (Konva colours). */
export const ROOM_OBJECT_STYLE: Record<
  RoomObjectKind,
  { fill: string; stroke: string; text: string }
> = {
  "dance-floor": { fill: "#fdf2e3", stroke: "#d6a35c", text: "#92400e" },
  stage: { fill: "#f3e8ff", stroke: "#a78bfa", text: "#5b21b6" },
  bar: { fill: "#fef3c7", stroke: "#f59e0b", text: "#92400e" },
  buffet: { fill: "#ffedd5", stroke: "#fb923c", text: "#9a3412" },
  dj: { fill: "#e0e7ff", stroke: "#818cf8", text: "#3730a3" },
  door: { fill: "#dcfce7", stroke: "#22c55e", text: "#166534" },
  wall: { fill: "#334155", stroke: "#1e293b", text: "#ffffff" },
  label: { fill: "rgba(0,0,0,0)", stroke: "rgba(0,0,0,0)", text: "#0f172a" },
  area: { fill: "rgba(148,163,184,0.12)", stroke: "#94a3b8", text: "#475569" },
};

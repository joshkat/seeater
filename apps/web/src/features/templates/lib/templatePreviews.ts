import { type EventTemplate, createEventFromTemplate, layoutViews } from "@seating/shared";

import { type RoomShape, roomShapes } from "../../editor/lib/roomShapes";

/** What a template preview draws: its first layout's tables and room objects. */
export interface TemplateShapes {
  width: number;
  height: number;
  shapes: RoomShape[];
}

const cache = new Map<string, TemplateShapes>();

/** Builds (once) the shapes for a template's preview thumbnail. */
export function templateShapes(template: EventTemplate): TemplateShapes {
  const cached = cache.get(template.id);
  if (cached) return cached;
  const doc = createEventFromTemplate(template, "preview", "2026-01-01T00:00:00.000Z");
  const view = layoutViews(doc)[0];
  const result = {
    width: view.dimensions.width,
    height: view.dimensions.height,
    shapes: roomShapes(view.tables, view.objects),
  };
  cache.set(template.id, result);
  return result;
}

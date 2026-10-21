import { type EventTemplate, createEventFromTemplate, layoutViews } from "@seating/shared";

/** What a template preview draws: its first layout's tables and room objects. */
export interface TemplateShapes {
  width: number;
  height: number;
  shapes: {
    kind: "round" | "rect";
    x: number;
    y: number;
    w: number;
    h: number;
    rotation: number;
    object: boolean;
  }[];
}

const cache = new Map<string, TemplateShapes>();

/** Builds (once) the shapes for a template's preview thumbnail. */
export function templateShapes(template: EventTemplate): TemplateShapes {
  const cached = cache.get(template.id);
  if (cached) return cached;
  const doc = createEventFromTemplate(template, "preview", "2026-01-01T00:00:00.000Z");
  const view = layoutViews(doc)[0];
  const shapes: TemplateShapes["shapes"] = [
    ...view.objects.map((o) => ({
      kind: "rect" as const,
      x: o.position.x,
      y: o.position.y,
      w: o.size.width,
      h: o.size.height,
      rotation: o.rotation,
      object: true,
    })),
    ...view.tables.map((t) => ({
      kind: t.shape === "round" ? ("round" as const) : ("rect" as const),
      x: t.position.x,
      y: t.position.y,
      w: t.size.width,
      h: t.size.height,
      rotation: t.rotation,
      object: false,
    })),
  ];
  const result = { width: view.dimensions.width, height: view.dimensions.height, shapes };
  cache.set(template.id, result);
  return result;
}

import type { Guest } from "@seating/shared";

import { guestColor } from "../../guests/lib/guestDisplay";

/** What chair colours mean on the canvas. */
export type ChairColorMode = "guest" | "tag" | "meal" | "rsvp";

export const CHAIR_COLOR_MODES: { value: ChairColorMode; label: string }[] = [
  { value: "guest", label: "Guest" },
  { value: "tag", label: "Tag" },
  { value: "meal", label: "Meal" },
  { value: "rsvp", label: "RSVP" },
];

/** Distinct colours for categories (tags, meals), in a stable order. */
const CATEGORY_PALETTE = [
  "#2563eb",
  "#db2777",
  "#16a34a",
  "#ea580c",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#be123c",
  "#4f46e5",
  "#059669",
];
const NONE_COLOR = "#94a3b8";
const RSVP_COLORS = { accepted: "#16a34a", pending: "#64748b", declined: "#dc2626" } as const;
const RSVP_LABELS = { accepted: "Going", pending: "Pending", declined: "Declined" } as const;

export interface LegendEntry {
  label: string;
  color: string;
}

/** The category a guest falls into for a mode (null = guest mode, no category). */
function categoryOf(guest: Guest, mode: ChairColorMode): string | null {
  if (mode === "tag") return guest.tags[0] ?? "";
  if (mode === "meal") return guest.meal ?? "";
  if (mode === "rsvp") return guest.rsvpStatus;
  return null;
}

/**
 * Colours for each category in use, assigned in sorted order so the same
 * set of values always gets the same colours (and there are no collisions
 * until the palette runs out).
 */
export function categoryColors(guests: Guest[], mode: ChairColorMode): Map<string, string> {
  const colors = new Map<string, string>();
  if (mode === "guest") return colors;
  if (mode === "rsvp") {
    for (const [status, color] of Object.entries(RSVP_COLORS)) colors.set(status, color);
    return colors;
  }
  const values = [...new Set(guests.map((guest) => categoryOf(guest, mode) ?? ""))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  values.forEach((value, index) =>
    colors.set(value, CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]),
  );
  colors.set("", NONE_COLOR);
  return colors;
}

/** A seated guest's chair colour under a mode. */
export function chairColor(
  guest: Guest,
  mode: ChairColorMode,
  colors: Map<string, string>,
): string {
  const category = categoryOf(guest, mode);
  if (category === null) return guestColor(guest.id);
  return colors.get(category) ?? NONE_COLOR;
}

/** The legend for a mode, for the guests shown (empty in guest mode). */
export function legendFor(guests: Guest[], mode: ChairColorMode): LegendEntry[] {
  if (mode === "guest") return [];
  const colors = categoryColors(guests, mode);
  const used = new Set(guests.map((guest) => categoryOf(guest, mode) ?? ""));
  const none = mode === "tag" ? "No tag" : "No meal";
  return [...colors.entries()]
    .filter(([value]) => used.has(value))
    .map(([value, color]) => ({
      label:
        mode === "rsvp"
          ? RSVP_LABELS[value as keyof typeof RSVP_LABELS]
          : value === ""
            ? none
            : value,
      color,
    }));
}

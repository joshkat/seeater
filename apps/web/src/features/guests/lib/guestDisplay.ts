import type { Guest } from "@seating/shared";

/** Up to two uppercase initials from a guest's name (e.g. "Ada Lovelace" -> "AL"). */
export function guestInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Builds a seatId -> guest lookup for occupancy rendering and hit responses. */
export function bySeatId(guests: Guest[]): Map<string, Guest> {
  const map = new Map<string, Guest>();
  for (const guest of guests) {
    if (guest.seatId) map.set(guest.seatId, guest);
  }
  return map;
}

/** Stable color for a guest chip, derived from their id. */
export function guestColor(id: string): string {
  const palette = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#ca8a04"];
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

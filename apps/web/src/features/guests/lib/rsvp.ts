import type { RsvpStatus } from "@seating/shared";

export interface RsvpMeta {
  label: string;
  /** Compact glyph shown on the status toggle. */
  symbol: string;
  color: string;
  background: string;
}

const META: Record<RsvpStatus, RsvpMeta> = {
  pending: { label: "Pending", symbol: "?", color: "#64748b", background: "#f1f5f9" },
  accepted: { label: "Going", symbol: "✓", color: "#16a34a", background: "#dcfce7" },
  declined: { label: "Declined", symbol: "✗", color: "#dc2626", background: "#fee2e2" },
};

export function rsvpMeta(status: RsvpStatus): RsvpMeta {
  return META[status];
}

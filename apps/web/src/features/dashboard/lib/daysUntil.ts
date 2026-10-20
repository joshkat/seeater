const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from now until an ISO time (never below 0; rounds up). */
export function daysUntil(iso: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(iso) - now) / DAY_MS));
}

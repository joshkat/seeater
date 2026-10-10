/**
 * Column widths shared by the guest list's header row and its rows, so the
 * "RSVP" label sits over the RSVP controls. Keep these as literal class
 * strings (Tailwind scans for them).
 */
export const GUEST_COLUMNS = {
  select: "w-9",
  rsvp: "w-[116px]",
  actions: "w-[60px]",
} as const;

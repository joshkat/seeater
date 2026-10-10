/**
 * Column widths shared by the guest list's header row and its rows, so the
 * "RSVP" label sits over the RSVP controls. Keep these as literal class
 * strings (Tailwind scans for them).
 */
export const GUEST_COLUMNS = {
  // Wider on touch screens, where every button is a 44px target.
  select: "w-9 pointer-coarse:w-11",
  rsvp: "w-[116px] pointer-coarse:w-[156px]",
  actions: "w-[60px] pointer-coarse:w-[88px]",
} as const;

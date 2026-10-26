function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Where Paste lives in the current layout, and the shortcut to mention (none
 * on touch screens). */
export interface PasteHint {
  /** "toolbar": a Paste button; "menu": Select ▾ → Paste. */
  where: "toolbar" | "menu";
  /** The paste shortcut (e.g. "⌘V"), or null when there's no keyboard. */
  shortcut: string | null;
}

/** "Copied 11 tables and 4 room items. Paste with ⌘V or Paste in the toolbar." */
export function copiedNotice(tables: number, objects: number, hint: PasteHint): string {
  const parts = [
    tables > 0 ? plural(tables, "table") : null,
    objects > 0 ? plural(objects, "room item") : null,
  ].filter((part): part is string => part !== null);
  const control = hint.where === "toolbar" ? "Paste in the toolbar" : "Select ▾ → Paste";
  const how = hint.shortcut
    ? `Paste with ${hint.shortcut} or ${control}.`
    : `Paste from ${control}.`;
  return `Copied ${parts.join(" and ")}. ${how}`;
}

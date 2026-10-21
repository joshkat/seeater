import { applySeatPlan, type SeatPlanEntry } from "./guestOps.js";
import type { EventDoc } from "./schema.js";

/**
 * Auto-seat: puts guests without a seat into open seats in one edit.
 * Households and "keep together" rules stay at one table; "keep apart"
 * partners are kept off each other's tables where possible; with
 * `groupByTag`, guests sharing a first tag (e.g. "Work") fill tables together.
 * Declined guests are left out.
 */

export interface AutoSeatOptions {
  /** Only these guests (default: everyone without a seat). */
  guestIds?: string[];
  groupByTag?: boolean;
}

export interface AutoSeatResult {
  doc: EventDoc;
  seatedIds: string[];
  /** Guests (whole groups) that no table had room for. */
  unplacedIds: string[];
}

/** Minimal union-find over guest ids. */
function groupsOf(ids: string[], links: string[][]): string[][] {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  for (const link of links) {
    const members = link.filter((id) => parent.has(id));
    for (let i = 1; i < members.length; i += 1) parent.set(find(members[i]), find(members[0]));
  }
  const groups = new Map<string, string[]>();
  for (const id of ids) groups.set(find(id), [...(groups.get(find(id)) ?? []), id]);
  return [...groups.values()];
}

export function autoSeat(doc: EventDoc, options: AutoSeatOptions = {}): AutoSeatResult {
  const byId = new Map(doc.guests.map((guest) => [guest.id, guest]));
  const wanted = options.guestIds ? new Set(options.guestIds) : null;
  const candidates = doc.guests
    .filter((guest) => !guest.seatId && guest.rsvpStatus !== "declined")
    .filter((guest) => !wanted || wanted.has(guest.id))
    .map((guest) => guest.id);

  // Groups: households + "together" rules, merged.
  const householdLinks = [...new Set(doc.guests.map((g) => g.householdId).filter(Boolean))].map(
    (householdId) => doc.guests.filter((g) => g.householdId === householdId).map((g) => g.id),
  );
  const togetherLinks = doc.rules.filter((r) => r.kind === "together").map((r) => r.guestIds);
  const tagOf = (group: string[]): string => byId.get(group[0])?.tags[0] ?? "";
  const groups = groupsOf(candidates, [...householdLinks, ...togetherLinks]).sort((a, b) => {
    if (options.groupByTag) {
      const byTag = tagOf(a).localeCompare(tagOf(b));
      if (byTag !== 0) return tagOf(a) === "" ? 1 : tagOf(b) === "" ? -1 : byTag;
    }
    return b.length - a.length;
  });

  // Who to avoid: apart partners.
  const avoid = new Map<string, Set<string>>();
  for (const rule of doc.rules.filter((r) => r.kind === "apart")) {
    for (const a of rule.guestIds) {
      const set = avoid.get(a) ?? new Set<string>();
      for (const b of rule.guestIds) if (b !== a) set.add(b);
      avoid.set(a, set);
    }
  }
  const togetherPartners = new Map<string, Set<string>>();
  for (const link of togetherLinks) {
    for (const a of link) {
      const set = togetherPartners.get(a) ?? new Set<string>();
      for (const b of link) if (b !== a) set.add(b);
      togetherPartners.set(a, set);
    }
  }

  // Table state: open seats (in order) and who sits there.
  const occupantOfSeat = new Map(
    doc.guests.filter((g) => g.seatId).map((g) => [g.seatId as string, g.id]),
  );
  const tables = doc.tables.map((table) => ({
    id: table.id,
    open: table.seats.filter((seat) => !occupantOfSeat.has(seat.id)).map((seat) => seat.id),
    guests: new Set(
      table.seats.map((seat) => occupantOfSeat.get(seat.id)).filter((id): id is string => !!id),
    ),
  }));

  const plan: SeatPlanEntry[] = [];
  const seatedIds: string[] = [];
  const unplacedIds: string[] = [];
  for (const group of groups) {
    const groupTag = options.groupByTag ? tagOf(group) : "";
    let best: (typeof tables)[number] | null = null;
    let bestScore = -Infinity;
    for (const table of tables) {
      if (table.open.length < group.length) continue;
      const seatedHere = [...table.guests];
      if (group.some((id) => seatedHere.some((other) => avoid.get(id)?.has(other)))) continue;
      let score = 0;
      if (group.some((id) => seatedHere.some((other) => togetherPartners.get(id)?.has(other))))
        score += 10;
      if (groupTag) {
        const tags = seatedHere.map((other) => byId.get(other)?.tags[0] ?? "");
        if (tags.includes(groupTag)) score += 5;
        // Don't mix groups when grouping by tag: another tag's table is a last resort.
        if (tags.some((tag) => tag !== "" && tag !== groupTag)) score -= 5;
      }
      // Prefer filling a started table over opening a fresh one (fewer half-empty tables).
      if (seatedHere.length > 0) score += 1;
      if (score > bestScore) {
        best = table;
        bestScore = score;
      }
    }
    if (!best) {
      unplacedIds.push(...group);
      continue;
    }
    for (const guestId of group) {
      const seatId = best.open.shift()!;
      plan.push({ guestId, seatId });
      best.guests.add(guestId);
      seatedIds.push(guestId);
    }
  }
  return { doc: plan.length > 0 ? applySeatPlan(doc, plan) : doc, seatedIds, unplacedIds };
}

import type { KeyboardEvent } from "react";

import { GUEST_TABS, type GuestTab } from "../lib/guestTabs";

interface GuestTabsProps {
  tab: GuestTab;
  counts: Record<GuestTab, number>;
  onChange: (tab: GuestTab) => void;
}

/** "To seat 5 · Seated 39 · All 46": which guests the list shows. Seating
 * someone moves them out of "To seat", so that tab is the work left to do. */
export function GuestTabs({ tab, counts, onChange }: GuestTabsProps): JSX.Element {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const index = GUEST_TABS.findIndex((item) => item.tab === tab);
    const last = GUEST_TABS.length - 1;
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % GUEST_TABS.length
        : event.key === "ArrowLeft"
          ? (index + last) % GUEST_TABS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    // Arrow keys aren't a table nudge while the tabs have focus.
    event.stopPropagation();
    onChange(GUEST_TABS[next].tab);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Which guests to list"
      onKeyDown={onKeyDown}
      className="grid shrink-0 grid-cols-3 gap-1 rounded-box bg-base-200 p-1"
    >
      {GUEST_TABS.map((item) => {
        const active = item.tab === tab;
        return (
          <button
            key={item.tab}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.tab)}
            className={`flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-field px-2 py-1 text-[13px] pointer-coarse:min-h-11 ${
              active
                ? "bg-base-100 font-semibold text-base-content shadow-sm"
                : "text-base-content/70 hover:text-base-content"
            }`}
          >
            <span className="truncate">{item.label}</span>
            <span
              className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                active && item.tab === "toSeat" && counts.toSeat > 0
                  ? "bg-primary text-primary-content"
                  : "bg-base-300 text-base-content"
              }`}
            >
              {counts[item.tab]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

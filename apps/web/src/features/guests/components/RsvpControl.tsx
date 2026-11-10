import type { RsvpStatus } from "@seating/shared";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { PHONE_QUERY, useMediaQuery } from "../../../lib/useMediaQuery";
import { rsvpMeta } from "../lib/rsvp";

interface RsvpControlProps {
  status: RsvpStatus;
  onChange: (status: RsvpStatus) => void;
  /** Whose RSVP this is, for screen readers ("RSVP for Grace Hopper"). */
  guestName: string;
}

/** Option order, left to right (and for the arrow keys). */
const OPTIONS: { status: RsvpStatus; glyph: string; label: string; activeClass: string }[] = [
  { status: "pending", glyph: "Pending", label: "Pending", activeClass: "btn-active" },
  { status: "accepted", glyph: "✓", label: "Going", activeClass: "btn-success" },
  { status: "declined", glyph: "✗", label: "Declined", activeClass: "btn-error" },
];

const BADGE_TONE: Record<RsvpStatus, string> = {
  pending: "badge-neutral",
  accepted: "badge-success text-success-strong",
  declined: "badge-error text-error-strong",
};

/**
 * Segmented RSVP control, a radio group: [Pending] [✓] [✗]. Once Going or
 * Declined is chosen it collapses to a single coloured badge that re-expands
 * on hover, focus or tap so the choice can be changed. On phones Pending
 * collapses too, so the badge fits on the name's line.
 *
 * Keyboard: Tab reaches the checked option; the arrow keys (and Home/End)
 * move and choose, as in any radio group.
 */
export function RsvpControl({ status, onChange, guestName }: RsvpControlProps): JSX.Element {
  const [hovered, setHovered] = useState(false);
  const phone = useMediaQuery(PHONE_QUERY);
  const expanded = (status === "pending" && !phone) || hovered;
  const groupRef = useRef<HTMLDivElement>(null);
  // Tabbing onto the badge expands it; move focus onto the checked option so
  // it isn't lost when the badge goes away.
  const focusOnExpand = useRef(false);
  // After a pick the badge appears under the still pointer, and the browser
  // reports that as the pointer entering it. Don't re-open for that.
  const pickedAt = useRef(0);
  useEffect(() => {
    if (!expanded || !focusOnExpand.current) return;
    focusOnExpand.current = false;
    groupRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [expanded]);

  // Collapsed: a single soft badge for the chosen status.
  if (!expanded) {
    const meta = rsvpMeta(status);
    return (
      <button
        type="button"
        onMouseEnter={(event) => {
          if (event.timeStamp - pickedAt.current > 500) setHovered(true);
        }}
        // The pointer can leave before the expanded group has rendered.
        onMouseLeave={() => setHovered(false)}
        onFocus={() => {
          focusOnExpand.current = true;
          setHovered(true);
        }}
        onClick={(event) => {
          // Tap (touch has no hover, and iOS doesn't focus on tap) opens it too.
          event.stopPropagation();
          setHovered(true);
        }}
        title={`RSVP: ${meta.label} — hover or tap to change`}
        aria-label={`RSVP for ${guestName}: ${meta.label}. Change`}
        className={`badge badge-soft badge-sm ${BADGE_TONE[status]} shrink-0 cursor-pointer gap-1 border-none font-medium pointer-coarse:min-h-11`}
      >
        {status !== "pending" && <span aria-hidden>{meta.symbol}</span>}
        {meta.label}
      </button>
    );
  }

  // Picking with the pointer collapses it again (needed on touch, where
  // there's no mouse leave). The keyboard keeps it open while focus is inside.
  const choose = (next: RsvpStatus, at: number): void => {
    pickedAt.current = at;
    setHovered(false);
    onChange(next);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const index = OPTIONS.findIndex((option) => option.status === status);
    const last = OPTIONS.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? (index + 1) % OPTIONS.length
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? (index + last) % OPTIONS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    onChange(OPTIONS[next].status);
    groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  };

  // Expanded: the three-option segmented control.
  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={`RSVP for ${guestName}`}
      onMouseLeave={() => setHovered(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(false);
      }}
      onKeyDown={onKeyDown}
      className="join shrink-0 text-base-content"
    >
      {OPTIONS.map((option) => {
        const checked = status === option.status;
        return (
          <button
            key={option.status}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.label}
            tabIndex={checked ? 0 : -1}
            title={option.label}
            onClick={(event) => {
              event.stopPropagation();
              choose(option.status, event.timeStamp);
            }}
            className={`btn join-item btn-xs ${checked ? option.activeClass : "btn-ghost"}`}
          >
            {option.glyph}
          </button>
        );
      })}
    </div>
  );
}

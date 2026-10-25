import type { RsvpStatus } from "@seating/shared";
import { useState } from "react";

import { rsvpMeta } from "../lib/rsvp";

interface RsvpControlProps {
  status: RsvpStatus;
  onChange: (status: RsvpStatus) => void;
}

/**
 * Segmented RSVP control. When pending it shows all three options
 * ([Pending] [✓] [✗]); choosing Going/Declined collapses it to a single
 * colored badge that re-expands on hover so the choice can be changed.
 */
export function RsvpControl({ status, onChange }: RsvpControlProps): JSX.Element {
  const [hovered, setHovered] = useState(false);
  const expanded = status === "pending" || hovered;

  // Collapsed: a single soft badge for the chosen status.
  if (!expanded) {
    const meta = rsvpMeta(status);
    const tone =
      status === "accepted" ? "badge-success text-success-strong" : "badge-error text-error-strong";
    return (
      <button
        type="button"
        onMouseEnter={() => setHovered(true)}
        onFocus={() => setHovered(true)}
        onClick={(event) => {
          // Tap (touch has no hover, and iOS doesn't focus on tap) opens it too.
          event.stopPropagation();
          setHovered(true);
        }}
        title={`RSVP: ${meta.label} — hover or tap to change`}
        className={`badge badge-soft outline ${tone} shrink-0 cursor-pointer gap-1 border-none font-semibold pointer-coarse:min-h-11`}
      >
        <span aria-hidden>{meta.symbol}</span>
        {meta.label}
      </button>
    );
  }

  // Picking collapses it again (needed on touch, where there's no mouse leave).
  const choose = (next: RsvpStatus): void => {
    setHovered(false);
    onChange(next);
  };

  // Expanded: the three-option segmented control.
  return (
    <div
      role="group"
      aria-label="RSVP status"
      onMouseLeave={() => setHovered(false)}
      className="join shrink-0 text-base-content"
    >
      <Segment
        label="Pending"
        active={status === "pending"}
        activeClass="btn-active"
        onClick={() => choose("pending")}
      />
      <Segment
        label="✓"
        title="Going"
        active={status === "accepted"}
        activeClass="btn-success"
        onClick={() => choose("accepted")}
      />
      <Segment
        label="✗"
        title="Declined"
        active={status === "declined"}
        activeClass="btn-error"
        onClick={() => choose("declined")}
      />
    </div>
  );
}

interface SegmentProps {
  label: string;
  title?: string;
  active: boolean;
  activeClass: string;
  onClick: () => void;
}

function Segment({ label, title, active, activeClass, onClick }: SegmentProps): JSX.Element {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`btn join-item btn-xs ${active ? activeClass : "btn-ghost"}`}
    >
      {label}
    </button>
  );
}

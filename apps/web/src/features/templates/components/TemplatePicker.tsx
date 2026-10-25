import { EVENT_TEMPLATES } from "@seating/shared";
import type { KeyboardEvent } from "react";

import { TemplatePreview } from "./TemplatePreview";

interface TemplatePickerProps {
  /** Selected template id, or null for a blank event. */
  value: string | null;
  onChange: (templateId: string | null) => void;
  /** Hide the "Blank" option (e.g. when applying to an existing event). */
  withBlank?: boolean;
}

/** Arrow keys step through the cards (wrapping); Home / End jump to the ends. */
const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * Cards for "start from": Blank and the starter templates. A radio group with
 * a roving tabindex: only the chosen card is a Tab stop, and the arrow keys
 * move both focus and the choice, as screen-reader users expect.
 */
export function TemplatePicker({
  value,
  onChange,
  withBlank = true,
}: TemplatePickerProps): JSX.Element {
  const options: (string | null)[] = [
    ...(withBlank ? [null] : []),
    ...EVENT_TEMPLATES.map((template) => template.id),
  ];
  const checkedIndex = Math.max(0, options.indexOf(value));

  const card = (selected: boolean): string =>
    `flex cursor-pointer flex-col gap-1 rounded-box border-2 p-2 text-left ${
      selected ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/50"
    }`;

  function handleKeyDown(event: KeyboardEvent): void {
    const last = options.length - 1;
    let next: number | null = null;
    if (event.key in STEPS) {
      next = (checkedIndex + STEPS[event.key] + options.length) % options.length;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    onChange(options[next]);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  }

  const radio = (index: number) => ({
    type: "button" as const,
    role: "radio",
    "aria-checked": index === options.indexOf(value),
    tabIndex: index === checkedIndex ? 0 : -1,
    className: card(index === options.indexOf(value)),
    onClick: () => onChange(options[index]),
  });

  return (
    <div
      role="radiogroup"
      aria-label="Start from"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      onKeyDown={handleKeyDown}
    >
      {withBlank && (
        <button {...radio(0)}>
          <span className="grid h-20 w-full place-items-center rounded-field bg-base-200 text-2xl text-base-content/30">
            +
          </span>
          <span className="text-sm font-semibold">Blank</span>
          <span className="text-xs text-base-content/60">An empty room</span>
        </button>
      )}
      {EVENT_TEMPLATES.map((template, index) => (
        <button key={template.id} {...radio(index + (withBlank ? 1 : 0))}>
          <TemplatePreview template={template} />
          <span className="text-sm font-semibold">{template.name}</span>
          <span className="text-xs text-base-content/60">{template.description}</span>
        </button>
      ))}
    </div>
  );
}

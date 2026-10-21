import { EVENT_TEMPLATES } from "@seating/shared";

import { TemplatePreview } from "./TemplatePreview";

interface TemplatePickerProps {
  /** Selected template id, or null for a blank event. */
  value: string | null;
  onChange: (templateId: string | null) => void;
  /** Hide the "Blank" option (e.g. when applying to an existing event). */
  withBlank?: boolean;
}

/** Cards for "start from": Blank and the starter templates. */
export function TemplatePicker({
  value,
  onChange,
  withBlank = true,
}: TemplatePickerProps): JSX.Element {
  const card = (selected: boolean): string =>
    `flex cursor-pointer flex-col gap-1 rounded-box border-2 p-2 text-left ${
      selected ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/50"
    }`;

  return (
    <div
      role="radiogroup"
      aria-label="Start from"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      {withBlank && (
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          className={card(value === null)}
          onClick={() => onChange(null)}
        >
          <span className="grid h-20 w-full place-items-center rounded-field bg-base-200 text-2xl text-base-content/30">
            +
          </span>
          <span className="text-sm font-semibold">Blank</span>
          <span className="text-xs text-base-content/60">An empty room</span>
        </button>
      )}
      {EVENT_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          role="radio"
          aria-checked={value === template.id}
          className={card(value === template.id)}
          onClick={() => onChange(template.id)}
        >
          <TemplatePreview template={template} />
          <span className="text-sm font-semibold">{template.name}</span>
          <span className="text-xs text-base-content/60">{template.description}</span>
        </button>
      ))}
    </div>
  );
}

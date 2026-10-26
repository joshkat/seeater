import type { NewLayoutContent } from "@seating/shared";
import { type FormEvent, useRef, useState } from "react";

import { useModalFocus } from "../../../../lib/useModalFocus";

interface NewLayoutDialogProps {
  /** The current layout's name, for the copy options' labels. */
  currentName: string;
  onCreate: (name: string, content: NewLayoutContent) => void;
  onClose: () => void;
}

const OPTIONS: { value: NewLayoutContent; label: string; hint: string }[] = [
  { value: "blank", label: "Blank", hint: "An empty room" },
  { value: "tables", label: "Copy tables", hint: "Same room, nobody seated" },
  {
    value: "tables-and-seating",
    label: "Copy tables and seating",
    hint: "A starting point to tweak",
  },
];

/** "New layout": a name, and whether to start blank or from the current one. */
export function NewLayoutDialog({
  currentName,
  onCreate,
  onClose,
}: NewLayoutDialogProps): JSX.Element {
  const boxRef = useRef<HTMLFormElement>(null);
  useModalFocus(boxRef);
  const [name, setName] = useState("");
  const [content, setContent] = useState<NewLayoutContent>("blank");

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onCreate(name, content);
    onClose();
  }

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="New layout">
      <form
        onSubmit={handleSubmit}
        onKeyDown={(event) => event.key === "Escape" && onClose()}
        ref={boxRef}
        className="modal-box flex max-w-md flex-col gap-3 text-base-content"
      >
        <h2 className="text-lg font-semibold">New layout</h2>
        <p className="text-sm text-base-content/60">
          A separate floor plan (e.g. ceremony and reception) with the same guest list.
        </p>
        <input
          autoFocus
          aria-label="Layout name"
          placeholder="e.g. Ceremony"
          className="input input-sm w-full"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-xs font-semibold text-base-content/70">
            Start from (based on “{currentName}”)
          </legend>
          {OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="layout-content"
                className="radio radio-sm"
                checked={content === option.value}
                onChange={() => setContent(option.value)}
              />
              {option.label}
              <span className="text-xs text-base-content/70">— {option.hint}</span>
            </label>
          ))}
        </fieldset>
        <div className="modal-action mt-1">
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm">
            Create layout
          </button>
        </div>
      </form>
    </div>
  );
}

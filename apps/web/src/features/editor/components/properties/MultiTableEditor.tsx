import type { AlignEdge } from "@seating/shared";

import { useEditorStore } from "../../store/editorStore";
import { labelClass } from "./propertyStyles";

const ALIGN: { edge: AlignEdge; label: string; title: string }[] = [
  { edge: "left", label: "⇤", title: "Align left edges" },
  { edge: "center", label: "↔", title: "Centre horizontally" },
  { edge: "right", label: "⇥", title: "Align right edges" },
  { edge: "top", label: "⤒", title: "Align top edges" },
  { edge: "middle", label: "↕", title: "Centre vertically" },
  { edge: "bottom", label: "⤓", title: "Align bottom edges" },
];

/** Several tables selected: align and distribute them. */
export function MultiTableEditor({ count }: { count: number }): JSX.Element {
  const alignSelected = useEditorStore((state) => state.alignSelected);
  const distributeSelected = useEditorStore((state) => state.distributeSelected);

  return (
    <div className="flex flex-col gap-3.5 text-base-content">
      <p className="text-sm text-base-content/60">{count} tables selected.</p>
      <div>
        <span className={labelClass}>Align</span>
        <div className="grid grid-cols-3 gap-1">
          {ALIGN.map((option) => (
            <button
              key={option.edge}
              type="button"
              className="btn btn-sm"
              title={option.title}
              aria-label={option.title}
              onClick={() => alignSelected(option.edge)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className={labelClass}>Distribute (3 or more)</span>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            className="btn btn-sm"
            disabled={count < 3}
            onClick={() => distributeSelected("horizontal")}
          >
            Horizontally
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={count < 3}
            onClick={() => distributeSelected("vertical")}
          >
            Vertically
          </button>
        </div>
      </div>
      <p className="text-xs text-base-content/50">
        Shift-click tables or Shift-drag on empty floor to select several.
      </p>
    </div>
  );
}

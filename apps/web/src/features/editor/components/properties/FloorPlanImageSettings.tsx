import { clearBackdrop, setBackdropOpacity } from "@seating/shared";
import { useRef, useState } from "react";

import { useBackdrop } from "../../hooks/useDocumentSelectors";
import { FLOOR_PLAN_ACCEPT, uploadFloorPlan } from "../../lib/floorPlanImage";
import { useDocumentStore } from "../../store/documentStore";
import { labelClass } from "./propertyStyles";

/** Upload a floor-plan picture to trace over; adjust or remove it. */
export function FloorPlanImageSettings(): JSX.Element {
  const backdrop = useBackdrop();
  const apply = useDocumentStore((state) => state.apply);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File): Promise<void> {
    setBusy(true);
    setError(await uploadFloorPlan(file));
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelClass}>Floor plan image</span>
      <input
        ref={inputRef}
        type="file"
        accept={FLOOR_PLAN_ACCEPT}
        className="hidden"
        aria-label="Floor plan image file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          className="btn btn-sm flex-1"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : backdrop ? "Replace image" : "Upload image"}
        </button>
        {backdrop && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => apply(clearBackdrop)}
          >
            Remove
          </button>
        )}
      </div>
      {backdrop && (
        <label className="flex items-center gap-2 text-xs">
          Opacity
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            aria-label="Floor plan image opacity"
            className="range range-xs flex-1"
            value={Math.round(backdrop.opacity * 100)}
            onChange={(event) =>
              apply((doc) => setBackdropOpacity(doc, Number(event.target.value) / 100), {
                coalesceKey: "backdrop-opacity",
              })
            }
          />
        </label>
      )}
      {error && <p className="text-xs text-error">{error}</p>}
      <p className="text-[11px] text-base-content/70">
        Trace tables over a venue plan. It fits the room’s width, so set the room width to the
        plan’s real width for true scale. Kept on this device only.
      </p>
    </div>
  );
}

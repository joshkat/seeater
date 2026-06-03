import { type FormEvent, useState } from "react";

import { createFloorPlan } from "../../editor/api/floorPlanApi";
import { useNavStore } from "../store/navStore";

/** "+ New event" button → name prompt → creates the plan and opens it. */
export function NewEventButton(): JSX.Element {
  const openEvent = useNavStore((state) => state.openEvent);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const plan = await createFloorPlan({ name: trimmed });
      openEvent(plan.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        + New event
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            className="w-full max-w-sm rounded-box border border-base-300 bg-base-100 p-5 text-base-content shadow-xl"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleCreate}
          >
            <h3 className="mb-3 text-base font-semibold">New event</h3>
            <input
              autoFocus
              className="input input-bordered input-sm w-full"
              placeholder="e.g. Sarah & Tom's Wedding"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={busy || name.trim() === ""}
              >
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

import { useState } from "react";

import { NewEventDialog } from "./NewEventDialog";

/** "+ New event" → name + blank or template → creates the event locally and opens it. */
export function NewEventButton({ label = "+ New event" }: { label?: string }): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && <NewEventDialog onClose={() => setOpen(false)} />}
    </>
  );
}

import { useState } from "react";

import { NewEventDialog } from "./NewEventDialog";

/** "+ New event" → name + blank or template → creates the event locally and opens it. */
export function NewEventButton(): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        + New event
      </button>
      {open && <NewEventDialog onClose={() => setOpen(false)} />}
    </>
  );
}

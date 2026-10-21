import { createSampleEvent } from "@seating/shared";
import { useState } from "react";
import { useNavigate } from "react-router";

import { createEvent } from "../../storage/repository/eventRepository";
import { activeDb } from "../../storage/store/storageStore";

/** Creates the sample wedding (46 guests, mostly seated) and opens it. */
export function SampleEventButton({
  className = "btn btn-sm",
}: {
  className?: string;
}): JSX.Element {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const doc = createSampleEvent();
        await createEvent(activeDb(), doc);
        navigate(`/events/${doc.id}`);
      }}
    >
      Try a sample event
    </button>
  );
}

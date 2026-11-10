import { useState } from "react";

import { StatsDialog } from "./StatsDialog";

/** "Stats": opens the totals dialog (meals per table, copy for the caterer). */
export function StatsButton(): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-xs" onClick={() => setOpen(true)}>
        Stats
      </button>
      {open && <StatsDialog onClose={() => setOpen(false)} />}
    </>
  );
}

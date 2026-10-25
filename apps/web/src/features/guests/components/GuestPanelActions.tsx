import { useState } from "react";

import { useGuests } from "../../editor/hooks/useDocumentSelectors";
import { AddGuestForm } from "./AddGuestForm";
import { GuestFilterMenu } from "./filter/GuestFilterMenu";
import { FormatHelp } from "./FormatHelp";
import { ImportMenu } from "./ImportMenu";

/** One line of guest-list actions — [+ Add guest] [Import ▾] [Filters] — with
 * the add form, format help and import status opening underneath. The add
 * form starts open while the list is empty. */
export function GuestPanelActions(): JSX.Element {
  const hasGuests = useGuests().length > 0;
  const [adding, setAdding] = useState(!hasGuests);
  const [focusName, setFocusName] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-expanded={adding}
          className={`btn btn-sm ${adding ? "btn-active" : "btn-primary"}`}
          onClick={() => {
            setFocusName(true);
            setAdding((open) => !open);
          }}
        >
          + Add guest
        </button>
        <ImportMenu onMessage={setMessage} onShowHelp={() => setHelpOpen(true)} />
        {hasGuests && (
          <span className="ml-auto">
            <GuestFilterMenu />
          </span>
        )}
      </div>
      {adding && <AddGuestForm autoFocus={focusName} onClose={() => setAdding(false)} />}
      {helpOpen && <FormatHelp onClose={() => setHelpOpen(false)} />}
      {message && <span className="text-xs text-base-content/70">{message}</span>}
    </div>
  );
}

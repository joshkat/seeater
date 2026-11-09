import { useRef } from "react";

import { useModalFocus } from "../../../lib/useModalFocus";
import { useIdentityStore } from "../../auth/store/identityStore";
import { useDocumentId, useEventName } from "../../editor/hooks/useDocumentSelectors";
import { useEventAccess } from "../hooks/useEventAccess";
import { useShareDialogStore } from "../store/shareDialogStore";
import { ShareDialogBody } from "./ShareDialogBody";
import { SignInToShare } from "./SignInToShare";

/** Share the open event: invite editors / viewers by email, or a read-only link. */
export function ShareDialog(): JSX.Element | null {
  const open = useShareDialogStore((state) => state.open);
  const setOpen = useShareDialogStore((state) => state.setOpen);
  const eventId = useDocumentId();
  const name = useEventName();
  const signedIn = useIdentityStore((state) => state.userId !== null);
  const access = useEventAccess(open ? eventId : null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Wait for the body, so focus lands in the email field rather than on ✕.
  useModalFocus(boxRef, open && (!signedIn || access !== undefined));

  if (!open || !eventId) return null;
  const close = (): void => setOpen(false);

  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-label="Share"
      onClick={close}
    >
      <div
        ref={boxRef}
        className="modal-box flex max-w-lg flex-col gap-4 text-base-content"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold">Share “{name || "Untitled event"}”</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Close"
            onClick={close}
          >
            ✕
          </button>
        </div>
        {!signedIn ? (
          <SignInToShare />
        ) : access ? (
          <ShareDialogBody eventId={eventId} access={access} />
        ) : (
          <p className="text-sm text-base-content/70" role="status">
            Loading…
          </p>
        )}
      </div>
    </div>
  );
}

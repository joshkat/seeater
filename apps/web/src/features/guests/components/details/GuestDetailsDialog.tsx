import { useGuests } from "../../../editor/hooks/useDocumentSelectors";
import { useGuestDetailsStore } from "../../store/guestDetailsStore";
import { GuestDetailsForm } from "./GuestDetailsForm";

/** The guest details dialog (opened from a guest row's ✎). */
export function GuestDetailsDialog(): JSX.Element | null {
  const guestId = useGuestDetailsStore((state) => state.guestId);
  const close = useGuestDetailsStore((state) => state.close);
  const guest = useGuests().find((candidate) => candidate.id === guestId);
  if (!guest) return null;

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Guest details">
      <div className="modal-box max-h-[90vh] w-full max-w-lg overflow-y-auto text-base-content">
        {/* Keyed by guest so the form starts fresh for each guest. */}
        <GuestDetailsForm key={guest.id} guest={guest} onClose={close} />
      </div>
    </div>
  );
}

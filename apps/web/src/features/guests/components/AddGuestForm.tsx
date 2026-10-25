import type { GuestInput } from "@seating/shared";
import { type FormEvent, useRef, useState } from "react";

import { useGuestStore } from "../store/guestStore";

/** Splits a free-text contact into an email or phone based on its content. */
function classifyContact(value: string): Pick<GuestInput, "email" | "phone"> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  if (trimmed.includes("@")) return { email: trimmed };
  return { phone: trimmed };
}

interface AddGuestFormProps {
  /** Focus Name on open (when the user opened it, not when it starts open). */
  autoFocus: boolean;
  onClose: () => void;
}

/** Form to add a single guest by name plus an optional email or phone. Opened
 * from "+ Add guest"; focus goes back to Name after each Add, so typing a list
 * stays fast. Done (or Escape) closes it. */
export function AddGuestForm({ autoFocus, onClose }: AddGuestFormProps): JSX.Element {
  const addGuest = useGuestStore((state) => state.addGuest);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addGuest({ name: trimmed, ...classifyContact(contact) });
    setName("");
    setContact("");
    nameRef.current?.focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(event) => event.key === "Escape" && onClose()}
      className="flex flex-col gap-1.5 rounded-box border border-base-300 bg-base-200/40 p-2"
    >
      <input
        ref={nameRef}
        autoFocus={autoFocus}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Guest name"
        aria-label="Guest name"
        className="input input-sm w-full text-base-content"
      />
      <input
        value={contact}
        onChange={(event) => setContact(event.target.value)}
        placeholder="Email or phone (optional)"
        aria-label="Guest email or phone"
        className="input input-sm w-full text-base-content"
      />
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={name.trim() === ""}
          className="btn btn-primary btn-sm flex-1"
        >
          Add
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Done
        </button>
      </div>
    </form>
  );
}

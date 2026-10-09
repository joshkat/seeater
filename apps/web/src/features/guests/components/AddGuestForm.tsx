import type { GuestInput } from "@seating/shared";
import { type FormEvent, useState } from "react";

import { useGuestStore } from "../store/guestStore";

/** Splits a free-text contact into an email or phone based on its content. */
function classifyContact(value: string): Pick<GuestInput, "email" | "phone"> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  if (trimmed.includes("@")) return { email: trimmed };
  return { phone: trimmed };
}

/** Form to add a single guest by name plus an optional email or phone. */
export function AddGuestForm(): JSX.Element {
  const addGuest = useGuestStore((state) => state.addGuest);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addGuest({ name: trimmed, ...classifyContact(contact) });
    setName("");
    setContact("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <input
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
      <button type="submit" disabled={name.trim() === ""} className="btn btn-primary btn-sm">
        Add
      </button>
    </form>
  );
}

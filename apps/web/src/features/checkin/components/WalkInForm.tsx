import { type FormEvent, useState } from "react";

import { addWalkIn } from "../lib/checkInActions";

/** Adds a guest who wasn't on the list, already checked in. */
export function WalkInForm({
  initialName,
  onDone,
}: {
  initialName: string;
  onDone: (name: string | null) => void;
}): JSX.Element {
  const [name, setName] = useState(initialName);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addWalkIn(trimmed);
    onDone(trimmed);
  }

  return (
    <form
      aria-label="Add a walk-in"
      className="flex flex-wrap items-center gap-2 rounded-box border border-base-300 bg-base-100 p-3"
      onSubmit={handleSubmit}
      onKeyDown={(event) => event.key === "Escape" && onDone(null)}
    >
      <input
        autoFocus
        aria-label="Walk-in name"
        className="input input-bordered input-sm min-w-0 flex-1"
        placeholder="Their name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={!name.trim()}>
        Add &amp; check in
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDone(null)}>
        Cancel
      </button>
    </form>
  );
}

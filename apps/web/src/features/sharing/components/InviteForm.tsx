import type { MemberRole } from "@seating/shared";
import { type FormEvent, useState } from "react";

import { RoleSelect } from "./RoleSelect";

interface InviteFormProps {
  busy: boolean;
  onInvite: (email: string, role: MemberRole) => Promise<boolean>;
}

/** Email + role + Invite. No email is sent: the invitee signs in with that address. */
export function InviteForm({ busy, onInvite }: InviteFormProps): JSX.Element {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    if (await onInvite(trimmed, role)) setEmail("");
  }

  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => void handleSubmit(event)}>
      <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
        <span>Email</span>
        <input
          type="email"
          required
          data-autofocus
          autoComplete="off"
          placeholder="name@example.com"
          className="input input-bordered input-sm w-full"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <RoleSelect label="Role for the new person" value={role} onChange={setRole} />
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !email.trim()}>
        Invite
      </button>
    </form>
  );
}

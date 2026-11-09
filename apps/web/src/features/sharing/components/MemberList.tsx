import type { MemberRole, ShareMember } from "@seating/shared";

import { MemberRow } from "./MemberRow";

interface MemberListProps {
  ownerName: string;
  members: ShareMember[];
  canManage: boolean;
  busy: boolean;
  onRoleChange: (email: string, role: MemberRole) => void;
  onRemove: (email: string) => void;
}

/** The owner, then everyone the event is shared with. */
export function MemberList({
  ownerName,
  members,
  canManage,
  busy,
  onRoleChange,
  onRemove,
}: MemberListProps): JSX.Element {
  return (
    <ul aria-label="People with access" className="divide-y divide-base-300">
      <li className="flex items-center gap-2 py-2">
        <span className="flex-1 truncate text-sm">{ownerName || "Owner"}</span>
        <span className="badge badge-ghost badge-sm">Owner</span>
      </li>
      {members.map((member) => (
        <MemberRow
          key={member.email}
          member={member}
          canManage={canManage}
          busy={busy}
          onRoleChange={(role) => onRoleChange(member.email, role)}
          onRemove={() => onRemove(member.email)}
        />
      ))}
    </ul>
  );
}

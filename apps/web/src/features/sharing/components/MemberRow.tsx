import type { MemberRole, ShareMember } from "@seating/shared";

import { RoleSelect } from "./RoleSelect";

interface MemberRowProps {
  member: ShareMember;
  /** Owners can change roles and remove people; editors only see the list. */
  canManage: boolean;
  busy: boolean;
  onRoleChange: (role: MemberRole) => void;
  onRemove: () => void;
}

/** One person an event is shared with. */
export function MemberRow({
  member,
  canManage,
  busy,
  onRoleChange,
  onRemove,
}: MemberRowProps): JSX.Element {
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">{member.email}</span>
        {!member.accepted && (
          <span className="text-xs text-base-content/70">
            Invited: sees it after signing in with this email
          </span>
        )}
      </div>
      {canManage ? (
        <>
          <RoleSelect
            label={`Role for ${member.email}`}
            value={member.role}
            disabled={busy}
            onChange={onRoleChange}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm text-error-strong"
            aria-label={`Remove ${member.email}`}
            disabled={busy}
            onClick={onRemove}
          >
            Remove
          </button>
        </>
      ) : (
        <span className="badge badge-ghost badge-sm">
          {member.role === "editor" ? "Can edit" : "Can view"}
        </span>
      )}
    </li>
  );
}

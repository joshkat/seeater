import type { EventAccessState } from "../hooks/useEventAccess";
import { useSharing } from "../hooks/useSharing";
import { InviteForm } from "./InviteForm";
import { MemberList } from "./MemberList";
import { ShareLinkSection } from "./ShareLinkSection";

interface ShareDialogBodyProps {
  eventId: string;
  access: EventAccessState;
}

/** The signed-in part of the Share dialog: invite, people, link. */
export function ShareDialogBody({ eventId, access }: ShareDialogBodyProps): JSX.Element {
  const controller = useSharing(eventId, access.synced);
  const { sharing, error, busy } = controller;
  const owner = access.role === "owner";

  if (!access.synced) {
    return (
      <p className="text-sm text-base-content/70" role="status">
        Uploading this event to your account… Sharing is ready once it has synced.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {owner && <InviteForm busy={busy} onInvite={controller.invite} />}
      {!owner && (
        <p className="text-sm text-base-content/70">
          Only {access.ownerName ?? "the owner"} can change who has access.
        </p>
      )}
      {error && (
        <p className="text-sm text-error-strong" role="alert">
          {error}
        </p>
      )}
      {sharing === null && !error && (
        <p className="text-sm text-base-content/70" role="status">
          Loading…
        </p>
      )}
      {sharing && (
        <>
          <MemberList
            ownerName={sharing.ownerName}
            members={sharing.members}
            canManage={owner}
            busy={busy}
            onRoleChange={(email, role) => void controller.setRole(email, role)}
            onRemove={(email) => void controller.remove(email)}
          />
          {owner && sharing.members.length > 0 && (
            <p className="text-xs text-base-content/70">
              No email is sent: tell them to sign in with that address. One person edits at a time;
              anyone else who opens it then sees it read-only until they're done.
            </p>
          )}
          {sharing.link && (
            <ShareLinkSection link={sharing.link} busy={busy} onChange={controller.setLink} />
          )}
        </>
      )}
    </div>
  );
}

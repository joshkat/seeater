import { AuthControls } from "../../auth/components/AuthControls";

/** What the Share dialog shows while signed out. */
export function SignInToShare(): JSX.Element {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-base-content/70">
        Sign in to share this event. It's uploaded to your account, then you can invite people by
        email or turn on a read-only link. Signing in also keeps your events in step across your
        devices.
      </p>
      <AuthControls />
    </div>
  );
}

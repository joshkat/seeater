import { SignInButton, SignUpButton } from "@clerk/clerk-react";

/** Shown when signed out: a simple landing that opens Clerk's sign-in / sign-up
 * modal (email + password and Google, per the Clerk dashboard config). */
export function SignInScreen(): JSX.Element {
  return (
    <div className="grid min-h-screen place-items-center bg-base-200 text-base-content">
      <div className="w-full max-w-sm rounded-box border border-base-300 bg-base-100 p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">Seating Chart Builder</h1>
        <p className="mt-2 text-sm text-base-content/60">
          Sign in to create and manage your event seating charts.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <SignInButton mode="modal">
            <button type="button" className="btn btn-primary">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button type="button" className="btn btn-ghost btn-sm">
              Create an account
            </button>
          </SignUpButton>
        </div>
      </div>
    </div>
  );
}

interface SharedByBannerProps {
  ownerName: string | null;
}

/** "Shared with you by Olive · view only" above a read-only event. */
export function SharedByBanner({ ownerName }: SharedByBannerProps): JSX.Element {
  return (
    <div role="status" className="alert alert-info alert-soft py-2 text-sm text-base-content">
      Shared {ownerName ? `by ${ownerName}` : "with you"} · view only. Changes they make show up
      here.
    </div>
  );
}

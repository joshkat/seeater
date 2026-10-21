import type { CheckInCounts } from "@seating/shared";

/** "23 of 44 arrived" with a progress bar. */
export function CheckInSummary({ counts }: { counts: CheckInCounts }): JSX.Element {
  const { arrived, expected } = counts;
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <p className="text-sm whitespace-nowrap">
        <span className="text-lg font-semibold">{arrived}</span> of {expected} arrived
      </p>
      <progress
        className="progress progress-success w-full"
        value={arrived}
        max={Math.max(expected, 1)}
        aria-label="Arrivals"
      />
    </div>
  );
}

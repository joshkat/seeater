interface DuplicateNoticeProps {
  existing: number;
  repeated: number;
  skip: boolean;
  onSkipChange: (skip: boolean) => void;
}

/** "3 look like guests you already have" + the "Skip likely duplicates" box. */
export function DuplicateNotice({
  existing,
  repeated,
  skip,
  onSkipChange,
}: DuplicateNoticeProps): JSX.Element | null {
  if (existing === 0 && repeated === 0) return null;
  const lines = [
    existing > 0
      ? `${existing} look${existing === 1 ? "s" : ""} like ${existing === 1 ? "a guest" : "guests"} you already have.`
      : "",
    repeated > 0
      ? `${repeated} ${repeated === 1 ? "repeats a name" : "repeat names"} from earlier in the file.`
      : "",
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-1.5 rounded-box bg-warning/15 p-2.5 text-sm">
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={skip}
          onChange={(event) => onSkipChange(event.target.checked)}
        />
        Skip likely duplicates
      </label>
    </div>
  );
}

import type { DuplicateKind } from "../../lib/importMapping";

interface DuplicateBadgeProps {
  kind: DuplicateKind;
  name: string;
  skipDuplicates: boolean;
  /** Left out of the import (skipped, and not imported anyway). */
  excluded: boolean;
  onToggle: () => void;
}

const REASON = { existing: "Already in list", file: "Repeated in file" } as const;

/** A preview row's duplicate marker, with "Import anyway" / "Skip" while duplicates are skipped. */
export function DuplicateBadge({
  kind,
  name,
  skipDuplicates,
  excluded,
  onToggle,
}: DuplicateBadgeProps): JSX.Element {
  if (!skipDuplicates) {
    return <span className="badge badge-warning badge-xs whitespace-nowrap">{REASON[kind]}</span>;
  }
  const action = excluded ? "Import anyway" : "Skip";
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="badge badge-warning badge-xs" title={REASON[kind]}>
        {excluded ? "Duplicate, skipped" : "Duplicate, importing"}
      </span>
      <button
        type="button"
        className="btn btn-xs"
        aria-label={`${action}: ${name}`}
        onClick={onToggle}
      >
        {action}
      </button>
    </span>
  );
}

/** One number in the stats summary. */
export function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}): JSX.Element {
  return (
    <div className="rounded-box border border-base-300 p-3">
      <div className={`text-2xl font-bold tabular-nums ${tone ?? ""}`}>{value}</div>
      <div className="text-xs text-base-content/60">{label}</div>
    </div>
  );
}

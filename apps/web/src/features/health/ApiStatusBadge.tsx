import { useHealthCheck } from "./useHealthCheck";

const LABELS: Record<string, string> = {
  loading: "Checking API…",
  ok: "API connected",
  error: "API unreachable",
};

const COLORS: Record<string, string> = {
  loading: "#9ca3af",
  ok: "#16a34a",
  error: "#dc2626",
};

/**
 * Small badge showing whether the web client can reach the API. Scaffold-only;
 * will be replaced by real app chrome as features land.
 */
export function ApiStatusBadge(): JSX.Element {
  const { status } = useHealthCheck();

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}>
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: COLORS[status],
        }}
      />
      {LABELS[status]}
    </span>
  );
}

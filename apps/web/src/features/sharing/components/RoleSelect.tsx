import type { MemberRole } from "@seating/shared";

interface RoleSelectProps {
  value: MemberRole;
  onChange: (role: MemberRole) => void;
  /** Accessible name (the select has no visible label). */
  label: string;
  disabled?: boolean;
}

/** "Can edit" / "Can view". */
export function RoleSelect({ value, onChange, label, disabled }: RoleSelectProps): JSX.Element {
  return (
    <select
      aria-label={label}
      className="select select-bordered select-sm w-auto"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as MemberRole)}
    >
      <option value="editor">Can edit</option>
      <option value="viewer">Can view</option>
    </select>
  );
}

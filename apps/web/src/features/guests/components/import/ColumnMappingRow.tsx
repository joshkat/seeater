import { IMPORT_FIELDS, type ImportField } from "../../lib/importFields";

interface ColumnMappingRowProps {
  label: string;
  /** The column's first value, shown as an example. */
  sample: string;
  field: ImportField;
  onChange: (field: ImportField) => void;
}

/** One file column and the guest field it maps to. */
export function ColumnMappingRow({
  label,
  sample,
  field,
  onChange,
}: ColumnMappingRowProps): JSX.Element {
  return (
    <li className="flex items-center gap-2 py-1">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium" title={label}>
          {label}
        </div>
        <div className="truncate text-xs text-base-content/60" title={sample}>
          {sample ? `e.g. ${sample}` : "—"}
        </div>
      </div>
      <select
        aria-label={`Field for column “${label}”`}
        className={`select select-sm w-40 shrink-0 ${field === "ignore" ? "text-base-content/50" : ""}`}
        value={field}
        onChange={(event) => onChange(event.target.value as ImportField)}
      >
        {IMPORT_FIELDS.map((option) => (
          <option key={option.field} value={option.field}>
            {option.label}
          </option>
        ))}
      </select>
    </li>
  );
}

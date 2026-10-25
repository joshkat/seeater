import { importFieldLabel } from "../../lib/importFields";
import {
  type ColumnMapping,
  type ImportPlan,
  previewFields,
  previewValue,
} from "../../lib/importMapping";

interface ImportPreviewTableProps {
  plan: ImportPlan;
  mapping: ColumnMapping;
  skipDuplicates: boolean;
  /** How many guests to show. */
  limit?: number;
}

const DUPLICATE_LABEL = { existing: "Already in list", file: "Repeated in file" } as const;

/** The first few guests as they'll be imported, with likely duplicates marked. */
export function ImportPreviewTable({
  plan,
  mapping,
  skipDuplicates,
  limit = 5,
}: ImportPreviewTableProps): JSX.Element {
  const fields = previewFields(mapping);
  const shown = plan.guests.slice(0, limit);
  const more = plan.guests.length - shown.length;

  if (shown.length === 0) {
    return <p className="text-sm text-base-content/60">No guests to preview yet.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table table-xs" aria-label="Import preview">
          <thead>
            <tr>
              <th>Name</th>
              {fields.map((field) => (
                <th key={field}>{importFieldLabel(field)}</th>
              ))}
              <th>
                <span className="sr-only">Duplicate</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((guest, index) => {
              const duplicate = plan.duplicates[index];
              const skipped = skipDuplicates && duplicate !== null;
              return (
                <tr key={guest.row} className={skipped ? "text-base-content/70" : ""}>
                  <td className={`font-medium ${skipped ? "line-through" : ""}`}>
                    {guest.input.name}
                  </td>
                  {fields.map((field) => (
                    <td key={field} className="max-w-40 truncate">
                      {previewValue(guest.input, field)}
                    </td>
                  ))}
                  <td>
                    {duplicate && (
                      <span className="badge badge-warning badge-xs whitespace-nowrap">
                        {DUPLICATE_LABEL[duplicate]}
                        {skipped ? " · skipped" : ""}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {more > 0 && (
        <p className="text-xs text-base-content/60">
          …and {more} more guest{more === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}

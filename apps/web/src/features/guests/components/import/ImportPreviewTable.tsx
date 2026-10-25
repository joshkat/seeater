import { importFieldLabel } from "../../lib/importFields";
import {
  type ColumnMapping,
  type ImportPlan,
  guestKey,
  previewFields,
  previewValue,
} from "../../lib/importMapping";
import { DuplicateBadge } from "./DuplicateBadge";

interface ImportPreviewTableProps {
  plan: ImportPlan;
  mapping: ColumnMapping;
  skipDuplicates: boolean;
  /** Turns "import this duplicate anyway" on or off for one guest (by guestKey). */
  onToggleImportAnyway: (key: string) => void;
}

/** Every guest as they'll be imported (scrolls), with likely duplicates marked in place. */
export function ImportPreviewTable({
  plan,
  mapping,
  skipDuplicates,
  onToggleImportAnyway,
}: ImportPreviewTableProps): JSX.Element {
  const fields = previewFields(mapping);

  if (plan.guests.length === 0) {
    return <p className="text-sm text-base-content/60">No guests to preview yet.</p>;
  }

  return (
    <div className="max-h-64 overflow-auto rounded-box border border-base-300">
      <table className="table table-pin-rows table-xs" aria-label="Import preview">
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
          {plan.guests.map((guest, index) => {
            const duplicate = plan.duplicates[index];
            const excluded = plan.excluded[index];
            return (
              <tr key={guestKey(guest)} className={excluded ? "text-base-content/70" : ""}>
                <td className="font-medium">
                  <span className={excluded ? "line-through" : ""}>{guest.input.name}</span>
                  {guest.partner && (
                    <span className="badge badge-ghost badge-xs ml-1.5 font-normal">Partner</span>
                  )}
                </td>
                {fields.map((field) => (
                  <td key={field} className="max-w-40 truncate">
                    {previewValue(guest.input, field)}
                  </td>
                ))}
                <td>
                  {duplicate && (
                    <DuplicateBadge
                      kind={duplicate}
                      name={guest.input.name}
                      skipDuplicates={skipDuplicates}
                      excluded={excluded}
                      onToggle={() => onToggleImportAnyway(guestKey(guest))}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

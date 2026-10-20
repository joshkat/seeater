import { useState } from "react";

/** A "?" toggle that explains the accepted spreadsheet/CSV format. */
export function FormatHelp(): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0 text-base-content">
      <button
        type="button"
        aria-label="Import format help"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`btn btn-circle btn-outline btn-sm ${open ? "btn-primary" : ""}`}
      >
        ?
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute right-0 top-9 z-10 w-72 rounded-box border border-base-300 bg-base-100 p-3 text-xs leading-relaxed text-base-content/80 shadow-lg"
        >
          <strong className="mb-1 block text-[13px]">Spreadsheet format</strong>
          <p className="mb-2">
            Accepts <code>.csv</code> and <code>.xlsx</code> files. Use up to four columns:
          </p>
          <table className="mb-2 w-full border-collapse">
            <thead>
              <tr>
                {["Name", "Email", "Phone", "Household"].map((head) => (
                  <th
                    key={head}
                    className="border border-base-300 bg-base-200 px-1 py-0.5 text-left"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-base-content/60">
                <td className="border border-base-300 px-1 py-0.5">Ada Lovelace</td>
                <td className="border border-base-300 px-1 py-0.5">ada@x.com</td>
                <td className="border border-base-300 px-1 py-0.5">555-0100</td>
                <td className="border border-base-300 px-1 py-0.5">Lovelace</td>
              </tr>
            </tbody>
          </table>
          <p>
            A header row is optional — only <strong>Name</strong> is required. Without a header,
            columns are read in order: name, email, phone.
          </p>
          <p className="mt-2">
            Add a <strong>Household</strong> (or <strong>Party</strong>) column with a header to
            group families: guests with the same value are kept together when seating.
          </p>
        </div>
      )}
    </div>
  );
}

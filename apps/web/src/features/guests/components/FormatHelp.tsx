/** Explains the accepted spreadsheet/CSV format (Import ▾ → Spreadsheet format). */
export function FormatHelp({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <section
      aria-label="Spreadsheet format"
      className="rounded-box border border-base-300 bg-base-100 p-3 text-xs leading-relaxed text-base-content/80"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <strong className="block text-[13px]">Spreadsheet format</strong>
        <button
          type="button"
          aria-label="Close format help"
          className="btn btn-ghost btn-xs btn-square -mr-1 -mt-1"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <p className="mb-2">
        Accepts <code>.csv</code> and <code>.xlsx</code> files. Use up to four columns:
      </p>
      <table className="mb-2 w-full border-collapse">
        <thead>
          <tr>
            {["Name", "Email", "Phone", "Household"].map((head) => (
              <th key={head} className="border border-base-300 bg-base-200 px-1 py-0.5 text-left">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="text-base-content/70">
            <td className="border border-base-300 px-1 py-0.5">Ada Lovelace</td>
            <td className="border border-base-300 px-1 py-0.5">ada@x.com</td>
            <td className="border border-base-300 px-1 py-0.5">555-0100</td>
            <td className="border border-base-300 px-1 py-0.5">Lovelace</td>
          </tr>
        </tbody>
      </table>
      <p>
        After you pick a file, the <strong>Import guests</strong> dialog shows each column so you
        can choose what it holds (or ignore it) and preview the guests before importing.
      </p>
      <p className="mt-2">
        Only a name is required: a <strong>Name</strong> column, or <strong>First name</strong> and{" "}
        <strong>Last name</strong>. Headed columns are matched automatically, including common
        wedding-site column names (RSVP, Party, Meal Selection, Dietary Restrictions…). Without a
        header, columns start as name, email, phone.
      </p>
      <p className="mt-2">
        A <strong>Household</strong> (or <strong>Party</strong>) column groups families: guests with
        the same value are kept together when seating. Names that match guests you already have can
        be skipped.
      </p>
    </section>
  );
}

import { downloadTextFile } from "../../../lib/downloadFile";
import { useDocumentStore } from "../../editor/store/documentStore";
import { captureChart } from "../lib/chartCapture";
import { exportFileName, guestsCsv } from "../lib/guestsCsv";
import { PRINT_KINDS, usePrintStore } from "../store/printStore";

/** Saves a data URL as a file. */
function downloadDataUrl(fileName: string, url: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Editor header: Export ▾ — print views, a PNG of the chart, the guest CSV. */
export function ExportMenu(): JSX.Element {
  const openPrint = usePrintStore((state) => state.open);

  const blurMenu = (): void => {
    (document.activeElement as HTMLElement | null)?.blur();
  };

  function downloadPng(): void {
    const doc = useDocumentStore.getState().doc;
    const url = captureChart();
    if (doc && url) downloadDataUrl(exportFileName(doc.name, "chart.png"), url);
  }

  function downloadCsv(): void {
    const doc = useDocumentStore.getState().doc;
    if (doc) downloadTextFile(exportFileName(doc.name, "guests.csv"), guestsCsv(doc), "text/csv");
  }

  return (
    <div className="dropdown dropdown-end">
      <button type="button" tabIndex={0} className="btn btn-ghost btn-sm">
        Export ▾
      </button>
      <ul className="dropdown-content menu z-30 mt-1 w-56 rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
        <li className="menu-title">Print or save as PDF</li>
        {PRINT_KINDS.map((option) => (
          <li key={option.value}>
            <button
              type="button"
              onClick={() => {
                blurMenu();
                openPrint(option.value);
              }}
            >
              {option.label}…
            </button>
          </li>
        ))}
        <li className="menu-title">Download</li>
        <li>
          <button
            type="button"
            onClick={() => {
              blurMenu();
              downloadPng();
            }}
          >
            Chart image (PNG)
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              blurMenu();
              downloadCsv();
            }}
          >
            Guest list (CSV)
          </button>
        </li>
      </ul>
    </div>
  );
}

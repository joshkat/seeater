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

/** Print views, a PNG of the chart and the guest CSV, as menu rows (used by
 * "Export ▾" and the phone's "⋯" menu). */
export function ExportMenuItems({ onPick }: { onPick: () => void }): JSX.Element {
  const openPrint = usePrintStore((state) => state.open);

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
    <>
      <li className="menu-title">Print or save as PDF</li>
      {PRINT_KINDS.map((option) => (
        <li key={option.value}>
          <button
            type="button"
            onClick={() => {
              onPick();
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
            onPick();
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
            onPick();
            downloadCsv();
          }}
        >
          Guest list (CSV)
        </button>
      </li>
    </>
  );
}

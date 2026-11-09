import { useDocumentStore } from "../../editor/store/documentStore";
import { PrintDocument } from "./PrintDocument";

/** The editor's print views, for the open event. */
export function PrintView(): JSX.Element | null {
  const doc = useDocumentStore((state) => state.doc);
  return doc ? <PrintDocument doc={doc} /> : null;
}

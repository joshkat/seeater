import { Dashboard } from "./features/dashboard/components/Dashboard";
import { useNavStore } from "./features/dashboard/store/navStore";
import { EditorPage } from "./features/editor/components/EditorPage";

/** Root shell: the events dashboard, or the editor for the open event. */
export function App(): JSX.Element {
  const view = useNavStore((state) => state.view);
  return view === "dashboard" ? <Dashboard /> : <EditorPage />;
}

import { useTables } from "../hooks/useDocumentSelectors";
import { useDrawerState } from "../hooks/useDrawerState";
import { useEditorStore } from "../store/editorStore";
import { DrawerCloseButton } from "./DrawerCloseButton";
import { EventSettings } from "./properties/EventSettings";
import { MultiTableEditor } from "./properties/MultiTableEditor";
import { SingleTableEditor } from "./properties/SingleTableEditor";

/** Right-hand inspector for the current selection (a drawer on tablets). */
export function PropertiesPanel(): JSX.Element {
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const { open, inert, passThrough, close } = useDrawerState("properties");
  const tables = useTables();

  const selected = tables.filter((table) => selectedIds.includes(table.id));
  const selectedIndex = selected.length === 1 ? tables.indexOf(selected[0]) : -1;

  return (
    <aside
      aria-label="Properties"
      inert={inert}
      className={`w-65 shrink-0 overflow-y-auto border-l border-base-300 bg-base-100 p-4 max-xl:absolute max-xl:inset-y-0 max-xl:right-0 max-xl:z-30 max-xl:w-[min(320px,85vw)] max-xl:shadow-xl max-xl:transition-transform ${
        open ? "" : "max-xl:translate-x-full"
      } ${passThrough ? "pointer-events-none" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-base-content">Properties</h2>
        <DrawerCloseButton label="Close properties" onClose={close} />
      </div>
      {selected.length === 0 && <EventSettings />}
      {selected.length === 1 && <SingleTableEditor table={selected[0]} index={selectedIndex} />}
      {selected.length > 1 && <MultiTableEditor count={selected.length} />}
    </aside>
  );
}

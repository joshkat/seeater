import { useRoomObjects, useTables } from "../hooks/useDocumentSelectors";
import { useDrawerState } from "../hooks/useDrawerState";
import { useEditorStore } from "../store/editorStore";
import { DrawerCloseButton } from "./DrawerCloseButton";
import { EventSettings } from "./properties/EventSettings";
import { MultiTableEditor } from "./properties/MultiTableEditor";
import { RoomObjectEditor } from "./properties/RoomObjectEditor";
import { SingleTableEditor } from "./properties/SingleTableEditor";

/** Right-hand inspector for the current selection (a drawer on tablets; on
 * laptop-sized windows it docks beside the floor plan when opened). */
export function PropertiesPanel(): JSX.Element {
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const { mode, open, inert, passThrough, close } = useDrawerState("properties");
  const tables = useTables();
  const roomObjects = useRoomObjects();

  const selected = tables.filter((table) => selectedIds.includes(table.id));
  const selectedObjects = roomObjects.filter((object) => selectedIds.includes(object.id));
  const total = selected.length + selectedObjects.length;
  const selectedIndex = selected.length === 1 ? tables.indexOf(selected[0]) : -1;

  return (
    <aside
      aria-label="Properties"
      inert={inert}
      className={`shrink-0 overflow-y-auto border-l border-base-300 bg-base-100 p-4 ${
        mode === "drawer"
          ? `absolute inset-y-0 right-0 z-30 w-[min(320px,85vw)] shadow-xl transition-transform ${
              open ? "" : "translate-x-full"
            }`
          : open
            ? "w-65"
            : "hidden"
      } ${passThrough ? "pointer-events-none" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-base-content">Properties</h2>
        <DrawerCloseButton label="Close properties" onClose={close} />
      </div>
      {total === 0 && <EventSettings />}
      {total === 1 && selected.length === 1 && (
        <SingleTableEditor table={selected[0]} index={selectedIndex} />
      )}
      {total === 1 && selectedObjects.length === 1 && (
        <RoomObjectEditor object={selectedObjects[0]} />
      )}
      {total > 1 && <MultiTableEditor count={selected.length} others={selectedObjects.length} />}
    </aside>
  );
}

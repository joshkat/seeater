import { ROOM_OBJECT_DEFAULTS, ROOM_OBJECT_KINDS } from "@seating/shared";

import { useEditorStore } from "../../store/editorStore";

/** "Room ▾": dance floor, stage, bar, buffet, DJ, area, door, wall, label. */
export function AddRoomObjectMenu(): JSX.Element {
  const addRoomObject = useEditorStore((state) => state.addRoomObject);
  const closeMenu = (): void => (document.activeElement as HTMLElement | null)?.blur();

  return (
    <div className="dropdown">
      <button type="button" tabIndex={0} className="btn btn-sm btn-outline">
        Room ▾
      </button>
      <ul className="dropdown-content menu z-30 mt-1 w-48 rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
        {ROOM_OBJECT_KINDS.map((kind) => (
          <li key={kind}>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                addRoomObject(kind);
              }}
            >
              {ROOM_OBJECT_DEFAULTS[kind].name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

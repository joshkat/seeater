import { ROOM_OBJECT_DEFAULTS, ROOM_OBJECT_KINDS } from "@seating/shared";

import { useEditorStore } from "../../store/editorStore";

/** Dance floor, stage, bar… as menu rows (used by "+ Room item ▾" and the phone's "+ Add ▾"). */
export function RoomObjectMenuItems({ onPick }: { onPick: () => void }): JSX.Element {
  const addRoomObject = useEditorStore((state) => state.addRoomObject);

  return (
    <>
      {ROOM_OBJECT_KINDS.map((kind) => (
        <li key={kind}>
          <button
            type="button"
            onClick={() => {
              onPick();
              addRoomObject(kind);
            }}
          >
            {ROOM_OBJECT_DEFAULTS[kind].name}
          </button>
        </li>
      ))}
    </>
  );
}

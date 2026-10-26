import { blurActiveElement } from "../../../../lib/blurActiveElement";
import { RoomObjectMenuItems } from "./RoomObjectMenuItems";

/** "+ Room item ▾": dance floor, stage, bar, buffet, DJ, area, door, wall, label. */
export function AddRoomObjectMenu(): JSX.Element {
  return (
    <div className="dropdown">
      <button type="button" tabIndex={0} className="btn btn-sm btn-outline">
        + Room item ▾
      </button>
      <ul className="dropdown-content menu z-30 mt-1 w-48 rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
        <RoomObjectMenuItems onPick={blurActiveElement} />
      </ul>
    </div>
  );
}

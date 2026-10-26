import { shortcutLabel } from "../../../lib/platform";
import { useHistoryAvailability } from "../hooks/useDocumentSelectors";
import { undoEdit } from "../store/historyActions";
import { GuestsDrawerToggle } from "./GuestsDrawerToggle";
import { PhoneAddMenu } from "./PhoneAddMenu";
import { SelectMenu } from "./SelectMenu";
import { ToolbarOverflowMenu } from "./ToolbarOverflowMenu";

/**
 * The phone toolbar: one bar along the bottom (in thumb reach, and the
 * header keeps only ← and the title). Guests · + Add ▾ · Select ▾ · Undo · ⋯,
 * where ⋯ holds Redo, Properties, History, Check-in, Export and the theme.
 */
export function PhoneBottomBar(): JSX.Element {
  const { canUndo } = useHistoryAvailability();

  return (
    <div
      role="group"
      aria-label="Editor tools"
      className="relative z-40 flex h-14 shrink-0 items-center justify-between gap-1 border-t border-base-300 bg-base-100 px-3"
    >
      <GuestsDrawerToggle />
      <PhoneAddMenu />
      <SelectMenu actions={["duplicate", "copy", "paste", "delete"]} placement="dropdown-top" />
      <button
        type="button"
        className="btn btn-sm"
        disabled={!canUndo}
        aria-label="Undo"
        title={`Undo (${shortcutLabel("Z")})`}
        onClick={undoEdit}
      >
        ↶
      </button>
      <ToolbarOverflowMenu phone />
    </div>
  );
}

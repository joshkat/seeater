/** The ✕ in a drawer's header (only shown at tablet widths). */
export function DrawerCloseButton({
  label,
  onClose,
}: {
  label: string;
  onClose: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      className="btn btn-ghost btn-sm btn-square xl:hidden"
      onClick={onClose}
    >
      ✕
    </button>
  );
}

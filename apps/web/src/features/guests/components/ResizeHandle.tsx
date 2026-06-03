import { useState } from 'react';

interface ResizeHandleProps {
  onMouseDown: (event: React.MouseEvent) => void;
  /** Whether a drag is currently in progress (keeps the handle highlighted). */
  active: boolean;
}

/** A thin draggable divider on the right edge of a panel for resizing it. */
export function ResizeHandle({ onMouseDown, active }: ResizeHandleProps): JSX.Element {
  const [hovered, setHovered] = useState(false);
  const highlighted = hovered || active;

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize guests panel"
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`absolute -right-[3px] bottom-0 top-0 z-[5] w-1.5 cursor-col-resize transition-colors ${
        highlighted ? 'bg-primary/60' : 'bg-transparent'
      }`}
    />
  );
}

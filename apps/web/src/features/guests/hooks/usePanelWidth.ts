import { useCallback, useEffect, useState } from "react";

interface UsePanelWidthOptions {
  storageKey: string;
  defaultWidth: number;
  min: number;
  max: number;
}

interface UsePanelWidth {
  width: number;
  /** mousedown handler for the drag handle. */
  startResize: (event: React.MouseEvent) => void;
  resizing: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Manages a horizontally-resizable panel width with localStorage persistence.
 * Resize is delta-based from the drag start, so it works regardless of where the
 * panel sits in the layout.
 */
export function usePanelWidth({
  storageKey,
  defaultWidth,
  min,
  max,
}: UsePanelWidthOptions): UsePanelWidth {
  const [width, setWidth] = useState<number>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    const parsed = stored !== null ? Number(stored) : NaN;
    return Number.isFinite(parsed) ? clamp(parsed, min, max) : defaultWidth;
  });
  const [resizing, setResizing] = useState(false);

  // Listeners are attached synchronously on mousedown (not via an effect) so the
  // very first mousemove of a drag is never missed.
  const startResize = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = width;
      setResizing(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handleMove = (move: MouseEvent): void => {
        setWidth(clamp(startWidth + (move.clientX - startX), min, max));
      };
      const stop = (): void => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", stop);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        setResizing(false);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", stop);
    },
    [width, min, max],
  );

  useEffect(() => {
    window.localStorage.setItem(storageKey, String(Math.round(width)));
  }, [storageKey, width]);

  return { width, startResize, resizing };
}

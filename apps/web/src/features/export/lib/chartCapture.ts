/**
 * The canvas registers how to render the whole floor plan as an image; the
 * export menu (outside the canvas) asks for it for "Chart image (PNG)". One
 * canvas at a time. (The printed chart is drawn as SVG instead: chartScene.)
 */
type Capture = () => string | null;

let capture: Capture | null = null;

/** Registers the canvas's capture function; returns the unregister function. */
export function registerChartCapture(fn: Capture): () => void {
  capture = fn;
  return () => {
    if (capture === fn) capture = null;
  };
}

/** A PNG data URL of the whole floor plan (null if no canvas is mounted). */
export function captureChart(): string | null {
  return capture?.() ?? null;
}

import { type RefObject, useEffect, useState } from "react";

import type { ViewportSize } from "../lib/chartViewport";

/** An element's content size, live (null until first measured). */
export function useElementSize(ref: RefObject<HTMLElement | null>): ViewportSize | null {
  const [size, setSize] = useState<ViewportSize | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const observer = new ResizeObserver(([entry]) => {
      // Deferred a frame, like the editor canvas: a synchronous re-render here
      // can trip the "ResizeObserver loop" error (e.g. opening DevTools).
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { width, height } = entry.contentRect;
        setSize((current) =>
          current && current.width === width && current.height === height
            ? current
            : { width, height },
        );
      });
    });
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref]);

  return size;
}

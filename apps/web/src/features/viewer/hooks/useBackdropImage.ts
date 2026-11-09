import type { Backdrop } from "@seating/shared";
import { useEffect, useState } from "react";

import type { ViewerImageSource } from "../lib/viewerImages";

export interface BackdropImage {
  url: string;
  /** Natural size, for the aspect ratio. */
  width: number;
  height: number;
}

/**
 * The floor-plan picture for a backdrop, from `images` (null while loading,
 * when there's no picture, or when the source doesn't have it).
 */
export function useBackdropImage(
  backdrop: Backdrop | null,
  images: ViewerImageSource | undefined,
): BackdropImage | null {
  const imageId = backdrop?.imageId ?? null;
  const [loaded, setLoaded] = useState<{ id: string; image: BackdropImage } | null>(null);

  useEffect(() => {
    if (!imageId || !images) return;
    let cancelled = false;
    let url: string | null = null;
    images(imageId)
      .then((blob) => {
        if (cancelled || !blob) return;
        const objectUrl = URL.createObjectURL(blob);
        url = objectUrl;
        const image = new window.Image();
        image.onload = () => {
          if (cancelled) return;
          setLoaded({
            id: imageId,
            image: { url: objectUrl, width: image.naturalWidth, height: image.naturalHeight },
          });
        };
        image.src = objectUrl;
      })
      .catch((error: unknown) => console.error("Couldn’t load the floor-plan image", error));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [imageId, images]);

  return loaded && loaded.id === imageId ? loaded.image : null;
}

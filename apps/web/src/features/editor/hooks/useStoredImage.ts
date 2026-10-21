import { useEffect, useState } from "react";

import { getImage } from "../../storage/repository/imageRepository";
import { activeDb } from "../../storage/store/storageStore";

/** Loads a stored picture (floor plan) as an <img> element, or null while loading / if missing. */
export function useStoredImage(imageId: string | null): HTMLImageElement | null {
  const [loaded, setLoaded] = useState<{ id: string; image: HTMLImageElement } | null>(null);

  useEffect(() => {
    if (!imageId) return;
    let cancelled = false;
    let url: string | null = null;
    void getImage(activeDb(), imageId).then((record) => {
      if (cancelled || !record) return;
      url = URL.createObjectURL(new Blob([record.data], { type: record.mimeType }));
      const image = new window.Image();
      image.onload = () => {
        if (!cancelled) setLoaded({ id: imageId, image });
      };
      image.src = url;
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [imageId]);

  return loaded && loaded.id === imageId ? loaded.image : null;
}

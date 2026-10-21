import type { Backdrop, Size } from "@seating/shared";
import { Image as KonvaImage, Layer } from "react-konva";

import { useStoredImage } from "../../hooks/useStoredImage";

/**
 * The floor-plan picture under everything, fitted to the room's width
 * (aspect kept) from the top-left. Setting the room's real width therefore
 * sets the picture's scale.
 */
export function BackdropLayer({
  backdrop,
  dimensions,
}: {
  backdrop: Backdrop | null;
  dimensions: Size;
}): JSX.Element | null {
  const image = useStoredImage(backdrop?.imageId ?? null);
  if (!backdrop || !image) return null;
  const width = dimensions.width;
  const height = (image.naturalHeight / image.naturalWidth) * width;
  return (
    <Layer listening={false}>
      <KonvaImage
        image={image}
        x={0}
        y={0}
        width={width}
        height={height}
        opacity={backdrop.opacity}
      />
    </Layer>
  );
}

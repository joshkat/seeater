import type { Size } from "@seating/shared";

import type { BackdropImage } from "../hooks/useBackdropImage";

interface ChartBackdropProps {
  image: BackdropImage;
  dimensions: Size;
  opacity: number;
}

/**
 * The floor-plan picture under the chart, placed as in the editor: fitted to
 * the room's width (aspect kept) from the top-left.
 */
export function ChartBackdrop({ image, dimensions, opacity }: ChartBackdropProps): JSX.Element {
  const width = dimensions.width;
  const height = (image.height / Math.max(1, image.width)) * width;
  return (
    <image
      href={image.url}
      x={0}
      y={0}
      width={width}
      height={height}
      opacity={opacity}
      preserveAspectRatio="none"
    />
  );
}

import type { LayoutView } from "@seating/shared";
import type { RefObject } from "react";

import type { ChartScene } from "../../export/lib/chartScene";
import { ChartSvg } from "../../export/components/print/ChartSvg";
import type { ChartViewport } from "../hooks/useChartViewport";
import { useBackdropImage } from "../hooks/useBackdropImage";
import type { SeatMatch } from "../lib/findSeat";
import type { ViewerImageSource } from "../lib/viewerImages";
import { ChartBackdrop } from "./ChartBackdrop";
import { ChartHighlight } from "./ChartHighlight";
import { ViewerZoomControls } from "./ViewerZoomControls";

interface ViewerChartProps {
  scene: ChartScene;
  view: LayoutView;
  viewport: ChartViewport;
  containerRef: RefObject<HTMLDivElement | null>;
  picked: SeatMatch | null;
  images?: ViewerImageSource;
}

/**
 * The seating chart (the print chart's SVG) in a pan-and-zoom pane, with the
 * picked guest's table ringed and the floor-plan picture under it when the
 * image source has it.
 */
export function ViewerChart({
  scene,
  view,
  viewport,
  containerRef,
  picked,
  images,
}: ViewerChartProps): JSX.Element {
  const backdrop = useBackdropImage(view.backdrop, images);
  const empty = scene.tables.length === 0 && scene.objects.length === 0;

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-box border border-base-300 bg-white">
      <div
        ref={containerRef}
        role="group"
        tabIndex={0}
        aria-label={`Seating chart — ${view.name}. Drag to move, pinch or scroll to zoom.`}
        className="absolute inset-0 cursor-grab touch-none select-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 active:cursor-grabbing"
        {...viewport.handlers}
      >
        {empty ? (
          <p className="grid h-full place-items-center p-6 text-center text-neutral-600">
            This layout has no tables yet.
          </p>
        ) : (
          viewport.viewBox && (
            <ChartSvg
              scene={scene}
              label={`Seating chart — ${view.name}`}
              viewBox={viewport.viewBox}
              className="block h-full w-full"
              underlay={
                backdrop &&
                view.backdrop && (
                  <ChartBackdrop
                    image={backdrop}
                    dimensions={view.dimensions}
                    opacity={view.backdrop.opacity}
                  />
                )
              }
              overlay={
                picked?.tableId && (
                  <ChartHighlight scene={scene} tableId={picked.tableId} seatId={picked.seatId} />
                )
              }
            />
          )
        )}
      </div>
      {!empty && (
        <ViewerZoomControls
          onZoomIn={viewport.zoomIn}
          onZoomOut={viewport.zoomOut}
          onFit={viewport.fit}
        />
      )}
    </div>
  );
}

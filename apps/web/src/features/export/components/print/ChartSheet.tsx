import type { ChartScene } from "../../lib/chartScene";
import { ChartLegend } from "./ChartLegend";
import { ChartSvg } from "./ChartSvg";

interface ChartSheetProps {
  scene: ChartScene;
  title: string;
  layoutName: string;
  /** "Tag" or "Meal" when chairs are coloured. */
  colorLabel: string | null;
}

/** The floor plan as one page, with a legend underneath when chairs are coloured. */
export function ChartSheet({ scene, title, layoutName, colorLabel }: ChartSheetProps): JSX.Element {
  return (
    <section className="print-page flex flex-col items-center gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-neutral-600">{layoutName}</p>
      {scene.tables.length === 0 && scene.objects.length === 0 ? (
        <p>This layout has no tables yet.</p>
      ) : (
        <ChartSvg scene={scene} label={`Seating chart — ${layoutName}`} />
      )}
      {colorLabel && scene.legend.length > 0 && (
        <ChartLegend title={`Chair colours: ${colorLabel}`} entries={scene.legend} />
      )}
    </section>
  );
}

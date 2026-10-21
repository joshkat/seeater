interface ChartSheetProps {
  imageUrl: string | null;
  title: string;
  layoutName: string;
}

/** The floor plan as one landscape page. */
export function ChartSheet({ imageUrl, title, layoutName }: ChartSheetProps): JSX.Element {
  return (
    <section className="print-page flex flex-col items-center gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-neutral-500">{layoutName}</p>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`Seating chart — ${layoutName}`}
          className="max-h-[80vh] w-full object-contain"
        />
      ) : (
        <p>The chart couldn’t be drawn. Open the event and try again.</p>
      )}
    </section>
  );
}

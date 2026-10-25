import type { TablePreset } from "@seating/shared";

const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

/** A nominal furniture size in cm: to the nearest 5 below a metre, else 10
 * (presets are converted from inches, e.g. 48″ = 121.9 cm reads "120 cm"). */
function nominalCm(cm: number): number {
  const step = cm < 100 ? 5 : 10;
  return Math.round(cm / step) * step;
}

/** A length in feet when it's whole feet (banquet "6 ft"), else inches. */
function imperialLength(cm: number): string {
  const inches = Math.round(cm / CM_PER_INCH);
  return inches % INCHES_PER_FOOT === 0 ? `${inches / INCHES_PER_FOOT} ft` : `${inches}″`;
}

/**
 * A preset's menu label in the event's units: "Round 120 cm · 6" /
 * "Round 48″ · 6", "Banquet 180 × 75 cm · 6" / "Banquet 6 ft · 6".
 */
export function presetLabel(preset: TablePreset, units: "metric" | "imperial"): string {
  const { width, height } = preset.size;
  let size = "";
  if (preset.shape === "round") {
    size = units === "imperial" ? `${Math.round(width / CM_PER_INCH)}″` : `${nominalCm(width)} cm`;
  } else if (preset.shape === "rectangle") {
    size =
      units === "imperial"
        ? imperialLength(width)
        : `${nominalCm(width)} × ${nominalCm(height)} cm`;
  }
  return `${preset.kind}${size ? ` ${size}` : ""} · ${preset.seatCount}`;
}

import type { UnitSystem } from "@seating/shared";

/** The unit system actually shown: "auto" follows the locale (imperial for US English). */
export function resolveUnits(
  setting: UnitSystem,
  locale: string = typeof navigator !== "undefined" ? navigator.language : "en",
): "metric" | "imperial" {
  if (setting !== "auto") return setting;
  return /^en-(US|LR|MM)$/i.test(locale) || /^my\b/i.test(locale) ? "imperial" : "metric";
}

const CM_PER_INCH = 2.54;
const CM_PER_FOOT = 30.48;

/** A table-sized length for inputs: whole inches or centimetres. */
export function toSmallUnit(cm: number, units: "metric" | "imperial"): number {
  return Math.round(units === "imperial" ? cm / CM_PER_INCH : cm);
}

export function fromSmallUnit(value: number, units: "metric" | "imperial"): number {
  return units === "imperial" ? value * CM_PER_INCH : value;
}

export function smallUnitLabel(units: "metric" | "imperial"): string {
  return units === "imperial" ? "in" : "cm";
}

/** A room-sized length for inputs: whole feet or metres. */
export function toLargeUnit(cm: number, units: "metric" | "imperial"): number {
  return Math.round(units === "imperial" ? cm / CM_PER_FOOT : cm / 100);
}

export function fromLargeUnit(value: number, units: "metric" | "imperial"): number {
  return units === "imperial" ? value * CM_PER_FOOT : value * 100;
}

export function largeUnitLabel(units: "metric" | "imperial"): string {
  return units === "imperial" ? "ft" : "m";
}

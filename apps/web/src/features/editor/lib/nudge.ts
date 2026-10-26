/** One arrow-key nudge and a Shift+arrow nudge, in plan units (cm), with how
 * to write them. Imperial events move by round inches (4″ / 20″), so the
 * cheat sheet and the result agree. */
export interface NudgeSteps {
  step: number;
  large: number;
  stepLabel: string;
  largeLabel: string;
}

const CM_PER_INCH = 2.54;

export function nudgeSteps(units: "metric" | "imperial"): NudgeSteps {
  if (units === "imperial") {
    return { step: 4 * CM_PER_INCH, large: 20 * CM_PER_INCH, stepLabel: "4″", largeLabel: "20″" };
  }
  return { step: 10, large: 50, stepLabel: "10 cm", largeLabel: "50 cm" };
}

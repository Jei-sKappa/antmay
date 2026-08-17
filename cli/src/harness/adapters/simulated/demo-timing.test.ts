import { describe, expect, it } from "vitest";

import { SPEC_CORRECT_DELAY_MS } from "./cases.js";

/**
 * The demo scenario `18-runtime-prerequisite` deletes the thread's plan while a
 * `spec-correct-delayed` attempt is in flight, so its `during` hook has to fire
 * inside the window that case holds open. The scenario is a `.mjs` file the demo
 * runs against the built bundle, so it cannot import `SPEC_CORRECT_DELAY_MS`
 * itself and states its own delay as a literal — and `scripts/` sits outside the
 * typecheck gate, so nothing there is compared with the constant either.
 *
 * This case is where the two values meet: it imports the scenario module by URL
 * at test runtime and the constant from source, so moving either one alone fails
 * `npm run check`.
 */
const SCENARIO_URL = new URL(
  "../../../../scripts/scenarios/18-runtime-prerequisite.mjs",
  import.meta.url,
);

/** One step of a demo scenario, in the shape `scripts/demo/steps.mjs` builds. */
type DemoStep = {
  kind?: unknown;
  afterMs?: unknown;
  during?: unknown;
};

/**
 * The scenario's invocations that change the world underneath a live child, which
 * are the only ones whose `afterMs` has to land in a simulated case's window.
 */
async function loadTimedInvocations(): Promise<DemoStep[]> {
  const module: { default: { steps: readonly DemoStep[] } } = await import(
    SCENARIO_URL.href
  );
  return module.default.steps.filter(
    (step) => step.kind === "invoke" && step.during !== undefined,
  );
}

describe("the runtime-prerequisite demo scenario's timing", () => {
  it("deletes the plan before the delayed spec case finishes", async () => {
    const timed = await loadTimedInvocations();
    expect(
      timed.length,
      "18-runtime-prerequisite must have exactly one timed invocation",
    ).toBe(1);

    const afterMs = timed[0]?.afterMs;
    expect(
      typeof afterMs,
      "the scenario's timed invocation must declare a numeric afterMs",
    ).toBe("number");
    expect(
      afterMs as number,
      "afterMs must fire inside the window spec-correct-delayed holds open",
    ).toBeLessThan(SPEC_CORRECT_DELAY_MS);
  });
});

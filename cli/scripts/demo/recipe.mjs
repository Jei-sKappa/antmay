/**
 * The scripted-harness document every scenario starts from. A scenario states
 * only the stage it is demonstrating; the rest of the recipe runs correctly
 * underneath it, so each file reads as "the standard run, except this one stage".
 */

/** Every stage of the `standard` recipe driven by its correct case. */
const CORRECT_STAGES = {
  spec: ["spec-correct"],
  "reconcile-spec": ["reconcile-spec-correct"],
  "review-spec": ["outcome-done"],
  "plan-strict": ["plan-strict-correct"],
  "reconcile-plan": ["reconcile-plan-correct"],
  "implement-plan-with-subagents": ["implement-plan-with-subagents-correct"],
};

/**
 * A scripted-harness document for the `standard` recipe. Each key of `overrides`
 * replaces that stage's case list; every other stage keeps its correct case.
 *
 * A stage's value is the ordered list of cases its successive attempts select,
 * so `{ "reconcile-spec": ["outcome-blocked", "reconcile-spec-correct"] }` blocks
 * the first attempt and succeeds on the retry.
 */
export function standardScenario(overrides = {}) {
  for (const stageId of Object.keys(overrides)) {
    if (!(stageId in CORRECT_STAGES)) {
      throw new Error(`${stageId} is not a stage of the standard recipe.`);
    }
  }
  return {
    schemaVersion: 0,
    stages: { ...CORRECT_STAGES, ...overrides },
  };
}

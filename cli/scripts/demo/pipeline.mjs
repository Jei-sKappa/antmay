/**
 * The documents the demo's isolated config root is built from, and the
 * scripted-harness document a scenario overrides one stage of.
 *
 * Every document here uses the production schema the CLI validates, so a demo
 * run exercises exactly the files a user would write: a pipeline document under
 * `pipelines/`, an optional execution profile under `profiles/`, and one
 * `settings.json` binding each stage to an agent. A scenario states only what it
 * is demonstrating; the rest runs correctly underneath it, so each file reads as
 * "the standard run, except this one thing".
 */

/**
 * Every stage the trusted catalog offers. The demo's settings document binds all
 * of them, so any pipeline a scenario declares finds a binding for each stage it
 * selects.
 */
export const CATALOG_STAGE_IDS = [
  "spec",
  "reconcile-spec",
  "review-spec",
  "plan-brief",
  "plan-strict",
  "reconcile-plan",
  "implement",
  "implement-plan",
  "implement-plan-with-subagents",
];

/** The six stages of the Standard pipeline, in execution order. */
export const STANDARD_STAGE_IDS = [
  "spec",
  "reconcile-spec",
  "review-spec",
  "plan-strict",
  "reconcile-plan",
  "implement-plan-with-subagents",
];

/** A pipeline document selecting `stageIds` in order under a declared `name`. */
export function pipelineDocument(name, stageIds) {
  for (const stageId of stageIds) {
    if (!CATALOG_STAGE_IDS.includes(stageId)) {
      throw new Error(`${stageId} is not a catalog stage.`);
    }
  }
  return {
    schemaVersion: 0,
    name,
    stages: stageIds.map((stage) => ({ stage })),
  };
}

/** The pipeline every scenario runs unless it declares one of its own. */
export const STANDARD_PIPELINE = pipelineDocument("standard", STANDARD_STAGE_IDS);

/** The agent every stage is bound to in the demo's settings document. */
const SETTINGS_AGENT = { harness: "claude-code", model: "claude-sonnet-5" };

/**
 * The demo's canonical `settings.json`: one complete binding per catalog stage.
 * Each key of `overrides` is merged over that stage's binding, which is how a
 * scenario needing different executor configuration — a shorter heartbeat, say —
 * changes it through the same field a user would.
 */
export function settingsDocument(overrides = {}) {
  for (const stageId of Object.keys(overrides)) {
    if (!CATALOG_STAGE_IDS.includes(stageId)) {
      throw new Error(`${stageId} is not a catalog stage.`);
    }
  }
  const stages = {};
  for (const stageId of CATALOG_STAGE_IDS) {
    stages[stageId] = { agent: { ...SETTINGS_AGENT }, ...overrides[stageId] };
  }
  return { afk: { stages } };
}

/**
 * A named execution profile binding the two planning stages to the other
 * harness. A scenario selecting it shows the profile summary form and a run
 * whose stages do not all share one agent; every stage it omits keeps the
 * settings binding.
 */
export const DEMO_PROFILE = {
  schemaVersion: 0,
  name: "codex-planning",
  stages: {
    "plan-strict": { agent: { harness: "codex", model: "gpt-5-codex" } },
    "reconcile-plan": { agent: { harness: "codex", model: "gpt-5-codex" } },
  },
};

/**
 * The case that drives a stage correctly. A stage with no case of its own is
 * driven by the generic DONE case, which is enough for a stage a scenario never
 * reaches.
 */
const CORRECT_CASE = {
  spec: "spec-correct",
  "reconcile-spec": "reconcile-spec-correct",
  "review-spec": "outcome-done",
  "plan-strict": "plan-strict-correct",
  "reconcile-plan": "reconcile-plan-correct",
  "implement-plan-with-subagents": "implement-plan-with-subagents-correct",
};

/**
 * A scripted-harness document keyed by exactly `stageIds` — the stage IDs the
 * run selects, which is what the executor validates the document against. Each
 * key of `overrides` replaces that stage's case list; every other stage keeps
 * its correct case.
 *
 * A stage's value is the ordered list of cases its successive attempts select,
 * so `{ "reconcile-spec": ["outcome-blocked", "reconcile-spec-correct"] }` blocks
 * the first attempt and succeeds on the retry.
 */
export function scriptedRun(stageIds, overrides = {}) {
  for (const stageId of Object.keys(overrides)) {
    if (!stageIds.includes(stageId)) {
      throw new Error(`${stageId} is not a selected stage of this run.`);
    }
  }
  const stages = {};
  for (const stageId of stageIds) {
    stages[stageId] = overrides[stageId] ?? [CORRECT_CASE[stageId] ?? "outcome-done"];
  }
  return { schemaVersion: 0, stages };
}

/** The scripted document for a run selecting the whole Standard pipeline. */
export function standardScenario(overrides = {}) {
  return scriptedRun(STANDARD_STAGE_IDS, overrides);
}

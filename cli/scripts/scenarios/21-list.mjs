import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { action, list } from "../demo/steps.mjs";

/**
 * Four runs in four conditions, listed in one table. Ends on the run listing —
 * the only rendering that draws many runs at once, and the only one where a
 * completed row's missing harness column sits next to rows that have it.
 *
 * The checkpoints are written straight into the state root rather than produced
 * by four runs, because two of the four conditions are not reachable on demand:
 * `ready` survives only microseconds between two writes, and `executing` needs a
 * run killed mid-attempt. Seeding is also what lets the timestamps be fixed, so
 * the table renders identically every time and a rendering change is the only
 * thing a diff of two runs can show.
 *
 * `list` validates every checkpoint it reads and exits 1 on an invalid one, so
 * this scenario's `expectExit: 0` is what keeps the seeds honest: a checkpoint
 * schema change that these rows do not follow fails the scenario.
 */

/** One fully resolved local binding, as preflight settles it onto a stage. */
const CLAUDE = {
  agent: { harness: "claude-code", model: "claude-sonnet-5" },
  idleTimeoutSeconds: 86_400,
  heartbeatSeconds: 300,
};

const CODEX = {
  ...CLAUDE,
  agent: { harness: "codex", model: "gpt-5.6-terra" },
};

const THREAD_ROOT = { kind: "fixed", target: { kind: "thread-root" } };
const SPEC_TARGET = {
  kind: "fixed",
  target: { kind: "thread-file", path: "spec.md" },
};
const PLAN_TARGET = {
  kind: "fixed",
  target: { kind: "thread-file", path: "plan.md" },
};

const SPEC_FILE = { kind: "exact-file", threadRelativePath: "spec.md" };
const PLAN_FILE = { kind: "exact-file", threadRelativePath: "plan.md" };
const PLAN_TASKS = { kind: "subtree", threadRelativePath: "plan-tasks" };
const REPORT_FILE = {
  kind: "exact-file",
  threadRelativePath: "implementation-report.md",
};

/**
 * The six stages the `standard` pipeline selects, copied field for field from
 * `src/pipeline/catalog.ts` — the same descriptors a real run snapshots, minus
 * the two fields only a run can settle (`resolvedTarget` and `binding`), which
 * `stageFor` adds. The rows are what a reader learns a snapshotted stage looks
 * like from, so they follow the catalog rather than a uniform placeholder.
 */
const STAGES = [
  {
    id: "spec",
    targetRule: THREAD_ROOT,
    prerequisite: { validThread: true },
    promises: { spec: true },
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [SPEC_FILE],
      changeRequired: true,
      commitSubjectTemplate: "docs(<thread-folder>): spec",
    },
    queueResolution: "advance",
  },
  {
    id: "reconcile-spec",
    targetRule: SPEC_TARGET,
    prerequisite: { validThread: true, spec: true },
    promises: { spec: true },
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [SPEC_FILE],
      changeRequired: false,
      commitSubjectTemplate: "docs(<thread-folder>): reconcile spec",
    },
    queueResolution: "rerun",
  },
  {
    id: "review-spec",
    targetRule: SPEC_TARGET,
    prerequisite: { validThread: true, spec: true },
    promises: { spec: true },
    // The one read-only stage: it may leave nothing behind, so it commits
    // nothing and declares no subject to commit it under.
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [],
      changeRequired: false,
      commitSubjectTemplate: null,
    },
    queueResolution: "rerun",
  },
  {
    id: "plan-strict",
    targetRule: SPEC_TARGET,
    prerequisite: { validThread: true, spec: true },
    promises: { plan: "strict" },
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [PLAN_FILE, PLAN_TASKS],
      changeRequired: true,
      commitSubjectTemplate: "docs(<thread-folder>): plan",
    },
    queueResolution: "advance",
  },
  {
    id: "reconcile-plan",
    targetRule: PLAN_TARGET,
    prerequisite: { validThread: true, spec: true, plan: "strict" },
    promises: { plan: "strict" },
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [PLAN_FILE, PLAN_TASKS],
      changeRequired: false,
      commitSubjectTemplate: "docs(<thread-folder>): reconcile plan",
    },
    queueResolution: "rerun",
  },
  {
    id: "implement-plan-with-subagents",
    targetRule: PLAN_TARGET,
    prerequisite: { validThread: true, plan: "strict" },
    promises: { implementationReport: true },
    // The skill makes its own per-task code commits, so `HEAD` moves during
    // the attempt and the report is the only change the boundary commits.
    gitPolicy: {
      headMayChange: true,
      allowedChanges: [REPORT_FILE],
      changeRequired: true,
      commitSubjectTemplate: "docs(<thread-folder>): implementation report",
    },
    queueResolution: "rerun",
  },
];

/** One snapshotted stage: the catalog descriptor, the concrete target the run
 * settled on, and the binding it resolved to. */
function stageFor(stage, threadRelPath, binding) {
  const { target } = stage.targetRule;
  return {
    ...stage,
    skill: stage.id,
    resolvedTarget:
      target.kind === "thread-root"
        ? `${threadRelPath}/`
        : `${threadRelPath}/${target.path}`,
    binding,
  };
}

/**
 * The four rows, in the order the listing sorts them: `updatedAt` descending.
 * Each names only what distinguishes it; everything else comes from the one
 * checkpoint shape below, so a schema change is a single edit.
 */
const ROWS = [
  {
    runId: "20260726T091500000Z-11aa22bb",
    updatedAt: "2026-07-26T09:18:42.000Z",
    condition: "waiting-for-user",
    stageIndex: 2,
    slug: "extract-the-boundary-selector-resolver",
    binding: CLAUDE,
  },
  {
    runId: "20260726T084500000Z-33cc44dd",
    updatedAt: "2026-07-26T08:52:07.000Z",
    condition: "executing",
    stageIndex: 1,
    slug: "normalize-thread-relative-paths-before-comparison",
    binding: CODEX,
  },
  {
    runId: "20260726T081000000Z-55ee66ff",
    updatedAt: "2026-07-26T08:14:55.000Z",
    condition: "ready",
    stageIndex: 4,
    slug: "retry-budget",
    binding: CLAUDE,
  },
  {
    runId: "20260725T173000000Z-77aa88bb",
    updatedAt: "2026-07-25T17:41:19.000Z",
    condition: "completed",
    stageIndex: STAGES.length,
    slug: "teach-the-executor-to-report-its-own-version",
    binding: CLAUDE,
  },
];

const HEAD = "4f1c0a9e6d2b8571c3ae04fd9b7e15286aa3c0d4";

const WAITING = {
  reasons: [
    {
      kind: "outcome-blocked",
      message: "The stage reported Outcome: BLOCKED and paused for human attention.",
      detail: "The spec claims a write path the roadmap allocates elsewhere.",
    },
  ],
  nextAction:
    "The attempt's file changes are unvalidated: revert them or deliberately " +
    "commit them before resuming.",
};

/**
 * Every attempt the run has settled: one `done` per stage already behind the
 * cursor, plus the live or parked attempt at the cursor itself. The validator
 * ties these to the condition — exactly the final attempt is `executing` iff the
 * run is — so they are derived rather than restated per row.
 */
function attemptsFor(condition, stageIndex) {
  const attempts = [];
  for (let i = 0; i < Math.min(stageIndex, STAGES.length); i += 1) {
    const { id } = STAGES[i];
    attempts.push({
      attempt: 1,
      stageIndex: i,
      stageId: id,
      startedAt: "2026-07-26T08:00:00.000Z",
      endedAt: "2026-07-26T08:01:00.000Z",
      result: "done",
      terminalResult: {
        token: "DONE",
        candidateLine: `Outcome: DONE — ${id} finished.`,
        detail: `— ${id} finished.`,
      },
      // Every settled attempt carries an ID-only session so each row shows a
      // latest-session column; multiple sessions on one run exercise newest
      // selection (only the final session-carrying attempt is rendered).
      agentSession: { id: `scripted-session-${id}-1` },
      logPath: `logs/${String(i + 1).padStart(2, "0")}-${id}-attempt-01.log`,
    });
  }
  if (condition === "executing" || condition === "waiting-for-user") {
    const { id } = STAGES[stageIndex];
    attempts.push({
      attempt: 1,
      stageIndex,
      stageId: id,
      startedAt: "2026-07-26T08:02:00.000Z",
      ...(condition === "executing"
        ? { result: "executing", terminalResult: null }
        : {
            endedAt: "2026-07-26T08:03:00.000Z",
            result: "waiting",
            terminalResult: {
              token: "BLOCKED",
              candidateLine: "Outcome: BLOCKED — the spec contradicts the roadmap.",
              detail: "— the spec contradicts the roadmap.",
            },
          }),
      agentSession: { id: `scripted-session-${id}-1` },
      logPath: `logs/${String(stageIndex + 1).padStart(2, "0")}-${id}-attempt-01.log`,
    });
  }
  return attempts;
}

/** One complete checkpoint. Only the fields a row names differ between rows. */
function checkpointFor(ctx, row) {
  const threadRelPath = `docs/threads/260726081500Z-${row.slug}`;
  const completed = row.condition === "completed";
  return {
    schemaVersion: 0,
    runId: row.runId,
    executor: { pid: 4242, version: "0.1.0" },
    createdAt: "2026-07-26T08:00:00.000Z",
    updatedAt: row.updatedAt,
    repoRoot: ctx.repoRoot,
    threadRelPath,
    workspace: {
      strategy: "current-checkout",
      path: ctx.repoRoot,
      execution: { cwd: ctx.repoRoot, sandbox: "none", branchStrategy: "head" },
    },
    dangerouslySkipPermissions: false,
    pipelineName: "standard",
    pipelineSourcePath: path.join(ctx.configRoot, "pipelines", "standard.json"),
    profileSelection: { kind: "settings-only" },
    stages: STAGES.map((stage) => stageFor(stage, threadRelPath, row.binding)),
    observedHarnessVersions: {
      [row.binding.agent.harness]: `${row.binding.agent.harness} 1.0.0`,
    },
    stageIndex: row.stageIndex,
    condition: row.condition,
    attempts: attemptsFor(row.condition, row.stageIndex),
    waiting: row.condition === "waiting-for-user" ? WAITING : null,
    // A completed run parks its cursor past the last stage and holds no HEAD;
    // every other cursor names the stage it sits on, which the validator ties
    // to `stageIndex` whenever the HEAD observation is populated.
    gitCursor: completed
      ? { stageIndex: STAGES.length, observedHead: null }
      : { stageIndex: row.stageIndex, observedHead: HEAD },
  };
}

function seedRuns(ctx) {
  for (const row of ROWS) {
    const runDir = path.join(ctx.stateRoot, "afk-runs", row.runId);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(
      path.join(runDir, "state.json"),
      `${JSON.stringify(checkpointFor(ctx, row), null, 2)}\n`,
    );
  }
}

export default {
  label: "Four runs in four conditions — ends on the run listing",
  note: "Writes four checkpoints straight into the state root, because `ready` and `executing` cannot be produced on demand by a run. `list` validates every one of them, so the scenario fails if the checkpoint schema moves out from under these rows.",
  steps: [
    action(`seed ${ROWS.length} runs into the state root`, seedRuns),
    list({ expectExit: 0 }),
  ],
};

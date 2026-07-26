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

const CLAUDE = {
  harness: "claude-code",
  model: "claude-sonnet-5",
  prompt: "Do not stop for confirmation. Assume the user is AFK.",
  idleTimeoutSeconds: 86_400,
  heartbeatSeconds: 300,
};

const CODEX = { ...CLAUDE, harness: "codex", model: "gpt-5.6-terra" };

/** The `standard` pipeline's stages, each with the file its boundary commits. */
const STAGES = [
  ["spec", "spec.md"],
  ["reconcile-spec", "spec.md"],
  ["review-spec", "review-spec.md"],
  ["plan-strict", "plan.md"],
  ["reconcile-plan", "plan.md"],
  ["implement-plan-with-subagents", "implementation-report.md"],
];

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
    profile: CLAUDE,
  },
  {
    runId: "20260726T084500000Z-33cc44dd",
    updatedAt: "2026-07-26T08:52:07.000Z",
    condition: "executing",
    stageIndex: 1,
    slug: "normalize-thread-relative-paths-before-comparison",
    profile: CODEX,
  },
  {
    runId: "20260726T081000000Z-55ee66ff",
    updatedAt: "2026-07-26T08:14:55.000Z",
    condition: "ready",
    stageIndex: 4,
    slug: "retry-budget",
    profile: CLAUDE,
  },
  {
    runId: "20260725T173000000Z-77aa88bb",
    updatedAt: "2026-07-25T17:41:19.000Z",
    condition: "completed",
    stageIndex: STAGES.length,
    slug: "teach-the-executor-to-report-its-own-version",
    profile: CLAUDE,
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
    const [id] = STAGES[i];
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
      logPath: `logs/${String(i + 1).padStart(2, "0")}-${id}-attempt-01.log`,
    });
  }
  if (condition === "executing" || condition === "waiting-for-user") {
    const [id] = STAGES[stageIndex];
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
    stages: STAGES.map(([id, file]) => ({
      id,
      skill: id,
      target: { kind: "thread-root" },
      gitPolicy: {
        headMayChange: false,
        allowedChanges: [{ kind: "exact-file", threadRelativePath: file }],
        changeRequired: true,
        commitSubjectTemplate: `docs(<thread-folder>): ${id}`,
      },
      queueResolution: "advance",
      profile: row.profile,
      resolvedTarget: `${threadRelPath}/`,
    })),
    observedHarnessVersions: { [row.profile.harness]: `${row.profile.harness} 1.0.0` },
    stageIndex: row.stageIndex,
    condition: row.condition,
    attempts: attemptsFor(row.condition, row.stageIndex),
    waiting: row.condition === "waiting-for-user" ? WAITING : null,
    // A completed run parks its cursor past the last stage and holds no HEAD;
    // every other cursor names the stage it sits on, which the validator ties
    // to `stageIndex` whenever the HEAD fields are populated.
    gitCursor: completed
      ? { stageIndex: STAGES.length, headAtStageEntry: null, observedHead: null }
      : { stageIndex: row.stageIndex, headAtStageEntry: HEAD, observedHead: HEAD },
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

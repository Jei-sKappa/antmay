import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { pipelineDocument, scriptedRun } from "../demo/pipeline.mjs";
import { action, resume } from "../demo/steps.mjs";

/**
 * A run allocated against a real harness is asked to continue through the
 * scripted one. Ends on the `Run cannot resume` block that names the run,
 * states that its runtime is fixed for the run's whole life, and gives the one
 * correction — unset the toggle and resume again — that continues it.
 *
 * The demo injects the scripted toggle into every child CLI process, so that
 * toggle is already the mismatch this scenario needs: all it has to supply is a
 * run whose recorded runtime is the real provider. That run is seeded straight
 * into the state root because no demo invocation can produce one. The scripted
 * document below is written for the same reason every resume scenario writes
 * one, and this resume never reads it: the runtime identity is enforced ahead of
 * the live scenario, the probe, the lock, and every mutation, so the seeded
 * checkpoint is still byte-for-byte what the action wrote.
 *
 * Resume validates the checkpoint before it reaches the runtime check, and both
 * a rejected document and this refusal exit 1, so read the block on screen
 * rather than the exit code alone: a seed that drifts from the schema reports
 * the malformed checkpoint instead.
 */

const PIPELINE = pipelineDocument("spec-only", ["spec"]);

const RUN_ID = "20260726T101500000Z-9c3f10ab";

/**
 * The `spec` stage as a run snapshots it: the catalog descriptor field for
 * field, the concrete target composition settled on, and the binding preflight
 * resolved from the demo's settings document.
 */
function specStage(threadRelPath) {
  return {
    id: "spec",
    skill: "spec",
    targetRule: { kind: "fixed", target: { kind: "thread-root" } },
    prerequisite: { validThread: true },
    promises: { spec: true },
    gitPolicy: {
      headMayChange: false,
      allowedChanges: [{ kind: "exact-file", threadRelativePath: "spec.md" }],
      changeRequired: true,
      commitSubjectTemplate: "docs(<thread-folder>): spec",
    },
    queueResolution: "advance",
    resolvedTarget: `${threadRelPath}/`,
    binding: {
      agent: { harness: "claude-code", model: "claude-sonnet-5" },
      idleTimeoutSeconds: 86_400,
      heartbeatSeconds: 300,
    },
  };
}

/**
 * One run whose cursor is ready at its first stage and whose runtime is the real
 * provider — the least a resume needs to get as far as the runtime check, which
 * is where this scenario ends.
 */
function seedRealRun(ctx) {
  const threadRelPath = `docs/threads/${ctx.threadName}`;
  const checkpoint = {
    schemaVersion: 0,
    runId: RUN_ID,
    executor: { pid: 4242, version: "0.1.0" },
    createdAt: "2026-07-26T10:15:00.000Z",
    updatedAt: "2026-07-26T10:15:04.000Z",
    repoRoot: ctx.repoRoot,
    threadRelPath,
    workspace: {
      strategy: "current-checkout",
      path: ctx.repoRoot,
      execution: { cwd: ctx.repoRoot, sandbox: "none", branchStrategy: "head" },
    },
    dangerouslySkipPermissions: false,
    pipelineName: PIPELINE.name,
    pipelineSourcePath: path.join(
      ctx.configRoot,
      "pipelines",
      `${PIPELINE.name}.json`,
    ),
    profileSelection: { kind: "settings-only" },
    stages: [specStage(threadRelPath)],
    // What a real `claude --version` reported when the run was allocated.
    observedHarnessVersions: { "claude-code": "2.1.0 (Claude Code)" },
    runtime: { kind: "real" },
    stageIndex: 0,
    condition: "ready",
    attempts: [],
    waiting: null,
  };
  const runDir = path.join(ctx.stateRoot, "afk-runs", RUN_ID);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    path.join(runDir, "state.json"),
    `${JSON.stringify(checkpoint, null, 2)}\n`,
  );
}

export default {
  label: "Scripted toggle on a real-harness run — ends on the runtime refusal",
  note: "Seeds one real-harness run into the state root, because every demo invocation carries the scripted toggle and so can only create a scripted run. Resume then meets that toggle on a run it may not switch.",
  pipeline: PIPELINE,
  scenario: scriptedRun(["spec"]),
  steps: [
    action("seed a real-harness run into the state root", seedRealRun),
    resume({ expectExit: 1 }),
  ],
};

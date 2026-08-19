import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  EXIT_FAILURE,
  EXIT_OK,
  EXIT_SIGINT,
  EXIT_SIGTERM,
  EXIT_WAITING,
} from "../cli/exit-codes.js";
import type {
  ExecutionContext,
  ExecutionEntry,
  ExecutionResult,
} from "../execution/engine.js";
import type { HarnessId } from "../harness/id.js";
import type { HarnessExecutableProbe } from "../harness/adapters/probe.js";
import { SIMULATED_SCENARIO_FILENAME } from "../harness/adapters/simulated/scenario.js";
import { SIMULATED_HARNESS_TOGGLE_VAR } from "../harness/adapters/simulated/toggle.js";
import { SignalInterruption } from "../runner/signals.js";
import { readCheckpoint } from "../state/checkpoint/read.js";
import { runsDirectory } from "../state/runs.js";
import { governedBy, reasonOf } from "../test-helpers/waiting.js";
import {
  ClosedPipe,
  SIGNAL_EXIT,
  STANDARD_STAGE_IDS,
  commitSubjects,
  fakeSignals,
  lockNames,
  okProbe,
  pipelineDocument,
  run,
  runDirNames,
  simulatedEnv,
  setup,
  soleCheckpointDir,
  standardSimulatedScenario,
  standardSteps,
  writeSimulatedScenario,
  writeThreadFile,
} from "../test-helpers/run-harness.js";

/**
 * What a new run does once it is allocated: signals, simulated-harness mode, and
 * the engine handoff.
 */

describe.concurrent("runCommand — signal interruption (AC-17.1, AC-17.2)", () => {
  it("returns the signal exit code and creates no run when interrupted before allocation", async () => {
    const h = await setup();
    const result = await run(h, standardSteps(h), {
      installSignals: fakeSignals(() => "SIGINT"),
    });
    expect(result.code).toBe(EXIT_SIGINT);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("releases the lock and leaves the ready checkpoint when interrupted after allocation", async () => {
    const h = await setup();
    let phase: "pre" | "post" = "pre";
    let uninstalled = false;
    const result = await run(h, standardSteps(h), {
      generateId: () => {
        // Allocation itself never observes signals; flipping here makes the
        // post-allocation checkpoint see SIGINT before launch.
        phase = "post";
        return "postalloc-sig-000000";
      },
      installSignals: () => ({
        signaled: () => (phase === "post" ? "SIGINT" : null),
        exitCodeFor: (sig) => SIGNAL_EXIT[sig] ?? EXIT_SIGINT,
        uninstall: () => {
          uninstalled = true;
        },
      }),
    });

    expect(result.code).toBe(EXIT_SIGINT);
    const runDir = path.join(runsDirectory(h.stateRoot), "postalloc-sig-000000");
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.condition).toBe("ready");
      expect(cp.checkpoint.runId).toBe("postalloc-sig-000000");
    }
    expect(await lockNames(h.stateRoot)).toEqual([]);
    expect(uninstalled).toBe(true);
  });

  it("maps an active interruption to the signal exit code, not the durable-pause code", async () => {
    const h = await setup();
    const controller = new AbortController();
    const result = await run(
      h,
      [{ before: () => controller.abort(new SignalInterruption("SIGINT")), hangUntilAbort: true }],
      {
        createAbortController: () => controller,
        installSignals: fakeSignals(() => null),
      },
    );

    expect(result.code).toBe(EXIT_SIGINT);
    expect(result.code).not.toBe(2);
    const runDir = await soleCheckpointDir(h.stateRoot);
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.condition).toBe("waiting-for-user");
      expect(cp.checkpoint.waiting?.reasons[0].kind).toBe("interrupted");
    }
    // The lock is released before the command returns the signal exit code.
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });
});

describe.concurrent("runCommand — simulated harness mode (FR-1, FR-5, FR-6)", () => {
  it("rejects a non-exact toggle before allocation", async () => {
    const h = await setup();
    const result = await run(h, [], {
      env: { [SIMULATED_HARNESS_TOGGLE_VAR]: "true" },
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain(SIMULATED_HARNESS_TOGGLE_VAR);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
  });

  it("rejects a missing scenario file before allocation", async () => {
    const h = await setup();
    const result = await run(h, [], { env: simulatedEnv(h) });
    expect(result.code).toBe(1);
    expect(result.err).toContain(SIMULATED_SCENARIO_FILENAME);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
  });

  it("records the simulated runtime, prints startup output, and uses simulated seams", async () => {
    const h = await setup({
      stages: STANDARD_STAGE_IDS,
      pipeline: pipelineDocument([
        { stage: "spec", instructions: "Prefer small changes.\nCheck tests." },
        ...STANDARD_STAGE_IDS.slice(1),
      ]),
    });
    const scenarioPath = await writeSimulatedScenario(h);
    const result = await run(h, [], {
      env: simulatedEnv(h),
    });
    expect(result.code).toBe(0);
    expect(result.out).toContain("[DEV] Simulated harness");
    expect(result.out).toContain(scenarioPath);
    // The simulated note precedes the otherwise-unchanged startup output.
    expect(result.out.indexOf("[DEV] Simulated harness")).toBeLessThan(
      result.out.indexOf("Run details"),
    );
    expect(result.out.match(/\[DEV\] Resolved prompt/g)).toHaveLength(6);
    const firstStage = result.out.indexOf("Stage 1/6 · spec");
    const firstPrompt = result.out.indexOf("[DEV] Resolved prompt");
    const firstPromptBody = result.out.indexOf("[DEV] $spec `");
    const firstTranscript = result.out.indexOf("│ Writing spec.md.");
    expect(firstStage).toBeLessThan(firstPrompt);
    expect(firstPrompt).toBeLessThan(firstPromptBody);
    expect(firstPromptBody).toBeLessThan(firstTranscript);
    expect(result.out).toContain(
      `[DEV] $spec \`${h.fixture.threadRelPath}/\`. Prefer small changes.\n` +
        "[DEV] Check tests.",
    );

    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.runtime).toEqual({ kind: "simulated" });
      expect(cp.checkpoint.condition).toBe("completed");
      expect(cp.checkpoint.observedHarnessVersions.codex).toContain("simulated-harness");
    }
    const folder = h.fixture.threadFolder as string;
    const subjects = await commitSubjects(h.fixture);
    expect(subjects).toContain(`docs(${folder}): spec`);
    expect(subjects).toContain(`docs(${folder}): plan`);
    expect(subjects).toContain(`docs(${folder}): implementation report`);
  });

  it("rejects a bare outcome-done that leaves the promised spec absent (AC-7.2, AC-7.3)", async () => {
    const h = await setup();
    await writeSimulatedScenario(
      h,
      standardSimulatedScenario({ spec: ["outcome-done"] }, h.stages),
    );
    const result = await run(h, [], { env: simulatedEnv(h) });
    expect(result.code).toBe(2);
    const runDir = await soleCheckpointDir(h.stateRoot);
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      // The promised state is checked before the boundary is looked at, so the
      // pause names the missing artifact rather than the empty diff.
      expect(
        reasonOf(cp.checkpoint.waiting?.reasons[0], "stage-contract-unmet").contract,
      ).toEqual([{ dimension: "spec", expected: true, observed: false }]);
      expect(cp.checkpoint.stageIndex).toBe(0);
    }
  });

  it("pauses when the implement stage reaches DONE without leaving a report", async () => {
    const h = await setup({ stages: STANDARD_STAGE_IDS });
    await writeSimulatedScenario(
      h,
      standardSimulatedScenario(
        { "implement-plan-with-subagents": ["outcome-done"] },
        h.stages,
      ),
    );
    const result = await run(h, [], { env: simulatedEnv(h) });
    expect(result.code).toBe(2);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.stageIndex).toBe(5);
      expect(
        reasonOf(cp.checkpoint.waiting?.reasons[0], "stage-contract-unmet").contract,
      ).toEqual([
        { dimension: "implementationReport", expected: true, observed: false },
      ]);
    }
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).not.toContain(
      `docs(${folder}): implementation report`,
    );
  });

  it("leaves real mode unchanged when the toggle is unset", async () => {
    const h = await setup();
    let probeHarnesses: HarnessId[] = [];
    const trackingProbe: HarnessExecutableProbe = async (harnesses, repoRoot) => {
      probeHarnesses = [...harnesses];
      return okProbe(harnesses, repoRoot);
    };
    const result = await run(h, standardSteps(h), { probe: trackingProbe });
    expect(result.code).toBe(0);
    expect(probeHarnesses.length).toBeGreaterThan(0);
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (cp.ok) {
      expect(cp.checkpoint.runtime).toEqual({ kind: "real" });
    }
    expect(result.out).not.toContain("[DEV] Resolved prompt");
  });

  it("validates the scenario against the selected suffix only", async () => {
    const h = await setup({ stages: STANDARD_STAGE_IDS });
    await writeThreadFile(h.fixture, "spec.md", "# Spec\n");
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "docs: spec"]);
    // A scenario covering every document stage now over-covers the suffix.
    await writeSimulatedScenario(h);

    const overCovered = await run(h, [], {
      env: simulatedEnv(h),
      from: "plan-strict",
    });
    expect(overCovered.code).toBe(1);
    expect(overCovered.err).toContain("stages.spec is not an expected stage id.");
    expect(await runDirNames(h.stateRoot)).toEqual([]);

    await writeSimulatedScenario(h, {
      schemaVersion: 0,
      stages: {
        "plan-strict": ["plan-strict-correct"],
        "reconcile-plan": ["reconcile-plan-correct"],
        "implement-plan-with-subagents": [
          "implement-plan-with-subagents-correct",
        ],
      },
    });
    const suffixOnly = await run(h, [], {
      env: simulatedEnv(h),
      from: "plan-strict",
    });
    expect(suffixOnly.code).toBe(0);
  });
});

describe("runCommand — engine handoff (AC-1.1)", () => {
  const cases: Array<{
    name: string;
    result: ExecutionResult;
    code: number;
    stderr?: string;
  }> = [
    { name: "completion", result: { kind: "completed" }, code: EXIT_OK },
    {
      name: "a durable pause",
      result: {
        kind: "paused",
        waiting: governedBy({
          kind: "outcome-blocked",
          message: "blocked",
          agentReason: null,
        }),
      },
      code: EXIT_WAITING,
    },
    {
      name: "an interruption",
      result: { kind: "interrupted", signal: "SIGTERM" },
      code: EXIT_SIGTERM,
    },
    {
      name: "a refused gate",
      result: { kind: "refused", message: "the worktree is not clean" },
      code: EXIT_FAILURE,
      stderr: "the worktree is not clean",
    },
    {
      name: "a fatal checkpoint error",
      result: { kind: "fatal-checkpoint", message: "disk full" },
      code: EXIT_FAILURE,
      stderr: "disk full",
    },
  ];

  for (const testCase of cases) {
    it(`enters the engine with the allocated cursor and maps ${testCase.name}`, async () => {
      const h = await setup();
      const entries: ExecutionEntry[] = [];
      const contexts: ExecutionContext[] = [];
      const runEngine = async (ctx: ExecutionContext): Promise<ExecutionResult> => {
        contexts.push(ctx);
        entries.push(ctx.entry);
        return testCase.result;
      };

      const result = await run(h, [], { runEngine });

      // The command hands over exactly the run it allocated, once.
      expect(entries.map((entry) => entry.kind)).toEqual(["allocated"]);
      const runId = (await runDirNames(h.stateRoot))[0]!;
      const cp = await readCheckpoint(path.join(runsDirectory(h.stateRoot), runId));
      expect(cp.ok && cp.checkpoint.runId).toBe(runId);
      // The cursor handed over is the initial checkpoint that was just written.
      expect(entries[0]?.checkpoint).toEqual(cp.ok ? cp.checkpoint : null);
      expect(contexts[0]).not.toHaveProperty("stateRoot");
      expect(contexts[0]).not.toHaveProperty("lock");
      expect(result.code).toBe(testCase.code);
      if (testCase.stderr !== undefined) {
        expect(result.err).toContain(testCase.stderr);
      }
      // The lock is the command's to release on every mapped result.
      expect(await lockNames(h.stateRoot)).toEqual([]);
    });
  }

  it("releases the lock when the startup summary throws before the handoff", async () => {
    const h = await setup();
    let uninstalled = false;
    // The lock is held from allocation onward, so the startup output writes with
    // it held. A closed stdout is the realistic way that write fails.
    await expect(
      run(h, [], {
        stdout: new ClosedPipe(),
        generateId: () => "startupthrow-00000000",
        installSignals: () => ({
          signaled: () => null,
          exitCodeFor: (sig) => SIGNAL_EXIT[sig] ?? EXIT_SIGINT,
          uninstall: () => {
            uninstalled = true;
          },
        }),
      }),
    ).rejects.toThrow("EPIPE");

    const runDir = path.join(runsDirectory(h.stateRoot), "startupthrow-00000000");
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) expect(cp.checkpoint.condition).toBe("ready");
    // The run survives for a resume; only the lock is given up.
    expect(await lockNames(h.stateRoot)).toEqual([]);
    expect(uninstalled).toBe(true);
  });

  it("releases the lock and uninstalls handlers when the engine throws", async () => {
    const h = await setup();
    let uninstalled = false;
    const runEngine = async (): Promise<ExecutionResult> => {
      throw new Error("engine exploded");
    };

    await expect(
      run(h, [], {
        runEngine,
        generateId: () => "enginethrow-00000000",
        installSignals: () => ({
          signaled: () => null,
          exitCodeFor: (sig) => SIGNAL_EXIT[sig] ?? EXIT_SIGINT,
          uninstall: () => {
            uninstalled = true;
          },
        }),
      }),
    ).rejects.toThrow("engine exploded");

    const runDir = path.join(runsDirectory(h.stateRoot), "enginethrow-00000000");
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) expect(cp.checkpoint.condition).toBe("ready");
    expect(await lockNames(h.stateRoot)).toEqual([]);
    expect(uninstalled).toBe(true);
  });
});

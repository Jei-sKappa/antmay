import { promises as fs } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { EXIT_SIGINT } from "../cli/exit-codes.js";
import type { HarnessId } from "../harness/id.js";
import type { HarnessExecutableProbe } from "../harness/runtime.js";
import { SCRIPTED_SCENARIO_FILENAME } from "../harness/scripted/scenario.js";
import { SCRIPTED_HARNESS_TOGGLE_VAR } from "../harness/scripted/toggle.js";
import { SignalInterruption } from "../runner/signals.js";
import { runDirectoryFor } from "../state/runs.js";
import {
  BLOCKED,
  STANDARD_STAGE_IDS,
  attemptCountAt,
  baseEnv,
  commitSubjects,
  dropPendingSync,
  fakeSignals,
  lockNames,
  okProbe,
  readCp,
  resume,
  scriptedEnv,
  seed,
  seedScriptedBlocked,
  settingsFor,
  setup,
  soleRunId,
  standardScriptedScenario,
  standardSteps,
  writeScriptedScenario,
  type Harness,
} from "../test-helpers/resume-harness.js";

/**
 * What a resume renders and reports — snapshot fidelity, signals during resumed
 * execution, scripted-harness mode, and the persisted-attempt `Continue` line.
 */

describe.concurrent("resumeCommand — snapshot fidelity and display (AC-15.4, AC-18.1)", () => {
  it("probes only the current stage's harness and keeps retained versions for later stages", async () => {
    // A later stage on a *different* harness is what makes the retained version
    // observable, so this case selects the whole Standard sequence.
    const h = await setup(
      settingsFor({
        "implement-plan-with-subagents": {
          agent: { harness: "claude-code", model: "claude-model" },
        },
      }),
      STANDARD_STAGE_IDS,
    );
    const runProbe: HarnessExecutableProbe = async (harnesses) => {
      const versions: Partial<Record<HarnessId, string>> = {};
      for (const hh of harnesses) versions[hh] = `${hh}-run`;
      return { ok: true, versions };
    };
    let resumeProbeHarnesses: HarnessId[] = [];
    const resumeProbe: HarnessExecutableProbe = async (harnesses) => {
      resumeProbeHarnesses = [...harnesses];
      const versions: Partial<Record<HarnessId, string>> = {};
      for (const hh of harnesses) versions[hh] = `${hh}-resume`;
      return { ok: true, versions };
    };
    await seed(h, [{ outcome: BLOCKED }], { probe: runProbe });
    const runId = await soleRunId(h);

    const result = await resume(h, runId, standardSteps(h.fixture), {
      probe: resumeProbe,
    });
    expect(result.code).toBe(0);
    // Only the current stage's harness (codex) was probed on resume.
    expect(resumeProbeHarnesses).toEqual(["codex"]);

    const runDir = runDirectoryFor(h.stateRoot, runId);
    const specLog = await fs.readFile(
      path.join(runDir, "logs", "01-spec-attempt-02.log"),
      "utf8",
    );
    expect(specLog).toContain("Harness version: codex-resume");
    const implLog = await fs.readFile(
      path.join(runDir, "logs", "06-implement-plan-with-subagents-attempt-01.log"),
      "utf8",
    );
    expect(implLog).toContain("Harness version: claude-code-run");
  });

  it("never rereads settings: a settings edit between pause and resume changes nothing", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    await fs.writeFile(
      path.join(h.configRoot, "settings.json"),
      JSON.stringify(settingsFor({}, "changed")),
      "utf8",
    );
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    const cp = await readCp(h, runId);
    expect(
      cp.stages.every((stage) => stage.binding.agent.model === "test-model"),
    ).toBe(true);
  });

  it("rereads no pipeline, profile, or settings document after allocation (AC-6.3)", async () => {
    const h = await setup(
      settingsFor({
        spec: { agent: { harness: "codex", model: "settings-model" } },
      }),
    );
    await fs.mkdir(path.join(h.configRoot, "profiles"), { recursive: true });
    await fs.writeFile(
      path.join(h.configRoot, "profiles", "quality.json"),
      JSON.stringify({
        schemaVersion: 0,
        name: "quality",
        stages: Object.fromEntries(
          STANDARD_STAGE_IDS.map((stage) => [
            stage,
            { agent: { harness: "codex", model: "profile-model" } },
          ]),
        ),
      }),
      "utf8",
    );
    await seed(h, [{ outcome: BLOCKED }], { profile: "quality" });
    const runId = await soleRunId(h);
    const before = await readCp(h, runId);

    // Rewrite the pipeline into a different selection, corrupt the profile, and
    // delete the settings file entirely.
    await fs.writeFile(
      path.join(h.configRoot, "pipelines", "standard.json"),
      JSON.stringify({
        schemaVersion: 0,
        name: "rewritten",
        stages: [{ stage: "review-spec" }],
      }),
      "utf8",
    );
    await fs.rm(path.join(h.configRoot, "profiles", "quality.json"));
    await fs.rm(path.join(h.configRoot, "settings.json"));

    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    const after = await readCp(h, runId);
    expect(after.pipelineName).toBe("standard");
    expect(after.pipelineSourcePath).toBe(before.pipelineSourcePath);
    expect(after.profileSelection).toEqual(before.profileSelection);
    expect(after.stages).toEqual(before.stages);
    expect(
      after.stages.every((stage) => stage.binding.agent.model === "profile-model"),
    ).toBe(true);
  });

  it("renders the same resolved-execution block after every source document is gone (AC-11)", async () => {
    const h = await setup();
    await fs.mkdir(path.join(h.configRoot, "profiles"), { recursive: true });
    await fs.writeFile(
      path.join(h.configRoot, "profiles", "quality.json"),
      JSON.stringify({
        schemaVersion: 0,
        name: "quality",
        stages: Object.fromEntries(
          STANDARD_STAGE_IDS.map((stage) => [
            stage,
            { agent: { harness: "codex", model: "profile-model" } },
          ]),
        ),
      }),
      "utf8",
    );
    /** The startup block alone, which both commands print before stage 1. */
    const startupBlock = (output: string): string =>
      output.slice(output.indexOf("Run details"), output.indexOf("Stage 1/"));

    const seeded = await seed(h, [{ outcome: BLOCKED }], { profile: "quality" });
    const atAllocation = startupBlock(seeded.out);
    expect(atAllocation).toContain("quality (");
    expect(atAllocation).toContain("codex · profile-model");
    expect(atAllocation).toContain("1. spec");

    // Every document the block was resolved from is deleted; the snapshot is
    // the only thing resume has left to render from.
    const runId = await soleRunId(h);
    await fs.rm(path.join(h.configRoot, "pipelines", "standard.json"));
    await fs.rm(path.join(h.configRoot, "profiles", "quality.json"));
    await fs.rm(path.join(h.configRoot, "settings.json"));

    const resumed = await resume(h, runId, standardSteps(h.fixture));
    expect(resumed.code).toBe(0);
    expect(startupBlock(resumed.out)).toBe(atAllocation);
  });

  it("re-prints the unrestricted-permissions warning on resume", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }], { dangerouslySkipPermissions: true });
    const runId = await soleRunId(h);
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.err).toContain("dangerously-skip-permissions");
  });
});

describe.concurrent("resumeCommand — signals during resumed execution (AC-17)", () => {
  it("persists interruption, releases the lock, and returns the conventional code", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    const controller = new AbortController();
    const result = await resume(
      h,
      runId,
      [
        {
          before: () => controller.abort(new SignalInterruption("SIGINT")),
          hangUntilAbort: true,
        },
      ],
      {
        createAbortController: () => controller,
        installSignals: fakeSignals(() => null),
      },
    );
    expect(result.code).toBe(EXIT_SIGINT);
    const cp = await readCp(h, runId);
    expect(cp.condition).toBe("waiting-for-user");
    expect(cp.waiting?.reasons[0].kind).toBe("interrupted");
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });
});

describe.concurrent("resumeCommand — scripted harness mode (FR-5, FR-8)", () => {
  it("rejects a non-exact toggle on an unmarked checkpoint before probe or lock", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    const before = await readCp(h, runId);
    expect(before.runtime).toEqual({ kind: "real" });

    let probeCalled = false;
    const result = await resume(h, runId, [], {
      env: { ...baseEnv(h), [SCRIPTED_HARNESS_TOGGLE_VAR]: "true" },
      probe: async (...args) => {
        probeCalled = true;
        return okProbe(...args);
      },
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain(SCRIPTED_HARNESS_TOGGLE_VAR);
    expect(probeCalled).toBe(false);
    const after = await readCp(h, runId);
    expect(after.updatedAt).toBe(before.updatedAt);
  });

  it("rejects a marked scripted checkpoint without the toggle before probe or lock", async () => {
    const h = await setup();
    await writeScriptedScenario(
      h,
      standardScriptedScenario({ spec: ["outcome-blocked"] }),
    );
    const seeded = await seed(h, [], { env: scriptedEnv(h) });
    expect(seeded.code).toBe(2);
    const runId = await soleRunId(h);
    const before = await readCp(h, runId);

    let probeCalled = false;
    const result = await resume(h, runId, [], {
      probe: async (...args) => {
        probeCalled = true;
        return okProbe(...args);
      },
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain(SCRIPTED_HARNESS_TOGGLE_VAR);
    expect(probeCalled).toBe(false);
    const after = await readCp(h, runId);
    expect(after.updatedAt).toBe(before.updatedAt);
  });

  it("refuses to switch a real-runtime checkpoint to scripted mode, before probe or lock", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    const before = await readCp(h, runId);
    expect(before.runtime).toEqual({ kind: "real" });
    // A valid live scenario is present, so only the run's own immutable runtime
    // can be what refuses.
    await writeScriptedScenario(
      h,
      standardScriptedScenario({
        spec: ["outcome-blocked", "spec-correct"],
      }),
    );

    let probeCalled = false;
    const result = await resume(h, runId, standardSteps(h.fixture), {
      env: scriptedEnv(h),
      probe: async (...args) => {
        probeCalled = true;
        return okProbe(...args);
      },
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain("real harness");
    expect(result.err).toContain(SCRIPTED_HARNESS_TOGGLE_VAR);
    expect(probeCalled).toBe(false);
    expect(result.invoker.calls.length).toBe(0);
    const after = await readCp(h, runId);
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(after.runtime).toEqual({ kind: "real" });
  });

  it("pauses with harness-error when the stage case array is exhausted on resume", async () => {
    const h = await setup();
    await writeScriptedScenario(
      h,
      standardScriptedScenario({ spec: ["outcome-blocked"] }),
    );
    const seeded = await seed(h, [], { env: scriptedEnv(h) });
    expect(seeded.code).toBe(2);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe("outcome-blocked");

    const result = await resume(h, runId, standardSteps(h.fixture), {
      env: scriptedEnv(h),
    });
    expect(result.code).toBe(2);
    const promptHeading = result.out.indexOf("[DEV] Resolved prompt");
    const promptBody = result.out.indexOf(
      `[DEV] $spec \`${h.fixture.threadRelPath}/\`.`,
    );
    const failure = result.out.indexOf("Stage 1/3 failed");
    expect(result.out.match(/\[DEV\] Resolved prompt/g)).toHaveLength(1);
    expect(promptHeading).toBeGreaterThan(-1);
    expect(promptHeading).toBeLessThan(promptBody);
    expect(failure).toBeGreaterThan(-1);
    expect(promptBody).toBeLessThan(failure);
    expect(result.out).not.toContain("│ ");
    expect(result.out).toContain(`antmay afk resume ${runId}`);
    const cp = await readCp(h, runId);
    expect(cp.waiting?.reasons[0].kind).toBe("harness-error");
    expect(cp.waiting?.reasons[0].message).toContain("provider-error");
    expect(cp.waiting?.reasons[0].message).toContain("exhausted");
    expect(attemptCountAt(cp, 0)).toBe(2);
    expect(cp.attempts[1]?.result).toBe("waiting");
  });

  it("runs spec-correct on attempt 2 after an outcome-blocked pause", async () => {
    const h = await setup();
    const runId = await seedScriptedBlocked(h);
    const result = await resume(h, runId, standardSteps(h.fixture), {
      env: scriptedEnv(h),
    });
    expect(result.code).toBe(0);
    const attemptHeader = result.out.indexOf("Stage 1/3 · spec · attempt 2");
    const nextStageHeader = result.out.indexOf(
      "Stage 2/3 · reconcile-spec",
      attemptHeader,
    );
    const retryOutput = result.out.slice(attemptHeader, nextStageHeader);
    const promptHeading = retryOutput.indexOf("[DEV] Resolved prompt");
    const promptBody = retryOutput.indexOf(
      `[DEV] $spec \`${h.fixture.threadRelPath}/\`.`,
    );
    const transcript = retryOutput.indexOf("│ Writing spec.md.");
    expect(attemptHeader).toBeGreaterThan(-1);
    expect(nextStageHeader).toBeGreaterThan(attemptHeader);
    expect(retryOutput.match(/\[DEV\] Resolved prompt/g)).toHaveLength(1);
    expect(promptHeading).toBeGreaterThan(-1);
    expect(promptHeading).toBeLessThan(promptBody);
    expect(transcript).toBeGreaterThan(-1);
    expect(promptBody).toBeLessThan(transcript);
    const cp = await readCp(h, runId);
    expect(attemptCountAt(cp, 0)).toBe(2);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): spec`);
  });

  it("rereads the edited live scenario and stores nothing about it (AC-5.3)", async () => {
    const h = await setup();
    // The seeded scenario offers the spec stage one case, so the case the resumed
    // attempt runs exists nowhere but in the file the resume rereads.
    await writeScriptedScenario(
      h,
      standardScriptedScenario({ spec: ["outcome-blocked"] }),
    );
    const seeded = await seed(h, [], { env: scriptedEnv(h) });
    expect(seeded.code).toBe(2);
    const runId = await soleRunId(h);
    const paused = JSON.stringify(await readCp(h, runId));
    expect(paused).not.toContain(SCRIPTED_SCENARIO_FILENAME);
    expect(paused).not.toContain("spec-correct");

    await writeScriptedScenario(
      h,
      standardScriptedScenario({ spec: ["outcome-blocked", "spec-correct"] }),
    );
    const result = await resume(h, runId, standardSteps(h.fixture), {
      env: scriptedEnv(h),
    });
    expect(result.code).toBe(0);
    const cp = await readCp(h, runId);
    expect(cp.condition).toBe("completed");
    expect(attemptCountAt(cp, 0)).toBe(2);
    expect(cp.runtime).toEqual({ kind: "scripted" });
    expect(JSON.stringify(cp)).not.toContain(SCRIPTED_SCENARIO_FILENAME);
  });

  it("requires a valid scenario for no-harness finalization resume paths", async () => {
    const h = await setup();
    await writeScriptedScenario(
      h,
      standardScriptedScenario({ spec: ["outcome-done"] }),
    );
    await seed(h, [], { env: scriptedEnv(h) });
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe(
      "stage-contract-violation",
    );
    await fs.rm(path.join(h.configRoot, SCRIPTED_SCENARIO_FILENAME), { force: true });

    const result = await resume(h, runId, standardSteps(h.fixture).slice(1), {
      env: scriptedEnv(h),
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain(SCRIPTED_SCENARIO_FILENAME);
  });

  it("requires a valid scenario for no-call pending-queue resume paths", async () => {
    const h = await setup();
    await writeScriptedScenario(h);
    let calls = 0;
    await seed(h, [], {
      env: scriptedEnv(h),
      installSignals: fakeSignals(() => (++calls > 1 ? "SIGINT" : null)),
    });
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).condition).toBe("ready");

    dropPendingSync(h.fixture, "q.md");
    await fs.rm(path.join(h.configRoot, SCRIPTED_SCENARIO_FILENAME), { force: true });

    const result = await resume(h, runId, [], { env: scriptedEnv(h) });
    expect(result.code).toBe(1);
    expect(result.err).toContain(SCRIPTED_SCENARIO_FILENAME);
  });
});

describe.concurrent("resumeCommand — persisted-attempt Continue (AC-3.2, AC-3.3)", () => {
  async function seedSessionBackedPause(
    h: Harness,
    sessionId: string,
  ): Promise<string> {
    await seed(h, [
      {
        before: () => dropPendingSync(h.fixture, "q.md"),
        outcome: {
          kind: "completed",
          finalText: "Outcome: BLOCKED — needs a human",
          session: { id: sessionId },
        },
      },
    ]);
    return soleRunId(h);
  }

  it("re-renders the Codex Continue command from the persisted attempt", async () => {
    const h = await setup();
    const runId = await seedSessionBackedPause(h, "codex-sess");
    const cp = await readCp(h, runId);
    expect(cp.attempts[0]?.agentSession).toEqual({ id: "codex-sess" });
    expect(cp.stages[0]?.binding.agent.harness).toBe("codex");

    const result = await resume(h, runId, []);
    expect(result.code).toBe(2);
    expect(result.out).toContain("Continue:   codex resume 'codex-sess'");
    expect(result.out).toContain("Log:");
    expect(result.out).toMatch(new RegExp(`Resume:\\s+antmay afk resume ${runId}`));
  });

  it("re-renders the Claude Code Continue command from the snapshotted harness", async () => {
    const h = await setup(
      settingsFor({
        spec: { agent: { harness: "claude-code", model: "test-model" } },
      }),
    );
    const runId = await seedSessionBackedPause(h, "claude-sess");
    const cp = await readCp(h, runId);
    expect(cp.stages[0]?.binding.agent.harness).toBe("claude-code");

    const result = await resume(h, runId, []);
    expect(result.code).toBe(2);
    expect(result.out).toContain("Continue:   claude --resume 'claude-sess'");
  });

  it("quotes a session ID containing a single quote as one shell argument", async () => {
    const h = await setup();
    const runId = await seedSessionBackedPause(h, "foo'bar");
    const result = await resume(h, runId, []);
    expect(result.code).toBe(2);
    expect(result.out).toContain("Continue:   codex resume 'foo'\\''bar'");
  });

  it("omits Continue when the attempt has no session, keeping Log and Resume", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => dropPendingSync(h.fixture, "q.md"),
        outcome: BLOCKED,
      },
    ]);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).attempts[0]?.agentSession).toBeUndefined();

    const result = await resume(h, runId, []);
    expect(result.code).toBe(2);
    expect(result.out).not.toContain("Continue:");
    expect(result.out).toContain("Log:");
    expect(result.out).toMatch(new RegExp(`Resume:\\s+antmay afk resume ${runId}`));
  });

  it("omits Log and Continue on a pre-attempt pause", async () => {
    const h = await setup();
    let calls = 0;
    await seed(h, standardSteps(h.fixture), {
      installSignals: fakeSignals(() => (++calls > 1 ? "SIGINT" : null)),
    });
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).attempts.length).toBe(0);

    dropPendingSync(h.fixture, "q.md");
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(2);
    expect(result.out).not.toContain("Continue:");
    expect(result.out).not.toContain("Log:");
    expect(result.out).toMatch(new RegExp(`Resume:\\s+antmay afk resume ${runId}`));
  });
});

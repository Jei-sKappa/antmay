import { lstat, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { renderStagePrompt } from "../prompt.js";
import type { AttemptRequest } from "../types.js";
import { resolveStageTarget } from "../../pipeline/targets.js";
import { standardPipeline } from "../../pipeline/standard.js";
import type { StageDescriptor, StageTarget } from "../../pipeline/types.js";
import { createAttemptLog, type AttemptLogHeader } from "../../state/logs.js";
import {
  createRepoFixture,
  type RepoFixture,
} from "../../test-helpers/git-fixture.js";
import {
  createScriptedInvoker,
  IMPLEMENT_REPORT_CONTENT,
  PLAN_STRICT_OWNED_TASKS,
  PLAN_STRICT_PLAN_CONTENT,
  RECONCILE_PLAN_APPEND_LINE,
  RECONCILE_SPEC_APPEND_LINE,
  RECONCILE_SPEC_PENDING_DECISION_CONTENT,
  RECONCILE_SPEC_PENDING_DECISION_PATH,
  SCRIPTED_HARNESS_ERROR_CLASS,
  SPEC_CORRECT_CONTENT,
  scriptedSessionId,
} from "./invoker.js";
import {
  SCRIPTED_CASE_NAMES,
  type ScriptedCaseName,
  type ScriptedScenario,
} from "./scenario.js";

const fixtures: RepoFixture[] = [];

afterEach(async () => {
  while (fixtures.length > 0) {
    const fixture = fixtures.pop();
    if (fixture) await fixture.cleanup();
  }
});

async function newFixture(): Promise<RepoFixture> {
  const fixture = await createRepoFixture({ thread: {} });
  fixtures.push(fixture);
  return fixture;
}

function makeScenario(
  stages: Record<string, readonly ScriptedCaseName[]>,
): ScriptedScenario {
  const frozen: Record<string, readonly ScriptedCaseName[]> = {};
  for (const [stageId, cases] of Object.entries(stages)) {
    frozen[stageId] = Object.freeze([...cases]);
  }
  return Object.freeze({
    schemaVersion: 0 as const,
    stages: Object.freeze(frozen),
  });
}

function stageById(id: string): StageDescriptor {
  const stage = standardPipeline.stages.find((entry) => entry.id === id);
  if (stage === undefined) {
    throw new Error(`missing stage ${id}`);
  }
  return stage;
}

function buildRequest(
  fixture: RepoFixture,
  stage: StageDescriptor,
  overrides: {
    attemptNumber?: number;
    harness?: "codex" | "claude-code";
    profilePrompt?: string;
    prompt?: string;
    resolvedTarget?: string;
    threadRelPath?: string;
    target?: StageTarget;
    signal?: AbortSignal;
    onEvent?: AttemptRequest["onEvent"];
    onSessionCaptured?: AttemptRequest["onSessionCaptured"];
    logFilePath?: string;
  } = {},
): AttemptRequest {
  const threadRelPath = overrides.threadRelPath ?? fixture.threadRelPath!;
  const target = overrides.target ?? stage.target;
  const resolved = resolveStageTarget(target, threadRelPath);
  if (!resolved.ok) {
    throw new Error(resolved.error);
  }
  const resolvedTarget = overrides.resolvedTarget ?? resolved.path;
  const harness = overrides.harness ?? "codex";
  const profilePrompt = overrides.profilePrompt ?? "";
  const prompt =
    overrides.prompt ??
    renderStagePrompt(harness, stage.skill, resolvedTarget, profilePrompt);

  return {
    harness,
    model: "test-model",
    prompt,
    stage: {
      id: stage.id,
      skill: stage.skill,
      target,
      resolvedTarget,
      threadRelPath,
      profilePrompt,
      attemptNumber: overrides.attemptNumber ?? 1,
    },
    idleTimeoutSeconds: 900,
    dangerouslySkipPermissions: false,
    workspace: {
      cwd: fixture.root,
      sandbox: "none",
      branchStrategy: "head",
    },
    logFilePath:
      overrides.logFilePath ??
      path.join(fixture.root, ".antmay-runs", "01-spec-attempt-01.log"),
    onEvent: overrides.onEvent ?? (() => {}),
    onSessionCaptured: overrides.onSessionCaptured,
    signal: overrides.signal ?? new AbortController().signal,
  };
}

async function initAttemptLog(
  fixture: RepoFixture,
  request: AttemptRequest,
): Promise<string> {
  const logPath = request.logFilePath;
  const header: AttemptLogHeader = {
    runId: "run-test",
    stageId: request.stage.id,
    stageOrdinal: 1,
    attempt: request.stage.attemptNumber,
    harness: request.harness,
    model: request.model,
    harnessVersion: "scripted-harness 1.0.0",
    repoRoot: fixture.root,
    threadRelPath: request.stage.threadRelPath,
    startedAt: "2026-07-24T00:00:00.000Z",
  };
  await createAttemptLog(
    { absPath: logPath, runRelPath: "logs/01-spec-attempt-01.log" },
    header,
  );
  return logPath;
}

describe("createScriptedInvoker", () => {
  it("exposes exactly the fifteen built-in scripted cases", () => {
    expect([...SCRIPTED_CASE_NAMES].sort()).toEqual(
      [
        "outcome-done",
        "outcome-blocked",
        "outcome-refused",
        "outcome-malformed",
        "outcome-blocked-pending-decision",
        "outcome-blocked-long-detail",
        "harness-provider-error",
        "harness-idle-timeout",
        "harness-hang",
        "spec-correct",
        "reconcile-spec-correct",
        "reconcile-spec-pending-decision",
        "plan-strict-correct",
        "reconcile-plan-correct",
        "implement-plan-with-subagents-correct",
      ].sort(),
    );
  });

  it("selects cases by stage id and durable attempt number", async () => {
    const fixture = await newFixture();
    const scenario = makeScenario({
      spec: ["outcome-done", "outcome-blocked"],
    });
    const invoker = createScriptedInvoker(scenario);
    const stage = stageById("spec");

    const first = buildRequest(fixture, stage, { attemptNumber: 1 });
    await initAttemptLog(fixture, first);
    const firstOutcome = await invoker.invoke(first);
    expect(firstOutcome).toEqual({
      kind: "completed",
      finalText: "Outcome: DONE — Fake completion; no files changed",
      session: { id: scriptedSessionId("spec", 1) },
    });

    const second = buildRequest(fixture, stage, {
      attemptNumber: 2,
      logFilePath: path.join(fixture.root, ".antmay-runs", "01-spec-attempt-02.log"),
    });
    await initAttemptLog(fixture, second);
    const secondOutcome = await invoker.invoke(second);
    expect(secondOutcome).toEqual({
      kind: "completed",
      finalText: "Outcome: BLOCKED — Fake pause; no files changed",
      session: { id: scriptedSessionId("spec", 2) },
    });
  });

  it("returns provider-error when the attempt array is exhausted", async () => {
    const fixture = await newFixture();
    const scenario = makeScenario({ spec: ["outcome-done"] });
    const invoker = createScriptedInvoker(scenario);
    const request = buildRequest(fixture, stageById("spec"), {
      attemptNumber: 2,
    });
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome).toEqual({
      kind: "failed",
      category: "provider-error",
      errorClass: SCRIPTED_HARNESS_ERROR_CLASS,
      errorMessage: expect.stringContaining("exhausted"),
    });
  });

  it("rejects a non-positive attempt number", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(makeScenario({ spec: ["outcome-done"] }));
    const request = buildRequest(fixture, stageById("spec"), {
      attemptNumber: 0,
    });
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome.kind).toBe("failed");
    if (outcome.kind !== "failed") throw new Error("expected failure");
    expect(outcome.category).toBe("provider-error");
    expect(outcome.errorClass).toBe(SCRIPTED_HARNESS_ERROR_CLASS);
  });

  it("rejects prompt mismatches without using prompt as dispatch", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(makeScenario({ spec: ["outcome-done"] }));
    const request = buildRequest(fixture, stageById("spec"), {
      prompt: "$wrong `target`.",
    });
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome).toMatchObject({
      kind: "failed",
      category: "provider-error",
      errorMessage: expect.stringContaining("prompt"),
    });
  });

  it("rejects resolved target mismatches", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(makeScenario({ spec: ["outcome-done"] }));
    const request = buildRequest(fixture, stageById("spec"), {
      resolvedTarget: "docs/threads/other/",
    });
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome).toMatchObject({
      kind: "failed",
      category: "provider-error",
      errorMessage: expect.stringContaining("resolvedTarget"),
    });
  });

  it("rejects profile prompt mismatches", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(makeScenario({ spec: ["outcome-done"] }));
    const request = buildRequest(fixture, stageById("spec"), {
      profilePrompt: "extra",
      prompt: "$spec `docs/threads/wrong`. extra",
    });
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome.kind).toBe("failed");
  });

  it("rejects stage-incompatible cases at invoke time", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(
      makeScenario({ "plan-strict": ["spec-correct"] }),
    );
    const request = buildRequest(fixture, stageById("plan-strict"));
    await initAttemptLog(fixture, request);
    const seedBefore = await readFile(
      path.join(fixture.threadPath!, "seed.md"),
      "utf8",
    );

    const outcome = await invoker.invoke(request);
    expect(outcome).toEqual({
      kind: "failed",
      category: "provider-error",
      errorClass: SCRIPTED_HARNESS_ERROR_CLASS,
      errorMessage: expect.stringContaining("not compatible with stage plan-strict"),
    });
    await expect(
      readFile(path.join(fixture.threadPath!, "spec.md"), "utf8"),
    ).rejects.toThrow();
    expect(
      await readFile(path.join(fixture.threadPath!, "seed.md"), "utf8"),
    ).toBe(seedBefore);
  });

  it("returns aborted without performing workspace effects", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(makeScenario({ spec: ["spec-correct"] }));
    const controller = new AbortController();
    controller.abort();
    const request = buildRequest(fixture, stageById("spec"), {
      signal: controller.signal,
    });
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome).toEqual({
      kind: "failed",
      category: "aborted",
      errorClass: "AbortError",
      errorMessage: expect.any(String),
    });
    await expect(
      readFile(path.join(fixture.threadPath!, "spec.md"), "utf8"),
    ).rejects.toThrow();
  });

  describe("generic outcome cases", () => {
    it.each([
      ["outcome-done", "Outcome: DONE"],
      ["outcome-blocked", "Outcome: BLOCKED"],
      ["outcome-refused", "Outcome: REFUSED"],
    ] as const)("leaves the worktree unchanged for %s", async (caseName, token) => {
      const fixture = await newFixture();
      const invoker = createScriptedInvoker(
        makeScenario({ "review-spec": [caseName] }),
      );
      const request = buildRequest(fixture, stageById("review-spec"));
      await initAttemptLog(fixture, request);

      const before = await readFile(
        path.join(fixture.threadPath!, "seed.md"),
        "utf8",
      );
      const outcome = await invoker.invoke(request);
      const after = await readFile(
        path.join(fixture.threadPath!, "seed.md"),
        "utf8",
      );

      expect(after).toBe(before);
      expect(outcome.kind).toBe("completed");
      if (outcome.kind !== "completed") throw new Error("expected completion");
      expect(outcome.finalText.split("\n").at(-1)!.startsWith(token)).toBe(true);
    });
  });

  it("writes the exact spec-correct bytes", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(makeScenario({ spec: ["spec-correct"] }));
    const request = buildRequest(fixture, stageById("spec"));
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome.kind).toBe("completed");
    const content = await readFile(path.join(fixture.threadPath!, "spec.md"), "utf8");
    expect(content).toBe(SPEC_CORRECT_CONTENT);
  });

  it("appends one fixed line for reconcile-spec-correct", async () => {
    const fixture = await newFixture();
    const specPath = path.join(fixture.threadPath!, "spec.md");
    await writeFile(specPath, "# Existing\n", "utf8");

    const invoker = createScriptedInvoker(
      makeScenario({ "reconcile-spec": ["reconcile-spec-correct"] }),
    );
    const request = buildRequest(fixture, stageById("reconcile-spec"));
    await initAttemptLog(fixture, request);

    await invoker.invoke(request);
    const first = await readFile(specPath, "utf8");
    expect(first).toBe(`# Existing\n${RECONCILE_SPEC_APPEND_LINE}`);

    await invoker.invoke(request);
    const second = await readFile(specPath, "utf8");
    expect(second).toBe(
      `# Existing\n${RECONCILE_SPEC_APPEND_LINE}${RECONCILE_SPEC_APPEND_LINE}`,
    );
  });

  it("queues one decision file and reports DONE for reconcile-spec-pending-decision", async () => {
    const fixture = await newFixture();
    const specPath = path.join(fixture.threadPath!, "spec.md");
    await writeFile(specPath, "# Existing\n", "utf8");

    const invoker = createScriptedInvoker(
      makeScenario({ "reconcile-spec": ["reconcile-spec-pending-decision"] }),
    );
    const request = buildRequest(fixture, stageById("reconcile-spec"));
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome.kind).toBe("completed");
    if (outcome.kind !== "completed") throw new Error("expected completion");
    expect(outcome.finalText.startsWith("Outcome: DONE — ")).toBe(true);
    expect(outcome.finalText).toContain(RECONCILE_SPEC_PENDING_DECISION_PATH);

    expect(await readFile(specPath, "utf8")).toBe(
      `# Existing\n${RECONCILE_SPEC_APPEND_LINE}`,
    );
    const queuedPath = path.join(
      fixture.threadPath!,
      ...RECONCILE_SPEC_PENDING_DECISION_PATH.split("/"),
    );
    expect(await readFile(queuedPath, "utf8")).toBe(
      RECONCILE_SPEC_PENDING_DECISION_CONTENT,
    );
  });

  it("rejects reconcile-spec-pending-decision without a safe regular spec.md", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(
      makeScenario({ "reconcile-spec": ["reconcile-spec-pending-decision"] }),
    );
    const request = buildRequest(fixture, stageById("reconcile-spec"));
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome).toMatchObject({
      kind: "failed",
      category: "provider-error",
      errorClass: SCRIPTED_HARNESS_ERROR_CLASS,
    });
    await expect(
      readFile(
        path.join(
          fixture.threadPath!,
          ...RECONCILE_SPEC_PENDING_DECISION_PATH.split("/"),
        ),
        "utf8",
      ),
    ).rejects.toThrow();
  });

  it("rejects reconcile-spec-correct without a safe regular spec.md", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(
      makeScenario({ "reconcile-spec": ["reconcile-spec-correct"] }),
    );
    const request = buildRequest(fixture, stageById("reconcile-spec"));
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome).toMatchObject({
      kind: "failed",
      category: "provider-error",
      errorClass: SCRIPTED_HARNESS_ERROR_CLASS,
    });
  });

  it("creates a missing plan-tasks directory and writes owned plan artifacts", async () => {
    const fixture = await newFixture();
    const tasksDir = path.join(fixture.threadPath!, "plan-tasks");
    await expect(lstat(tasksDir)).rejects.toMatchObject({ code: "ENOENT" });

    const invoker = createScriptedInvoker(
      makeScenario({ "plan-strict": ["plan-strict-correct"] }),
    );
    const request = buildRequest(fixture, stageById("plan-strict"));
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);

    expect(outcome).toEqual({
      kind: "completed",
      finalText: "Outcome: DONE — Fake plan written: plan.md",
      session: { id: scriptedSessionId("plan-strict", 1) },
    });
    expect(await readFile(path.join(fixture.threadPath!, "plan.md"), "utf8")).toBe(
      PLAN_STRICT_PLAN_CONTENT,
    );
    for (const [relPath, content] of Object.entries(PLAN_STRICT_OWNED_TASKS)) {
      expect(
        await readFile(path.join(fixture.threadPath!, relPath), "utf8"),
      ).toBe(content);
    }
  });

  it("preserves unrelated files in an existing plan-tasks directory", async () => {
    const fixture = await newFixture();
    const unrelated = path.join(fixture.threadPath!, "notes.md");
    await writeFile(unrelated, "keep me\n", "utf8");
    const foreignTaskDir = path.join(fixture.threadPath!, "plan-tasks");
    await mkdir(foreignTaskDir, { recursive: true });
    await writeFile(
      path.join(foreignTaskDir, "99-unrelated.md"),
      "# Unrelated\n",
      "utf8",
    );

    const invoker = createScriptedInvoker(
      makeScenario({ "plan-strict": ["plan-strict-correct"] }),
    );
    const request = buildRequest(fixture, stageById("plan-strict"));
    await initAttemptLog(fixture, request);

    await invoker.invoke(request);

    expect(await readFile(unrelated, "utf8")).toBe("keep me\n");
    expect(
      await readFile(path.join(foreignTaskDir, "99-unrelated.md"), "utf8"),
    ).toBe("# Unrelated\n");
  });

  it("validates every plan destination before changing plan.md", async () => {
    const fixture = await newFixture();
    const planPath = path.join(fixture.threadPath!, "plan.md");
    const planBefore = "# Existing plan\n";
    await writeFile(planPath, planBefore, "utf8");
    await writeFile(
      path.join(fixture.threadPath!, "plan-tasks"),
      "not a directory\n",
      "utf8",
    );

    const invoker = createScriptedInvoker(
      makeScenario({ "plan-strict": ["plan-strict-correct"] }),
    );
    const request = buildRequest(fixture, stageById("plan-strict"));
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);

    expect(outcome).toMatchObject({
      kind: "failed",
      category: "provider-error",
      errorClass: SCRIPTED_HARNESS_ERROR_CLASS,
      errorMessage: expect.stringContaining("directory"),
    });
    expect(await readFile(planPath, "utf8")).toBe(planBefore);
  });

  it("rejects a symlinked plan-tasks parent before changing plan.md", async () => {
    const fixture = await newFixture();
    const planPath = path.join(fixture.threadPath!, "plan.md");
    const planBefore = "# Existing plan\n";
    await writeFile(planPath, planBefore, "utf8");
    const outsideTasks = path.join(fixture.root, "outside-plan-tasks");
    await mkdir(outsideTasks);
    await symlink(
      outsideTasks,
      path.join(fixture.threadPath!, "plan-tasks"),
    );

    const invoker = createScriptedInvoker(
      makeScenario({ "plan-strict": ["plan-strict-correct"] }),
    );
    const request = buildRequest(fixture, stageById("plan-strict"));
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);

    expect(outcome).toMatchObject({
      kind: "failed",
      category: "provider-error",
      errorClass: SCRIPTED_HARNESS_ERROR_CLASS,
      errorMessage: expect.stringContaining("symlink"),
    });
    expect(await readFile(planPath, "utf8")).toBe(planBefore);
  });

  it("appends reconcile-plan lines in lexical task order", async () => {
    const fixture = await newFixture();
    const threadPath = fixture.threadPath!;
    await writeFile(path.join(threadPath, "plan.md"), "# Plan\n", "utf8");
    const tasksDir = path.join(threadPath, "plan-tasks");
    await mkdir(tasksDir, { recursive: true });
    await writeFile(path.join(tasksDir, "02-second.md"), "b\n", "utf8");
    await writeFile(path.join(tasksDir, "01-first.md"), "a\n", "utf8");

    const invoker = createScriptedInvoker(
      makeScenario({ "reconcile-plan": ["reconcile-plan-correct"] }),
    );
    const request = buildRequest(fixture, stageById("reconcile-plan"));
    await initAttemptLog(fixture, request);

    await invoker.invoke(request);

    expect(await readFile(path.join(threadPath, "plan.md"), "utf8")).toBe(
      `# Plan\n${RECONCILE_PLAN_APPEND_LINE}`,
    );
    expect(
      await readFile(path.join(tasksDir, "01-first.md"), "utf8"),
    ).toBe(`a\n${RECONCILE_PLAN_APPEND_LINE}`);
    expect(
      await readFile(path.join(tasksDir, "02-second.md"), "utf8"),
    ).toBe(`b\n${RECONCILE_PLAN_APPEND_LINE}`);
  });

  it("rejects reconcile-plan-correct without prerequisites", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(
      makeScenario({ "reconcile-plan": ["reconcile-plan-correct"] }),
    );
    const request = buildRequest(fixture, stageById("reconcile-plan"));
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome.kind).toBe("failed");
    if (outcome.kind !== "failed") throw new Error("expected failure");
    expect(outcome.category).toBe("provider-error");
  });

  it("writes the exact implementation-report bytes and rewrites them in place", async () => {
    const fixture = await newFixture();
    const stage = stageById("implement-plan-with-subagents");
    const invoker = createScriptedInvoker(
      makeScenario({
        "implement-plan-with-subagents": [
          "implement-plan-with-subagents-correct",
          "implement-plan-with-subagents-correct",
        ],
      }),
    );
    const reportPath = path.join(
      fixture.threadPath!,
      "implementation-report.md",
    );

    const first = buildRequest(fixture, stage, { attemptNumber: 1 });
    await initAttemptLog(fixture, first);
    expect(await invoker.invoke(first)).toEqual({
      kind: "completed",
      finalText:
        "Outcome: DONE — Fake implementation report written: implementation-report.md",
      session: { id: scriptedSessionId("implement-plan-with-subagents", 1) },
    });
    expect(await readFile(reportPath, "utf8")).toBe(IMPLEMENT_REPORT_CONTENT);

    // A rerun of the stage replaces the report in place; it never appends a
    // second copy.
    const second = buildRequest(fixture, stage, {
      attemptNumber: 2,
      logFilePath: path.join(
        fixture.root,
        ".antmay-runs",
        "06-implement-attempt-02.log",
      ),
    });
    await initAttemptLog(fixture, second);
    await invoker.invoke(second);
    expect(await readFile(reportPath, "utf8")).toBe(IMPLEMENT_REPORT_CONTENT);
  });

  it("rejects an in-thread symlinked implementation-report.md", async () => {
    const fixture = await newFixture();
    const seedPath = path.join(fixture.threadPath!, "seed.md");
    const seedBefore = await readFile(seedPath, "utf8");
    const linkPath = path.join(fixture.threadPath!, "implementation-report.md");
    await symlink("seed.md", linkPath);

    const invoker = createScriptedInvoker(
      makeScenario({
        "implement-plan-with-subagents": [
          "implement-plan-with-subagents-correct",
        ],
      }),
    );
    const request = buildRequest(
      fixture,
      stageById("implement-plan-with-subagents"),
    );
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome).toMatchObject({
      kind: "failed",
      category: "provider-error",
      errorClass: SCRIPTED_HARNESS_ERROR_CLASS,
      errorMessage: expect.stringContaining("symlink"),
    });
    expect(await readFile(seedPath, "utf8")).toBe(seedBefore);
    expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
  });

  it("rejects symlinked prerequisites that escape the thread", async () => {
    const fixture = await newFixture();
    const outside = path.join(fixture.root, "outside.md");
    await writeFile(outside, "secret\n", "utf8");
    const linkPath = path.join(fixture.threadPath!, "spec.md");
    await symlink(outside, linkPath);

    const invoker = createScriptedInvoker(
      makeScenario({ "reconcile-spec": ["reconcile-spec-correct"] }),
    );
    const request = buildRequest(fixture, stageById("reconcile-spec"));
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome).toMatchObject({
      kind: "failed",
      category: "provider-error",
      errorClass: SCRIPTED_HARNESS_ERROR_CLASS,
      errorMessage: expect.stringContaining("symlink"),
    });
    expect(await readFile(outside, "utf8")).toBe("secret\n");
  });

  it("rejects in-thread symlinked spec.md for reconcile-spec-correct", async () => {
    const fixture = await newFixture();
    const seedPath = path.join(fixture.threadPath!, "seed.md");
    const seedBefore = await readFile(seedPath, "utf8");
    const linkPath = path.join(fixture.threadPath!, "spec.md");
    await symlink("seed.md", linkPath);

    const invoker = createScriptedInvoker(
      makeScenario({ "reconcile-spec": ["reconcile-spec-correct"] }),
    );
    const request = buildRequest(fixture, stageById("reconcile-spec"));
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome).toMatchObject({
      kind: "failed",
      category: "provider-error",
      errorClass: SCRIPTED_HARNESS_ERROR_CLASS,
      errorMessage: expect.stringContaining("symlink"),
    });
    expect(await readFile(seedPath, "utf8")).toBe(seedBefore);
  });

  it("rejects in-thread symlinked spec.md for spec-correct", async () => {
    const fixture = await newFixture();
    const seedPath = path.join(fixture.threadPath!, "seed.md");
    const seedBefore = await readFile(seedPath, "utf8");
    const linkPath = path.join(fixture.threadPath!, "spec.md");
    await symlink("seed.md", linkPath);

    const invoker = createScriptedInvoker(makeScenario({ spec: ["spec-correct"] }));
    const request = buildRequest(fixture, stageById("spec"));
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome).toMatchObject({
      kind: "failed",
      category: "provider-error",
      errorClass: SCRIPTED_HARNESS_ERROR_CLASS,
      errorMessage: expect.stringContaining("symlink"),
    });
    expect(await readFile(seedPath, "utf8")).toBe(seedBefore);
    expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
  });

  it("streams a deterministic transcript ending in the final message", async () => {
    const fixture = await newFixture();
    const events: string[] = [];
    const invoker = createScriptedInvoker(makeScenario({ spec: ["spec-correct"] }));
    const request = buildRequest(fixture, stageById("spec"), {
      onEvent: (event) => {
        if (event.type === "text") events.push(event.text);
      },
    });
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(events).toEqual([
      "Writing spec.md.",
      "Outcome: DONE — Fake spec written: spec.md",
    ]);
    expect(outcome.kind).toBe("completed");
    if (outcome.kind !== "completed") throw new Error("expected completion");
    expect(events.at(-1)).toBe(outcome.finalText);
  });

  it("appends the session transcript without truncating the log header", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(makeScenario({ spec: ["spec-correct"] }));
    const request = buildRequest(fixture, stageById("spec"));
    const logPath = await initAttemptLog(fixture, request);

    await invoker.invoke(request);
    const log = await readFile(logPath, "utf8");
    expect(log.startsWith("Run: run-test\n")).toBe(true);
    expect(log).toContain("Harness version: scripted-harness 1.0.0");
    expect(log).toContain("Stage: spec");
    expect(log).toContain("Scripted session: scripted-session-spec-1");
    expect(log).toContain("  Case: spec-correct");
    expect(log).toContain("  Attempt: 1");
    expect(log).toContain("Writing spec.md.");
    expect(log).toContain("Outcome: DONE — Fake spec written: spec.md");
    expect(log.trimEnd().endsWith("iteration(s).")).toBe(true);
  });

  it("normalizes event callback failures to provider-error", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(makeScenario({ spec: ["outcome-done"] }));
    const request = buildRequest(fixture, stageById("spec"), {
      onEvent: () => {
        throw new Error("display exploded");
      },
    });
    await initAttemptLog(fixture, request);

    const outcome = await invoker.invoke(request);
    expect(outcome).toEqual({
      kind: "failed",
      category: "provider-error",
      errorClass: SCRIPTED_HARNESS_ERROR_CLASS,
      errorMessage: expect.stringContaining("display exploded"),
      session: { id: scriptedSessionId("spec", 1) },
    });
    const log = await readFile(request.logFilePath, "utf8");
    expect(log).toContain("Scripted session: scripted-session-spec-1");
  });

  it("normalizes log append failures to provider-error", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(makeScenario({ spec: ["outcome-done"] }));
    const request = buildRequest(fixture, stageById("spec"), {
      logFilePath: path.join(fixture.root, "missing-dir", "attempt.log"),
    });

    const outcome = await invoker.invoke(request);
    expect(outcome).toMatchObject({
      kind: "failed",
      category: "provider-error",
      errorClass: SCRIPTED_HARNESS_ERROR_CLASS,
      session: { id: scriptedSessionId("spec", 1) },
    });
  });

  describe("scripted session identity", () => {
    it("reports the deterministic ID live and on completed outcomes", async () => {
      const fixture = await newFixture();
      const captured: { id: string }[] = [];
      const invoker = createScriptedInvoker(
        makeScenario({ spec: ["outcome-done"] }),
      );
      const request = buildRequest(fixture, stageById("spec"), {
        onSessionCaptured: (session) => captured.push(session),
      });
      await initAttemptLog(fixture, request);

      const outcome = await invoker.invoke(request);
      expect(captured).toEqual([{ id: "scripted-session-spec-1" }]);
      expect(outcome).toEqual({
        kind: "completed",
        finalText: "Outcome: DONE — Fake completion; no files changed",
        session: { id: "scripted-session-spec-1" },
      });
    });

    it("attaches the session to provider-error and idle-timeout endings", async () => {
      const fixture = await newFixture();
      for (const [caseName, category] of [
        ["harness-provider-error", "provider-error"],
        ["harness-idle-timeout", "idle-timeout"],
      ] as const) {
        const captured: { id: string }[] = [];
        const invoker = createScriptedInvoker(
          makeScenario({ "review-spec": [caseName] }),
        );
        const request = buildRequest(fixture, stageById("review-spec"), {
          onSessionCaptured: (session) => captured.push(session),
          logFilePath: path.join(
            fixture.root,
            ".antmay-runs",
            `${caseName}.log`,
          ),
        });
        await initAttemptLog(fixture, request);

        const outcome = await invoker.invoke(request);
        expect(captured).toEqual([
          { id: scriptedSessionId("review-spec", 1) },
        ]);
        expect(outcome).toMatchObject({
          kind: "failed",
          category,
          session: { id: scriptedSessionId("review-spec", 1) },
        });
      }
    });

    it("attaches the session to abort-settled outcomes after launch", async () => {
      const fixture = await newFixture();
      const captured: { id: string }[] = [];
      const controller = new AbortController();
      const invoker = createScriptedInvoker(
        makeScenario({ "review-spec": ["harness-hang"] }),
      );
      const request = buildRequest(fixture, stageById("review-spec"), {
        signal: controller.signal,
        onSessionCaptured: (session) => {
          captured.push(session);
          controller.abort();
        },
      });
      await initAttemptLog(fixture, request);

      const outcome = await invoker.invoke(request);
      expect(captured).toEqual([
        { id: scriptedSessionId("review-spec", 1) },
      ]);
      expect(outcome).toEqual({
        kind: "failed",
        category: "aborted",
        errorClass: "AbortError",
        errorMessage: "The attempt was aborted by a signal.",
        session: { id: scriptedSessionId("review-spec", 1) },
      });
    });

    it("omits the session for pre-launch validation and abort failures", async () => {
      const fixture = await newFixture();
      const captured: { id: string }[] = [];
      const invoker = createScriptedInvoker(
        makeScenario({ spec: ["outcome-done"] }),
      );

      const exhausted = buildRequest(fixture, stageById("spec"), {
        attemptNumber: 2,
        onSessionCaptured: (session) => captured.push(session),
      });
      await initAttemptLog(fixture, exhausted);
      const exhaustedOutcome = await invoker.invoke(exhausted);
      expect(exhaustedOutcome).toMatchObject({
        kind: "failed",
        category: "provider-error",
      });
      expect(exhaustedOutcome).not.toHaveProperty("session");

      const controller = new AbortController();
      controller.abort();
      const prelaunch = buildRequest(fixture, stageById("spec"), {
        signal: controller.signal,
        onSessionCaptured: (session) => captured.push(session),
        logFilePath: path.join(
          fixture.root,
          ".antmay-runs",
          "01-spec-attempt-prelaunch.log",
        ),
      });
      await initAttemptLog(fixture, prelaunch);
      const prelaunchOutcome = await invoker.invoke(prelaunch);
      expect(prelaunchOutcome).toEqual({
        kind: "failed",
        category: "aborted",
        errorClass: "AbortError",
        errorMessage: expect.any(String),
      });
      expect(captured).toEqual([]);
    });

    it("keeps the terminal transcript unchanged while recording the session in the log", async () => {
      const fixture = await newFixture();
      const events: string[] = [];
      const invoker = createScriptedInvoker(
        makeScenario({ spec: ["spec-correct"] }),
      );
      const request = buildRequest(fixture, stageById("spec"), {
        onEvent: (event) => {
          if (event.type === "text") events.push(event.text);
        },
        onSessionCaptured: () => {},
      });
      const logPath = await initAttemptLog(fixture, request);

      const outcome = await invoker.invoke(request);
      expect(events).toEqual([
        "Writing spec.md.",
        "Outcome: DONE — Fake spec written: spec.md",
      ]);
      expect(outcome).toMatchObject({
        kind: "completed",
        session: { id: scriptedSessionId("spec", 1) },
      });
      const log = await readFile(logPath, "utf8");
      expect(log.startsWith("Run: run-test\n")).toBe(true);
      expect(log).toContain("Scripted session: scripted-session-spec-1");
      expect(log).toContain("  Case: spec-correct");
      expect(log).toContain("  Attempt: 1");
    });
  });
});

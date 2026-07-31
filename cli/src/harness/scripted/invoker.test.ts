import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { renderStagePrompt } from "../prompt.js";
import type { AttemptRequest } from "../types.js";
import { STAGE_CATALOG } from "../../pipeline/catalog.js";
import type { CatalogStage } from "../../pipeline/catalog.js";
import { resolveStageTarget } from "../../pipeline/targets.js";
import type { CatalogStageId, StageTarget } from "../../pipeline/types.js";
import { createAttemptLog, type AttemptLogHeader } from "../../state/logs.js";
import {
  createRepoFixture,
  type RepoFixture,
} from "../../test-helpers/git-fixture.js";
import {
  createScriptedInvoker,
  SCRIPTED_HARNESS_ERROR_CLASS,
  scriptedSessionId,
} from "./invoker.js";
import type { ScriptedCaseName, ScriptedScenario } from "./scenario.js";

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

function stageById(id: CatalogStageId): CatalogStage {
  return STAGE_CATALOG[id];
}

/**
 * The concrete target a catalog stage resolves to in the fixture thread. Every
 * stage the scripted cases exercise has a `fixed` rule, so the branch is not
 * state-sensitive here.
 */
function targetOf(stage: CatalogStage): StageTarget {
  if (stage.targetRule.kind !== "fixed") {
    throw new Error(`stage ${stage.id} has no fixed target`);
  }
  return stage.targetRule.target;
}

function buildRequest(
  fixture: RepoFixture,
  stage: CatalogStage,
  overrides: {
    attemptNumber?: number;
    harness?: "codex" | "claude-code";
    instructions?: string;
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
  const target = overrides.target ?? targetOf(stage);
  const resolved = resolveStageTarget(target, threadRelPath);
  if (!resolved.ok) {
    throw new Error(resolved.error);
  }
  const resolvedTarget = overrides.resolvedTarget ?? resolved.path;
  const harness = overrides.harness ?? "codex";
  const instructions = overrides.instructions;
  const prompt =
    overrides.prompt ??
    renderStagePrompt(harness, stage.skill, resolvedTarget, instructions);

  return {
    harness,
    model: "test-model",
    prompt,
    stage: {
      id: stage.id,
      skill: stage.skill,
      resolvedTarget,
      threadRelPath,
      ...(instructions !== undefined ? { instructions } : {}),
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
    const observedPrompts: string[] = [];
    const invoker = createScriptedInvoker(
      makeScenario({ spec: ["outcome-done"] }),
      (prompt) => observedPrompts.push(prompt),
    );
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
    expect(observedPrompts).toEqual(["$wrong `target`."]);
  });

  it("reports the submitted prompt before streaming scripted transcript events", async () => {
    const fixture = await newFixture();
    const observedOrder: string[] = [];
    const observedPrompts: string[] = [];
    const observedEvents: string[] = [];
    const invoker = createScriptedInvoker(
      makeScenario({ spec: ["outcome-done"] }),
      (prompt) => {
        observedPrompts.push(prompt);
        observedOrder.push("prompt");
      },
    );
    const request = buildRequest(fixture, stageById("spec"), {
      onEvent: (event) => {
        observedEvents.push(JSON.stringify(event));
        observedOrder.push("event");
      },
    });
    const logPath = await initAttemptLog(fixture, request);

    await invoker.invoke(request);
    const log = await readFile(logPath, "utf8");

    expect(observedPrompts).toEqual([request.prompt]);
    expect(observedEvents.length).toBeGreaterThan(0);
    expect(observedOrder[0]).toBe("prompt");
    expect(observedOrder.slice(1).every((entry) => entry === "event")).toBe(true);
    expect(observedEvents.join("\n")).not.toContain("[DEV] Resolved prompt");
    expect(observedEvents.join("\n")).not.toContain(request.prompt);
    expect(log).not.toContain("[DEV] Resolved prompt");
    expect(log).not.toContain(request.prompt);
  });

  it("reports each invocation's current prompt instead of replaying prior input", async () => {
    const fixture = await newFixture();
    const observedPrompts: string[] = [];
    const invoker = createScriptedInvoker(
      makeScenario({ spec: ["outcome-done", "outcome-done"] }),
      (prompt) => observedPrompts.push(prompt),
    );
    const stage = stageById("spec");
    const first = buildRequest(fixture, stage, {
      instructions: "First stage instruction.",
    });
    const second = buildRequest(fixture, stage, {
      attemptNumber: 2,
      instructions: "Second stage instruction.",
      logFilePath: path.join(
        fixture.root,
        ".antmay-runs",
        "01-spec-attempt-02.log",
      ),
    });
    await initAttemptLog(fixture, first);
    await initAttemptLog(fixture, second);

    const firstOutcome = await invoker.invoke(first);
    const secondOutcome = await invoker.invoke(second);

    expect(firstOutcome.kind).toBe("completed");
    expect(secondOutcome.kind).toBe("completed");
    expect(first.prompt).not.toBe(second.prompt);
    expect(observedPrompts).toEqual([first.prompt, second.prompt]);
  });

  it.each([
    ["outcome-done", "completed"],
    ["harness-provider-error", "failed"],
  ] as const)(
    "keeps the %s outcome authoritative when prompt rendering throws",
    async (caseName, expectedKind) => {
      const fixture = await newFixture();
      const invoker = createScriptedInvoker(
        makeScenario({ spec: [caseName] }),
        () => {
          throw new Error("prompt display exploded");
        },
      );
      const request = buildRequest(fixture, stageById("spec"));
      await initAttemptLog(fixture, request);

      const outcome = await invoker.invoke(request);

      expect(outcome.kind).toBe(expectedKind);
      if (caseName === "harness-provider-error") {
        expect(outcome).toMatchObject({
          kind: "failed",
          category: "provider-error",
          errorMessage: expect.stringContaining("provider closed the stream"),
        });
      }
    },
  );

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

  it("rejects instruction mismatches", async () => {
    const fixture = await newFixture();
    const invoker = createScriptedInvoker(makeScenario({ spec: ["outcome-done"] }));
    const request = buildRequest(fixture, stageById("spec"), {
      instructions: "extra",
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

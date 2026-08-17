import {
  lstat,
  mkdir,
  readFile,
  realpath,
  symlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createRepoFixture,
  type RepoFixture,
} from "../../test-helpers/git-fixture.js";
import {
  executeScriptedCase,
  IMPLEMENT_REPORT_CONTENT,
  PLAN_STRICT_OWNED_TASKS,
  PLAN_STRICT_PLAN_CONTENT,
  RECONCILE_PLAN_APPEND_LINE,
  RECONCILE_SPEC_APPEND_LINE,
  RECONCILE_SPEC_PENDING_DECISION_CONTENT,
  RECONCILE_SPEC_PENDING_DECISION_PATH,
  resolveScriptedThreadRoot,
  SCRIPTED_CASE_HANDLER_NAMES,
  SCRIPTED_CRASH_MESSAGE,
  SPEC_CORRECT_CONTENT,
  SPEC_CORRECT_DELAY_MS,
  type ScriptedCaseContext,
  type ScriptedCaseExecution,
} from "./cases.js";
import {
  isCaseCompatibleWithStage,
  SCRIPTED_CASE_NAMES,
  type ScriptedCaseName,
} from "./scenario.js";

async function newFixture(): Promise<RepoFixture> {
  return createRepoFixture({ thread: {} });
}

/** The effect context the adapter hands the catalog for the fixture's thread. */
async function contextFor(fixture: RepoFixture): Promise<ScriptedCaseContext> {
  const resolved = await resolveScriptedThreadRoot(
    fixture.root,
    fixture.threadRelPath!,
  );
  if (!resolved.ok) {
    throw new Error(resolved.error);
  }
  return {
    threadRelPath: fixture.threadRelPath!,
    threadAbsRoot: resolved.absPath,
  };
}

async function runCase(
  fixture: RepoFixture,
  caseName: ScriptedCaseName,
): Promise<ScriptedCaseExecution> {
  return executeScriptedCase(caseName, await contextFor(fixture));
}

/** The final message of a case that ended ordinarily. */
function finalTextOf(executed: ScriptedCaseExecution): string {
  if (!executed.ok) {
    throw new Error(`expected an applied case, got: ${executed.error}`);
  }
  if (executed.ending.kind !== "ordinary") {
    throw new Error(`expected an ordinary ending, got ${executed.ending.kind}`);
  }
  return executed.ending.finalText;
}

/** The reason a case refused to apply its effects. */
function errorOf(executed: ScriptedCaseExecution): string {
  if (executed.ok) {
    throw new Error("expected the case to refuse its effects");
  }
  return executed.error;
}

describe("the scripted case catalog", () => {
  it("implements every accepted scenario case exactly once", () => {
    expect([...SCRIPTED_CASE_HANDLER_NAMES].sort()).toEqual(
      [...SCRIPTED_CASE_NAMES].sort(),
    );
    expect(SCRIPTED_CASE_HANDLER_NAMES.length).toBe(SCRIPTED_CASE_NAMES.length);
    expect(new Set(SCRIPTED_CASE_HANDLER_NAMES).size).toBe(
      SCRIPTED_CASE_HANDLER_NAMES.length,
    );
  });

  it("leaves stage compatibility to the scenario validator", async () => {
    // The catalog's seam takes a case name and an effect context, never a stage
    // id, so nothing here can widen or narrow where a case may appear.
    const catalog = await import("./cases.js");
    expect(Object.keys(catalog).filter((name) => /compatib/i.test(name))).toEqual(
      [],
    );
    expect(isCaseCompatibleWithStage("spec-correct", "spec")).toBe(true);
    expect(isCaseCompatibleWithStage("spec-correct", "plan-strict")).toBe(false);
  });

  describe("generic outcome cases", () => {
    it.each([
      ["outcome-done", "Outcome: DONE"],
      ["outcome-blocked", "Outcome: BLOCKED"],
      ["outcome-refused", "Outcome: REFUSED"],
    ] as const)("leaves the worktree unchanged for %s", async (caseName, token) => {
      const fixture = await newFixture();
      const seedPath = path.join(fixture.threadPath!, "seed.md");

      const before = await readFile(seedPath, "utf8");
      const executed = await runCase(fixture, caseName);
      const after = await readFile(seedPath, "utf8");

      expect(after).toBe(before);
      const finalText = finalTextOf(executed);
      expect(finalText.split("\n").at(-1)!.startsWith(token)).toBe(true);
      expect(executed.ok && executed.transcript.at(-1)).toBe(finalText);
    });
  });

  it("lets harness-crash throw out of the catalog, changing nothing", async () => {
    // The one case that reports no ending at all. The rejection is the point:
    // it is what carries the throw past the adapter, which awaits the catalog
    // outside every `try` it has, and out to the bootstrap's crash renderer.
    const fixture = await newFixture();
    const seedPath = path.join(fixture.threadPath!, "seed.md");

    const before = await readFile(seedPath, "utf8");
    await expect(runCase(fixture, "harness-crash")).rejects.toThrow(
      SCRIPTED_CRASH_MESSAGE,
    );

    expect(await readFile(seedPath, "utf8")).toBe(before);
  });

  it("writes the exact spec-correct bytes", async () => {
    const fixture = await newFixture();

    const executed = await runCase(fixture, "spec-correct");

    expect(finalTextOf(executed)).toBe("Outcome: DONE — Fake spec written: spec.md");
    expect(
      await readFile(path.join(fixture.threadPath!, "spec.md"), "utf8"),
    ).toBe(SPEC_CORRECT_CONTENT);
  });

  it("writes the same spec bytes for spec-correct-delayed and holds the attempt open", async () => {
    const fixture = await newFixture();

    const startedAt = Date.now();
    const executed = await runCase(fixture, "spec-correct-delayed");
    const elapsed = Date.now() - startedAt;

    expect(finalTextOf(executed)).toBe("Outcome: DONE — Fake spec written: spec.md");
    // The delay is the whole point: it is the window a caller changes the world
    // in while the attempt is still in flight.
    expect(elapsed).toBeGreaterThanOrEqual(SPEC_CORRECT_DELAY_MS);
    // The spec is written before the wait, so the file exists throughout it.
    expect(
      await readFile(path.join(fixture.threadPath!, "spec.md"), "utf8"),
    ).toBe(SPEC_CORRECT_CONTENT);
  });

  it("appends one fixed line for reconcile-spec-correct", async () => {
    const fixture = await newFixture();
    const specPath = path.join(fixture.threadPath!, "spec.md");
    await writeFile(specPath, "# Existing\n", "utf8");

    await runCase(fixture, "reconcile-spec-correct");
    expect(await readFile(specPath, "utf8")).toBe(
      `# Existing\n${RECONCILE_SPEC_APPEND_LINE}`,
    );

    await runCase(fixture, "reconcile-spec-correct");
    expect(await readFile(specPath, "utf8")).toBe(
      `# Existing\n${RECONCILE_SPEC_APPEND_LINE}${RECONCILE_SPEC_APPEND_LINE}`,
    );
  });

  it("queues one decision file and reports DONE for reconcile-spec-pending-decision", async () => {
    const fixture = await newFixture();
    const specPath = path.join(fixture.threadPath!, "spec.md");
    await writeFile(specPath, "# Existing\n", "utf8");

    const executed = await runCase(fixture, "reconcile-spec-pending-decision");

    const finalText = finalTextOf(executed);
    expect(finalText.startsWith("Outcome: DONE — ")).toBe(true);
    expect(finalText).toContain(RECONCILE_SPEC_PENDING_DECISION_PATH);
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

    const executed = await runCase(fixture, "reconcile-spec-pending-decision");

    expect(errorOf(executed).length).toBeGreaterThan(0);
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

    const executed = await runCase(fixture, "reconcile-spec-correct");

    expect(errorOf(executed).length).toBeGreaterThan(0);
  });

  it("creates a missing plan-tasks directory and writes owned plan artifacts", async () => {
    const fixture = await newFixture();
    const tasksDir = path.join(fixture.threadPath!, "plan-tasks");
    await expect(lstat(tasksDir)).rejects.toMatchObject({ code: "ENOENT" });

    const executed = await runCase(fixture, "plan-strict-correct");

    expect(finalTextOf(executed)).toBe("Outcome: DONE — Fake plan written: plan.md");
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

    await runCase(fixture, "plan-strict-correct");

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

    const executed = await runCase(fixture, "plan-strict-correct");

    expect(errorOf(executed)).toContain("directory");
    expect(await readFile(planPath, "utf8")).toBe(planBefore);
  });

  it("rejects a symlinked plan-tasks parent before changing plan.md", async () => {
    const fixture = await newFixture();
    const planPath = path.join(fixture.threadPath!, "plan.md");
    const planBefore = "# Existing plan\n";
    await writeFile(planPath, planBefore, "utf8");
    const outsideTasks = path.join(fixture.root, "outside-plan-tasks");
    await mkdir(outsideTasks);
    await symlink(outsideTasks, path.join(fixture.threadPath!, "plan-tasks"));

    const executed = await runCase(fixture, "plan-strict-correct");

    expect(errorOf(executed)).toContain("symlink");
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

    const executed = await runCase(fixture, "reconcile-plan-correct");

    expect(finalTextOf(executed)).toBe(
      "Outcome: DONE — Fake reconciliation appended: plan.md",
    );
    expect(await readFile(path.join(threadPath, "plan.md"), "utf8")).toBe(
      `# Plan\n${RECONCILE_PLAN_APPEND_LINE}`,
    );
    expect(await readFile(path.join(tasksDir, "01-first.md"), "utf8")).toBe(
      `a\n${RECONCILE_PLAN_APPEND_LINE}`,
    );
    expect(await readFile(path.join(tasksDir, "02-second.md"), "utf8")).toBe(
      `b\n${RECONCILE_PLAN_APPEND_LINE}`,
    );
    const appendedTasks = (executed.ok ? executed.transcript : [])
      .filter((line): line is string => typeof line === "string")
      .filter((line) => line.startsWith("Appending a fake note to plan-tasks/"));
    expect(appendedTasks).toEqual([
      "Appending a fake note to plan-tasks/01-first.md.",
      "Appending a fake note to plan-tasks/02-second.md.",
    ]);
  });

  it("rejects reconcile-plan-correct without prerequisites", async () => {
    const fixture = await newFixture();

    const executed = await runCase(fixture, "reconcile-plan-correct");

    expect(errorOf(executed).length).toBeGreaterThan(0);
  });

  it("writes the exact implementation-report bytes and rewrites them in place", async () => {
    const fixture = await newFixture();
    const reportPath = path.join(
      fixture.threadPath!,
      "implementation-report.md",
    );

    const first = await runCase(
      fixture,
      "implement-plan-with-subagents-correct",
    );
    expect(finalTextOf(first)).toBe(
      "Outcome: DONE — Fake implementation report written: implementation-report.md",
    );
    expect(await readFile(reportPath, "utf8")).toBe(IMPLEMENT_REPORT_CONTENT);

    // A rerun of the stage replaces the report in place; it never appends a
    // second copy.
    await runCase(fixture, "implement-plan-with-subagents-correct");
    expect(await readFile(reportPath, "utf8")).toBe(IMPLEMENT_REPORT_CONTENT);
  });

  it("rejects an in-thread symlinked implementation-report.md", async () => {
    const fixture = await newFixture();
    const seedPath = path.join(fixture.threadPath!, "seed.md");
    const seedBefore = await readFile(seedPath, "utf8");
    const linkPath = path.join(fixture.threadPath!, "implementation-report.md");
    await symlink("seed.md", linkPath);

    const executed = await runCase(
      fixture,
      "implement-plan-with-subagents-correct",
    );

    expect(errorOf(executed)).toContain("symlink");
    expect(await readFile(seedPath, "utf8")).toBe(seedBefore);
    expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
  });

  it("rejects symlinked prerequisites that escape the thread", async () => {
    const fixture = await newFixture();
    const outside = path.join(fixture.root, "outside.md");
    await writeFile(outside, "secret\n", "utf8");
    await symlink(outside, path.join(fixture.threadPath!, "spec.md"));

    const executed = await runCase(fixture, "reconcile-spec-correct");

    expect(errorOf(executed)).toContain("symlink");
    expect(await readFile(outside, "utf8")).toBe("secret\n");
  });

  it("rejects in-thread symlinked spec.md for reconcile-spec-correct", async () => {
    const fixture = await newFixture();
    const seedPath = path.join(fixture.threadPath!, "seed.md");
    const seedBefore = await readFile(seedPath, "utf8");
    await symlink("seed.md", path.join(fixture.threadPath!, "spec.md"));

    const executed = await runCase(fixture, "reconcile-spec-correct");

    expect(errorOf(executed)).toContain("symlink");
    expect(await readFile(seedPath, "utf8")).toBe(seedBefore);
  });

  it("rejects in-thread symlinked spec.md for spec-correct", async () => {
    const fixture = await newFixture();
    const seedPath = path.join(fixture.threadPath!, "seed.md");
    const seedBefore = await readFile(seedPath, "utf8");
    const linkPath = path.join(fixture.threadPath!, "spec.md");
    await symlink("seed.md", linkPath);

    const executed = await runCase(fixture, "spec-correct");

    expect(errorOf(executed)).toContain("symlink");
    expect(await readFile(seedPath, "utf8")).toBe(seedBefore);
    expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
  });

  describe("thread-root resolution", () => {
    it("resolves the selected thread inside the workspace", async () => {
      const fixture = await newFixture();

      const resolved = await resolveScriptedThreadRoot(
        fixture.root,
        fixture.threadRelPath!,
      );

      expect(resolved).toEqual({
        ok: true,
        absPath: await realpath(fixture.threadPath!),
      });
    });

    it.each([
      ["an empty", ""],
      ["an absolute", "/absolute/thread"],
      ["a parent-escaping", "docs/threads/../../escape"],
      ["a missing", "docs/threads/missing-thread"],
    ])("refuses %s thread path", async (_label, threadRelPath) => {
      const fixture = await newFixture();

      const resolved = await resolveScriptedThreadRoot(
        fixture.root,
        threadRelPath,
      );

      expect(resolved.ok).toBe(false);
    });
  });
});

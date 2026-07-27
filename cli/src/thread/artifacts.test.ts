import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { ArtifactState, PlanState } from "../pipeline/types.js";
import {
  applyArtifactTransition,
  evaluateArtifactPrerequisite,
  evaluatePromisedState,
  inspectArtifactState,
} from "./artifacts.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) await cleanup();
  }
});

const THREAD_REL = path.posix.join("docs", "threads", "260727135009Z-t");

/**
 * A repository directory holding one thread folder with both genesis files, so
 * every case starts from a valid thread and varies only what it means to.
 */
async function threadFixture(): Promise<{ repoRoot: string; threadAbs: string }> {
  const raw = await fs.mkdtemp(path.join(os.tmpdir(), "antmay-artifacts-"));
  cleanups.push(() => fs.rm(raw, { recursive: true, force: true }));
  const repoRoot = await fs.realpath(raw);
  const threadAbs = path.join(repoRoot, THREAD_REL);
  await fs.mkdir(threadAbs, { recursive: true });
  await fs.writeFile(path.join(threadAbs, "seed.md"), "# Seed\n");
  await fs.writeFile(path.join(threadAbs, "decisions.md"), "# Decisions\n");
  return { repoRoot, threadAbs };
}

async function inspect(repoRoot: string): Promise<ArtifactState> {
  const inspection = await inspectArtifactState(repoRoot, THREAD_REL);
  if (!inspection.ok) {
    throw new Error(`expected a successful inspection, got: ${inspection.message}`);
  }
  return inspection.state;
}

async function planStateOf(
  repoRoot: string,
): Promise<PlanState> {
  return (await inspect(repoRoot)).plan;
}

describe("inspectArtifactState — thread and presence dimensions (AC-3.2)", () => {
  it("reports a bare valid thread with every artifact absent", async () => {
    const { repoRoot } = await threadFixture();
    expect(await inspect(repoRoot)).toEqual({
      validThread: true,
      proposal: false,
      spec: false,
      plan: "absent",
      implementationReport: false,
    });
  });

  it("counts a non-empty regular proposal, spec, and report as present", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.writeFile(path.join(threadAbs, "proposal.md"), "p");
    await fs.writeFile(path.join(threadAbs, "spec.md"), "s");
    await fs.writeFile(path.join(threadAbs, "implementation-report.md"), "r");

    const state = await inspect(repoRoot);
    expect(state.proposal).toBe(true);
    expect(state.spec).toBe(true);
    expect(state.implementationReport).toBe(true);
  });

  it("treats an empty artifact file as absent", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.writeFile(path.join(threadAbs, "spec.md"), "");
    await fs.writeFile(path.join(threadAbs, "implementation-report.md"), "");

    const state = await inspect(repoRoot);
    expect(state.spec).toBe(false);
    expect(state.implementationReport).toBe(false);
  });

  it("treats a directory in an artifact's place as absent", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.mkdir(path.join(threadAbs, "spec.md"));
    expect((await inspect(repoRoot)).spec).toBe(false);
  });

  it("treats a symlinked artifact as absent", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.writeFile(path.join(threadAbs, "elsewhere.md"), "s");
    await fs.symlink("elsewhere.md", path.join(threadAbs, "spec.md"));
    expect((await inspect(repoRoot)).spec).toBe(false);
  });

  it("never requires proposal.md for a valid thread", async () => {
    const { repoRoot } = await threadFixture();
    const state = await inspect(repoRoot);
    expect(state.validThread).toBe(true);
    expect(state.proposal).toBe(false);
  });

  it("reports an invalid thread when a genesis file is missing or empty", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.rm(path.join(threadAbs, "decisions.md"));
    expect((await inspect(repoRoot)).validThread).toBe(false);

    await fs.writeFile(path.join(threadAbs, "decisions.md"), "");
    expect((await inspect(repoRoot)).validThread).toBe(false);
  });

  it("reports an invalid thread with everything absent when the folder is missing", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.rm(threadAbs, { recursive: true });
    expect(await inspect(repoRoot)).toEqual({
      validThread: false,
      proposal: false,
      spec: false,
      plan: "absent",
      implementationReport: false,
    });
  });

  it("reports an invalid thread when the thread path is a regular file", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.rm(threadAbs, { recursive: true });
    await fs.writeFile(threadAbs, "not a thread");
    expect((await inspect(repoRoot)).validThread).toBe(false);
  });
});

describe("inspectArtifactState — plan topology (AC-3.1)", () => {
  it("is absent when neither plan.md nor plan-tasks/ exists", async () => {
    const { repoRoot } = await threadFixture();
    expect(await planStateOf(repoRoot)).toBe("absent");
  });

  it("is brief for a non-empty plan.md with no plan-tasks/", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.writeFile(path.join(threadAbs, "plan.md"), "# Plan\n");
    expect(await planStateOf(repoRoot)).toBe("brief");
  });

  it("is strict for a non-empty index plus at least one non-empty Markdown task", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.writeFile(path.join(threadAbs, "plan.md"), "# Plan\n");
    await fs.mkdir(path.join(threadAbs, "plan-tasks"));
    await fs.writeFile(path.join(threadAbs, "plan-tasks", "01-first.md"), "task");
    expect(await planStateOf(repoRoot)).toBe("strict");
  });

  it("is malformed for task storage without an index", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.mkdir(path.join(threadAbs, "plan-tasks"));
    await fs.writeFile(path.join(threadAbs, "plan-tasks", "01-first.md"), "task");
    expect(await planStateOf(repoRoot)).toBe("malformed");
  });

  it("is malformed for an empty index", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.writeFile(path.join(threadAbs, "plan.md"), "");
    expect(await planStateOf(repoRoot)).toBe("malformed");

    await fs.mkdir(path.join(threadAbs, "plan-tasks"));
    await fs.writeFile(path.join(threadAbs, "plan-tasks", "01-first.md"), "task");
    expect(await planStateOf(repoRoot)).toBe("malformed");
  });

  it("is malformed for a non-regular index", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.mkdir(path.join(threadAbs, "plan.md"));
    expect(await planStateOf(repoRoot)).toBe("malformed");
  });

  it("is malformed for a non-directory plan-tasks path", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.writeFile(path.join(threadAbs, "plan.md"), "# Plan\n");
    await fs.writeFile(path.join(threadAbs, "plan-tasks"), "not a directory");
    expect(await planStateOf(repoRoot)).toBe("malformed");
  });

  it("is malformed for an empty plan-tasks directory", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.writeFile(path.join(threadAbs, "plan.md"), "# Plan\n");
    await fs.mkdir(path.join(threadAbs, "plan-tasks"));
    expect(await planStateOf(repoRoot)).toBe("malformed");
  });

  it("is malformed when no plan-tasks entry is a non-empty Markdown file", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.writeFile(path.join(threadAbs, "plan.md"), "# Plan\n");
    const tasks = path.join(threadAbs, "plan-tasks");
    await fs.mkdir(tasks);
    await fs.writeFile(path.join(tasks, "01-empty.md"), "");
    await fs.writeFile(path.join(tasks, "notes.txt"), "not markdown");
    await fs.mkdir(path.join(tasks, "01-nested.md"));
    await fs.writeFile(path.join(tasks, "elsewhere"), "task");
    await fs.symlink("elsewhere", path.join(tasks, "02-link.md"));
    expect(await planStateOf(repoRoot)).toBe("malformed");
  });

  it("is strict when one recognizable task sits among unrecognized entries", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.writeFile(path.join(threadAbs, "plan.md"), "# Plan\n");
    const tasks = path.join(threadAbs, "plan-tasks");
    await fs.mkdir(tasks);
    await fs.writeFile(path.join(tasks, "00-empty.md"), "");
    await fs.writeFile(path.join(tasks, "README.txt"), "x");
    await fs.writeFile(path.join(tasks, "07-real.md"), "task");
    expect(await planStateOf(repoRoot)).toBe("strict");
  });

  it("is malformed when the plan topology cannot be inspected", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.writeFile(path.join(threadAbs, "plan.md"), "# Plan\n");
    const tasks = path.join(threadAbs, "plan-tasks");
    await fs.mkdir(tasks);
    await fs.writeFile(path.join(tasks, "01-first.md"), "task");
    await fs.chmod(tasks, 0o000);
    cleanups.push(async () => {
      await fs.chmod(tasks, 0o700);
    });

    expect(await planStateOf(repoRoot)).toBe("malformed");
  });
});

describe("inspectArtifactState — semantic blindness (AC-3.3)", () => {
  it("reads no prose, index entry, ordinal, or decision record", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.writeFile(path.join(threadAbs, "decisions.md"), "# Decisions\n");
    await fs.writeFile(path.join(threadAbs, "spec.md"), "not a spec at all");
    await fs.writeFile(
      path.join(threadAbs, "plan.md"),
      "this index references plan-tasks/99-missing.md and nothing that exists",
    );
    const tasks = path.join(threadAbs, "plan-tasks");
    await fs.mkdir(tasks);
    await fs.writeFile(path.join(tasks, "zz-unordered.md"), "arbitrary text");

    expect(await inspect(repoRoot)).toEqual({
      validThread: true,
      proposal: false,
      spec: true,
      plan: "strict",
      implementationReport: false,
    });
  });

  it("produces the same state for two threads whose contents differ entirely", async () => {
    const first = await threadFixture();
    const second = await threadFixture();
    await fs.writeFile(path.join(first.threadAbs, "spec.md"), "a");
    await fs.writeFile(
      path.join(second.threadAbs, "spec.md"),
      "# Spec\n\nA long, well formed document.\n",
    );
    expect(await inspect(first.repoRoot)).toEqual(await inspect(second.repoRoot));
  });
});

describe("inspectArtifactState — typed inspection failure", () => {
  it("fails rather than reporting valid state when the thread cannot be read", async () => {
    const { repoRoot, threadAbs } = await threadFixture();
    await fs.chmod(threadAbs, 0o000);
    cleanups.push(async () => {
      await fs.chmod(threadAbs, 0o700);
    });

    const inspection = await inspectArtifactState(repoRoot, THREAD_REL);
    expect(inspection.ok).toBe(false);
    if (inspection.ok) return;
    expect(inspection.message).toContain(THREAD_REL);
  });
});

const BASE_STATE: ArtifactState = {
  validThread: true,
  proposal: false,
  spec: true,
  plan: "strict",
  implementationReport: false,
};

describe("evaluateArtifactPrerequisite (AC-3.4)", () => {
  it("accepts a satisfied prerequisite", () => {
    expect(
      evaluateArtifactPrerequisite(BASE_STATE, {
        validThread: true,
        spec: true,
        plan: "strict",
      }),
    ).toEqual([]);
  });

  it("accepts a prerequisite that constrains nothing", () => {
    expect(evaluateArtifactPrerequisite(BASE_STATE, {})).toEqual([]);
  });

  it("reports every unmet dimension with its expected and observed value", () => {
    expect(
      evaluateArtifactPrerequisite(
        { ...BASE_STATE, spec: false, plan: "brief" },
        { validThread: true, spec: true, plan: "strict" },
      ),
    ).toEqual([
      { dimension: "spec", expected: true, observed: false },
      { dimension: "plan", expected: "strict", observed: "brief" },
    ]);
  });

  it("never matches a malformed plan against a named plan state", () => {
    for (const required of ["absent", "brief", "strict"] as const) {
      const unmet = evaluateArtifactPrerequisite(
        { ...BASE_STATE, plan: "malformed" },
        { plan: required },
      );
      expect(unmet).toEqual([
        { dimension: "plan", expected: required, observed: "malformed" },
      ]);
    }
  });

  it("ignores dimensions the prerequisite does not name", () => {
    expect(
      evaluateArtifactPrerequisite({ ...BASE_STATE, proposal: false }, { spec: true }),
    ).toEqual([]);
  });
});

describe("applyArtifactTransition (AC-3.4)", () => {
  it("applies only the named dimensions and preserves the rest", () => {
    const next = applyArtifactTransition(
      { ...BASE_STATE, plan: "absent" },
      { plan: "brief" },
    );
    expect(next).toEqual({
      validThread: true,
      proposal: false,
      spec: true,
      plan: "brief",
      implementationReport: false,
    });
  });

  it("leaves the input state untouched", () => {
    const before: ArtifactState = { ...BASE_STATE };
    applyArtifactTransition(before, { implementationReport: true });
    expect(before).toEqual(BASE_STATE);
  });

  it("returns an equal state for a transition that promises nothing", () => {
    expect(applyArtifactTransition(BASE_STATE, {})).toEqual(BASE_STATE);
  });

  it("composes across stages without crediting anything unnamed", () => {
    const start: ArtifactState = {
      validThread: true,
      proposal: true,
      spec: false,
      plan: "absent",
      implementationReport: false,
    };
    const afterSpec = applyArtifactTransition(start, { spec: true });
    const afterPlan = applyArtifactTransition(afterSpec, { plan: "strict" });
    const afterImplement = applyArtifactTransition(afterPlan, {
      implementationReport: true,
    });
    expect(afterImplement).toEqual({
      validThread: true,
      proposal: true,
      spec: true,
      plan: "strict",
      implementationReport: true,
    });
  });
});

describe("evaluatePromisedState (AC-3.4)", () => {
  it("accepts fresh state that matches the promise", () => {
    expect(
      evaluatePromisedState({ ...BASE_STATE, plan: "brief" }, { plan: "brief" }),
    ).toEqual([]);
  });

  it("rejects fresh state that left the promised shape unmet", () => {
    expect(
      evaluatePromisedState({ ...BASE_STATE, plan: "strict" }, { plan: "brief" }),
    ).toEqual([{ dimension: "plan", expected: "brief", observed: "strict" }]);
  });

  it("rejects a missing promised artifact", () => {
    expect(
      evaluatePromisedState(BASE_STATE, { implementationReport: true }),
    ).toEqual([
      { dimension: "implementationReport", expected: true, observed: false },
    ]);
  });
});

describe("artifact contracts survive a checkpoint round-trip (AC-3.4)", () => {
  it("evaluates identically after JSON serialization", () => {
    const prerequisite = { validThread: true, plan: "strict" as const };
    const transition = { implementationReport: true };
    const revived = JSON.parse(JSON.stringify({ prerequisite, transition, BASE_STATE }));

    expect(
      evaluateArtifactPrerequisite(revived.BASE_STATE, revived.prerequisite),
    ).toEqual(evaluateArtifactPrerequisite(BASE_STATE, prerequisite));
    expect(
      applyArtifactTransition(revived.BASE_STATE, revived.transition),
    ).toEqual(applyArtifactTransition(BASE_STATE, transition));
  });
});

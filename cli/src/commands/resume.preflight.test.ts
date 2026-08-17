import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  EXIT_FAILURE,
  EXIT_OK,
  EXIT_SIGINT,
  EXIT_WAITING,
} from "../cli/exit-codes.js";
import type {
  ExecutionContext,
  ExecutionEntry,
  ExecutionResult,
} from "../execution/engine.js";
import type { HarnessExecutableProbe } from "../harness/adapters/probe.js";
import { acquireWorkspaceLock } from "../state/lock.js";
import { writeCheckpoint } from "../state/persist.js";
import { runDirectoryFor } from "../state/runs.js";
import { governedBy } from "../test-helpers/waiting.js";
import {
  BLOCKED,
  DONE,
  commitSubjects,
  fakeSignals,
  lockNames,
  makeWorkspacesUnsafe,
  readCp,
  resume,
  simulatedEnv,
  seed,
  setup,
  soleRunId,
  standardSteps,
  writeRootFileSync,
  writeSimulatedScenario,
  writeThreadFileSync,
  type Harness,
} from "../test-helpers/resume-harness.js";

/**
 * Everything `resume` decides before the engine is entered — the refusals its
 * read-only preflight reaches, the rules it applies to the worktree, and how it
 * maps what the engine hands back.
 */

/**
 * Every run directory a checkpoint was written to. Production has exactly one
 * checkpoint writer, so a case that expects to persist nothing proves it by the
 * count for its own run directory not moving. The cases here run concurrently,
 * which is why the key is the run directory and never the array's length.
 */
const checkpointWrites: string[] = [];

vi.mock("../state/persist.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../state/persist.js")>();
  const spy: typeof actual.writeCheckpoint = (runDir, checkpoint, fsOps) => {
    checkpointWrites.push(runDir);
    return actual.writeCheckpoint(runDir, checkpoint, fsOps);
  };
  return { ...actual, writeCheckpoint: spy };
});

describe.concurrent("resumeCommand — preflight rejections (AC-15.2)", () => {
  it("rejects an unknown run with exit 1", async () => {
    const h = await setup();
    const result = await resume(h, "no-such-run-000000", []);
    expect(result.code).toBe(1);
    expect(result.err).toContain("Unknown run");
  });

  it("rejects a malformed checkpoint with exit 1", async () => {
    const h = await setup();
    const runDir = runDirectoryFor(h.stateRoot, "malformed-000000");
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(path.join(runDir, "state.json"), "{ not json", "utf8");
    const result = await resume(h, "malformed-000000", []);
    expect(result.code).toBe(1);
    expect(result.err).toContain("malformed");
  });

  it("reports a completed run and exits 1", async () => {
    const h = await setup();
    const seeded = await seed(h, standardSteps(h));
    expect(seeded.code).toBe(0);
    const runId = await soleRunId(h);
    const result = await resume(h, runId, []);
    expect(result.code).toBe(1);
    expect(result.err).toContain("already completed");
  });

  it("fails clearly when the recorded thread no longer resolves, never searching", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    // Remove the recorded thread directory: the recorded path no longer resolves.
    await fs.rm(h.fixture.threadPath as string, { recursive: true, force: true });
    const result = await resume(h, runId, []);
    expect(result.code).toBe(1);
    expect(result.err).toContain("could not be revalidated");
  });

  it("does not let a config-only environment error block a state-only resume", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    const result = await resume(h, runId, standardSteps(h), {
      env: {
        ANTMAY_CONFIG_HOME: "relative/not/absolute",
        ANTMAY_STATE_HOME: h.stateRoot,
      },
    });
    expect(result.code).toBe(0);
  });
});

/** Harness probe fake that fails for every requested harness. */
const failingProbe: HarnessExecutableProbe = async (harnesses) => ({
  ok: false,
  failures: harnesses.map((h) => ({
    harness: h,
    binary: h === "codex" ? "codex" : "claude",
    reason: "executable not found on PATH",
  })),
});

/**
 * The refusals the preflight can reach, each arranged over a run paused on its
 * first stage. `arrange` returns whatever the resume invocation itself needs.
 */
const PREFLIGHT_REFUSALS: {
  name: string;
  arrange: (
    h: Harness,
    runId: string,
  ) => Promise<Parameters<typeof resume>[3]>;
}[] = [
  {
    name: "a malformed checkpoint",
    arrange: async (h, runId) => {
      await fs.writeFile(
        path.join(runDirectoryFor(h.stateRoot, runId), "state.json"),
        "{ not json",
        "utf8",
      );
      return {};
    },
  },
  {
    name: "a completed run",
    arrange: async (h, runId) => {
      const finished = await resume(h, runId, standardSteps(h));
      expect(finished.code).toBe(0);
      return {};
    },
  },
  {
    name: "a recorded thread that no longer resolves",
    arrange: async (h) => {
      await fs.rm(h.fixture.threadPath as string, { recursive: true, force: true });
      return {};
    },
  },
  {
    name: "a recorded workspace that resolves to another path",
    arrange: async (h, runId) => {
      const file = path.join(runDirectoryFor(h.stateRoot, runId), "state.json");
      const raw = JSON.parse(await fs.readFile(file, "utf8")) as {
        workspace: { path: string; execution: { cwd: string } };
      };
      // A recorded workspace identity the current checkout cannot resolve to. Both
      // halves move together, because the checkpoint requires them to agree.
      raw.workspace.path = h.configRoot;
      raw.workspace.execution.cwd = h.configRoot;
      await fs.writeFile(file, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
      return {};
    },
  },
  {
    name: "a simulated toggle over a real-runtime checkpoint",
    arrange: async (h) => {
      // A valid live scenario is present, so only the run's own immutable runtime
      // can be what refuses.
      await writeSimulatedScenario(h);
      return { env: simulatedEnv(h) };
    },
  },
  {
    name: "a harness executable probe failure",
    arrange: async () => ({ probe: failingProbe }),
  },
  {
    name: "unsafe temporary workspaces",
    arrange: async (h) => {
      await makeWorkspacesUnsafe(h.fixture);
      return {};
    },
  },
  {
    name: "a workspace already locked by another run",
    arrange: async (h) => {
      const held = await acquireWorkspaceLock(
        h.stateRoot,
        h.fixture.root,
        "holder-run",
        new Date(),
      );
      if (!held.ok) throw new Error("expected to acquire the lock");
      return {};
    },
  },
];

describe.concurrent("resumeCommand — read-only preflight (AC-1.2)", () => {
  for (const refusal of PREFLIGHT_REFUSALS) {
    it(`leaves the checkpoint and lock set unchanged on ${refusal.name}`, async () => {
      const h = await setup();
      await seed(h, [{ outcome: BLOCKED }]);
      const runId = await soleRunId(h);
      const overrides = await refusal.arrange(h, runId);

      const file = path.join(runDirectoryFor(h.stateRoot, runId), "state.json");
      const before = await fs.readFile(file, "utf8");
      const writesBefore = checkpointWrites.filter(
        (dir) => dir === runDirectoryFor(h.stateRoot, runId),
      ).length;
      const locksBefore = (await lockNames(h.stateRoot)).sort();

      const result = await resume(h, runId, standardSteps(h), overrides);

      expect(result.code).toBe(1);
      expect(result.invoker.calls.length).toBe(0);
      expect(await fs.readFile(file, "utf8")).toBe(before);
      expect(
        checkpointWrites.filter(
          (dir) => dir === runDirectoryFor(h.stateRoot, runId),
        ).length,
      ).toBe(writesBefore);
      expect((await lockNames(h.stateRoot)).sort()).toEqual(locksBefore);
    });
  }
});

describe("resumeCommand — preflight owns no transition (AC-1.3)", () => {
  const source = readFileSync(new URL("./resume.ts", import.meta.url), "utf8");

  it("names no checkpoint writer, recovery dispatcher, or transition collaborator", () => {
    // A static source assertion rather than a fixture: the property under test is
    // what the command may reach at all, which no single run can demonstrate.
    for (const forbidden of [
      "state/persist",
      "writeCheckpoint",
      "recovery",
      "decideRecovery",
      "WaitingRecovery",
      "gitops/boundary",
      "finalizeGitBoundary",
      "isWorktreeClean",
      "thread/queues",
      "scanPendingQueues",
      "evaluatePromisedState",
      "runner/classify",
      "stageIndex:",
      "attempts:",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});

describe.concurrent("resumeCommand — clean-worktree rule (AC-15.1)", () => {
  it("refuses a dirty worktree for an outcome-blocked pause, leaving the checkpoint unchanged", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    const before = await readCp(h, runId);
    await fs.writeFile(path.join(h.fixture.root, "stray.txt"), "dirty\n", "utf8");
    const result = await resume(h, runId, standardSteps(h));
    expect(result.code).toBe(1);
    expect(result.out).toContain("Run details");
    expect(result.out).toContain(runId);
    expect(result.err).toContain("not clean");
    const after = await readCp(h, runId);
    expect(after.condition).toBe("waiting-for-user");
    expect(after.waiting?.reasons[0].kind).toBe("outcome-blocked");
    expect(after.updatedAt).toBe(before.updatedAt);
  });

  it("accepts a dirty worktree for a commit-error pause and finalizes the boundary", async () => {
    const h = await setup();
    // Force a commit-error by failing the pre-commit hook during the seed.
    const hook = path.join(h.fixture.root, ".git", "hooks", "pre-commit");
    await fs.writeFile(hook, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    await fs.chmod(hook, 0o755);
    await seed(h, [
      { before: () => writeThreadFileSync(h.fixture, "spec.md", "# Spec\n"), outcome: DONE },
    ]);
    const runId = await soleRunId(h);
    const seededCp = await readCp(h, runId);
    expect(seededCp.waiting?.reasons[0].kind).toBe("commit-error");

    await fs.rm(hook, { force: true });
    const result = await resume(h, runId, standardSteps(h).slice(1));
    expect(result.err).not.toContain("not clean");
    expect(result.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): spec`);
  });
});

/**
 * The three pauses the clean-worktree rule exempts, each seeded through a real
 * run. The temporary-workspace check is exempt from nothing, so every one of
 * them has to reach it.
 */
const CLEAN_WORKTREE_EXEMPT_PAUSES: {
  kind: string;
  seedPause: (h: Harness) => Promise<void>;
}[] = [
  {
    kind: "git-policy-violation",
    seedPause: async (h) => {
      await seed(h, [
        {
          before: () => {
            writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
            writeRootFileSync(h.fixture, "stray.txt", "x");
          },
          outcome: DONE,
        },
      ]);
    },
  },
  {
    kind: "commit-error",
    seedPause: async (h) => {
      // A rejecting pre-commit hook fails the boundary commit itself; it is
      // removed again so only the workspace state can refuse the resume.
      const hook = path.join(h.fixture.root, ".git", "hooks", "pre-commit");
      await fs.writeFile(hook, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
      await fs.chmod(hook, 0o755);
      await seed(h, [
        {
          before: () => writeThreadFileSync(h.fixture, "spec.md", "# Spec\n"),
          outcome: DONE,
        },
      ]);
      await fs.rm(hook, { force: true });
    },
  },
  {
    kind: "stage-contract-violation",
    seedPause: async (h) => {
      // The `spec` stage reports DONE and writes nothing, so the spec it
      // promises is missing.
      await seed(h, [{}]);
    },
  },
];

describe.concurrent("resumeCommand — temporary-workspace safety (AC-1.7, AC-2.2, AC-2.4)", () => {
  for (const pause of CLEAN_WORKTREE_EXEMPT_PAUSES) {
    it(`refuses unsafe temporary workspaces for a ${pause.kind} pause`, async () => {
      const h = await setup();
      await pause.seedPause(h);
      const runId = await soleRunId(h);
      expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe(pause.kind);
      const checkpointFile = path.join(
        runDirectoryFor(h.stateRoot, runId),
        "state.json",
      );
      const before = await fs.readFile(checkpointFile, "utf8");

      await makeWorkspacesUnsafe(h.fixture);
      const result = await resume(h, runId, standardSteps(h));

      expect(result.code).toBe(1);
      const rel = h.fixture.threadRelPath as string;
      expect(result.err).toContain("Run cannot resume ❌");
      expect(result.err).toContain(`Run ID:   ${runId}`);
      expect(result.err).toContain("Check:    Temporary workspace Git safety");
      expect(result.err).toContain("Missing ignore coverage");
      expect(result.err).toContain("    - .pending-decisions/");
      expect(result.err).toContain("    - .pending-reviews/");
      expect(result.err).toContain("Tracked temporary content");
      expect(result.err).toContain("    - .implementation-runs/leftover.md");
      expect(result.err).toContain(
        `      git rm -r --cached -- ${rel}/.implementation-runs`,
      );
      expect(result.err).toContain(
        "Result:   Checkpoint unchanged. No lock was acquired and no stage was run.",
      );
      expect(result.err.trimEnd().split("\n").at(-1)).toContain(
        `Resume:   antmay afk resume ${runId}`,
      );
      // This pause is exempt from the clean-worktree rule, so nothing else here
      // would have stopped the resume — and the workspace refusal never offers
      // the commit-or-revert advice that would commit the residue.
      expect(result.err).not.toContain("not clean");
      expect(result.invoker.calls.length).toBe(0);
      expect(await fs.readFile(checkpointFile, "utf8")).toBe(before);
      expect(await lockNames(h.stateRoot)).toEqual([]);
    });
  }
});

describe("resumeCommand — signal observations through lock acquisition", () => {
  const observations = [
    { name: "after run location", fireAt: 1 },
    { name: "after checkpoint load", fireAt: 2 },
    { name: "after thread revalidation", fireAt: 3 },
    { name: "after runtime resolution", fireAt: 4 },
    { name: "after workspace validation", fireAt: 5 },
    { name: "immediately before lock acquisition", fireAt: 6 },
    { name: "immediately after lock acquisition", fireAt: 7 },
  ] as const;

  for (const observation of observations) {
    it(`returns the conventional signal code ${observation.name} with unchanged checkpoint, no lock, and no engine`, async () => {
      const h = await setup();
      await seed(h, [{ outcome: BLOCKED }]);
      const runId = await soleRunId(h);
      const file = path.join(runDirectoryFor(h.stateRoot, runId), "state.json");
      const before = await fs.readFile(file, "utf8");
      const writesBefore = checkpointWrites.filter(
        (dir) => dir === runDirectoryFor(h.stateRoot, runId),
      ).length;

      let engineCalls = 0;
      const runEngine = async (): Promise<ExecutionResult> => {
        engineCalls += 1;
        throw new Error("engine must not run on a pre-engine signal exit");
      };

      let calls = 0;
      const result = await resume(h, runId, standardSteps(h), {
        runEngine,
        installSignals: fakeSignals(() =>
          ++calls >= observation.fireAt ? "SIGINT" : null,
        ),
      });

      expect(result.code).toBe(EXIT_SIGINT);
      expect(await fs.readFile(file, "utf8")).toBe(before);
      expect(
        checkpointWrites.filter(
          (dir) => dir === runDirectoryFor(h.stateRoot, runId),
        ).length,
      ).toBe(writesBefore);
      expect(await lockNames(h.stateRoot)).toEqual([]);
      expect(engineCalls).toBe(0);
      expect(result.invoker.calls.length).toBe(0);
    });
  }
});

describe("resumeCommand — engine handoff (AC-1.1)", () => {
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
        waiting: governedBy({ kind: "outcome-blocked", message: "blocked" }),
      },
      code: EXIT_WAITING,
    },
    {
      name: "an interruption",
      result: { kind: "interrupted", signal: "SIGINT" },
      code: EXIT_SIGINT,
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
    it(`enters the same engine with the resumed cursor and maps ${testCase.name}`, async () => {
      const h = await setup();
      // A blocked first stage leaves a pause whose recovery runs the stage again,
      // which is the path that carries a cursor into the engine.
      await seed(h, [{ outcome: BLOCKED }]);
      const runId = await soleRunId(h);
      const durable = await readCp(h, runId);
      const entries: ExecutionEntry[] = [];
      const contexts: ExecutionContext[] = [];
      const runEngine = async (ctx: ExecutionContext): Promise<ExecutionResult> => {
        contexts.push(ctx);
        entries.push(ctx.entry);
        return testCase.result;
      };

      const result = await resume(h, runId, [], { runEngine });

      expect(entries.map((entry) => entry.kind)).toEqual(["resume"]);
      // The cursor is the validated checkpoint exactly as it was found: recovering
      // the pause belongs to the engine, so nothing is adjusted on the way in.
      expect(entries[0]?.checkpoint).toEqual(durable);
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

  it("releases the lock and uninstalls handlers when the engine throws", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    const before = await readCp(h, runId);
    let uninstalled = false;
    const runEngine = async (): Promise<ExecutionResult> => {
      throw new Error("engine exploded");
    };

    await expect(
      resume(h, runId, [], {
        runEngine,
        installSignals: () => ({
          signaled: () => null,
          exitCodeFor: () => EXIT_SIGINT,
          uninstall: () => {
            uninstalled = true;
          },
        }),
      }),
    ).rejects.toThrow("engine exploded");

    expect((await readCp(h, runId)).updatedAt).toBe(before.updatedAt);
    expect(await lockNames(h.stateRoot)).toEqual([]);
    expect(uninstalled).toBe(true);
  });
});

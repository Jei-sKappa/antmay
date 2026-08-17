import { rmSync, writeFileSync, promises as fs } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { EXIT_SIGINT } from "../cli/exit-codes.js";
import { readCheckpoint } from "../state/checkpoint/read.js";
import { acquireWorkspaceLock } from "../state/lock.js";
import { createRunDirectory, runsDirectory } from "../state/runs.js";
import {
  SIGNAL_EXIT,
  STANDARD_STAGE_IDS,
  dropPendingDecision,
  dropPendingDecisionSync,
  failingProbe,
  lockNames,
  makeWorkspacesUnsafe,
  pipelineDocument,
  run,
  runDirNames,
  settingsFor,
  setup,
  soleCheckpointDir,
  standardSteps,
  type Harness,
  type RunResult,
} from "../test-helpers/run-harness.js";

/**
 * What refuses a new run and what it leaves behind when it does: the preflight
 * gates, the allocation transaction's races, and the pauses allocation still
 * reaches.
 */

describe.concurrent("runCommand — preflight failures leave no run, no checkpoint, no lock (AC-7.1)", () => {
  async function expectClean(h: Harness, result: RunResult): Promise<void> {
    expect(result.code).toBe(1);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  }

  it("rejects a named pipeline whose document does not exist", async () => {
    const h = await setup();
    const result = await run(h, [], { pipeline: "nope" });
    await expectClean(h, result);
    expect(result.err).toContain("No pipeline document exists at");
    expect(result.err).toContain(path.join("pipelines", "nope.json"));
  });

  it("rejects a bare filename reference with both legal alternatives", async () => {
    const h = await setup();
    const result = await run(h, [], { pipeline: "standard.json" });
    await expectClean(h, result);
    expect(result.err).toContain('Use "standard"');
    expect(result.err).toContain('"./standard.json"');
  });

  it("rejects a structurally invalid pipeline document", async () => {
    const h = await setup({
      pipeline: { schemaVersion: 1, name: "standard", stages: [] },
    });
    const result = await run(h, []);
    await expectClean(h, result);
    expect(result.err).toContain("schemaVersion must be 0.");
    // A field-level problem names no file of its own, so the diagnostic has to
    // name the resolved source the rejected document was read from.
    expect(result.err).toContain(
      `The pipeline document at ${path.join(h.configRoot, "pipelines", "standard.json")} was rejected:`,
    );
  });

  it("rejects a named profile whose document does not exist", async () => {
    const h = await setup();
    const result = await run(h, [], { profile: "nope" });
    await expectClean(h, result);
    expect(result.err).toContain("No execution profile document exists at");
    expect(result.err).toContain(
      `The execution profile at ${path.join(h.configRoot, "profiles", "nope.json")} was rejected:`,
    );
  });

  it("rejects an unresolvable thread", async () => {
    const h = await setup();
    const result = await run(h, [], { thread: "no-such-thread" });
    await expectClean(h, result);
  });

  it("refuses a selected stage that no source binds, naming that stage", async () => {
    const h = await setup({
      settings: settingsFor(STANDARD_STAGE_IDS.slice(1)),
    });
    const result = await run(h, []);
    await expectClean(h, result);
    expect(result.err).toContain('Stage "spec" has no execution binding');
  });

  it("rejects an invalid settings document", async () => {
    const h = await setup({ settings: { afk: { defaults: {} } } });
    const result = await run(h, []);
    await expectClean(h, result);
    expect(result.err).toContain("afk.defaults");
    expect(result.err).toContain(
      `The settings document at ${path.join(h.configRoot, "settings.json")} was rejected:`,
    );
  });

  it("refuses an impossible composition before allocation", async () => {
    const h = await setup({
      pipeline: pipelineDocument(["plan-brief", "implement-plan"]),
      settings: settingsFor(["plan-brief", "implement-plan"]),
    });
    const result = await run(h, []);
    await expectClean(h, result);
    expect(result.err).toContain("Pipeline cannot start ❌");
    expect(result.err).toContain("Pipeline:  standard");
    expect(result.err).toContain(
      "Where:     pipeline stage 2 of 2 · implement-plan",
    );
    expect(result.err).toContain(
      "After stage 1 · plan-brief:\n    a non-empty plan.md and no plan-tasks/ folder",
    );
    expect(result.err).toContain(
      'Stage 1 "plan-brief" is the last earlier stage to change the plan',
    );
    expect(result.err).toContain("Result:    No stages were run.");
  });

  it("refuses an unknown --from stage before allocation, naming it", async () => {
    const h = await setup();
    const result = await run(h, [], { from: "implement" });
    await expectClean(h, result);
    expect(result.err).toContain("Pipeline cannot start ❌");
    expect(result.err).toContain("Where:     --from implement");
    expect(result.err).toContain(
      "Problem:   The requested entry point is not selected by this pipeline.",
    );
    expect(result.err).toContain(
      '"implement" does not occur in this one.',
    );
  });

  it("refuses a --from entry point the thread cannot satisfy", async () => {
    const h = await setup({ stages: STANDARD_STAGE_IDS });
    const result = await run(h, [], { from: "plan-strict" });
    await expectClean(h, result);
    expect(result.err).toContain(
      "Where:     pipeline stage 4 of 6 · plan-strict",
    );
    expect(result.err).toContain(
      "Selection: selected stage 1 of 3 from --from plan-strict",
    );
    expect(result.err).toContain(
      "none — this is the first selected stage",
    );
  });

  it("rejects when a selected harness executable is unavailable", async () => {
    const h = await setup();
    const result = await run(h, [], { probe: failingProbe });
    await expectClean(h, result);
    expect(result.err).toContain("not found on PATH");
  });

  it("refuses unsafe temporary workspaces before the clean-worktree gate", async () => {
    const h = await setup();
    await makeWorkspacesUnsafe(h.fixture);

    const result = await run(h, standardSteps(h));

    await expectClean(h, result);
    const rel = h.fixture.threadRelPath as string;
    // One refusal covers every failing workspace from both probes.
    expect(result.err).toContain("Pipeline cannot start ❌");
    expect(result.err).toContain("Check:    Temporary workspace Git safety");
    expect(result.err).toContain(
      "Problem:  Antmay's temporary workspaces are not Git-safe.",
    );
    expect(result.err).toContain("Missing ignore coverage");
    expect(result.err).toContain("    - .pending-decisions/");
    expect(result.err).toContain("    - .pending-reviews/");
    expect(result.err).toContain("Tracked temporary content");
    expect(result.err).toContain("    - .implementation-runs/leftover.md");
    expect(result.err).toContain(
      `      git rm -r --cached -- ${rel}/.implementation-runs`,
    );
    expect(result.err).toContain(
      "Result:   No run was created and no stages were run.",
    );
    // The tree is dirty too, and the advice a dirty tree earns — commit or
    // revert — would commit the residue this refusal exists to keep out.
    expect(result.err).not.toContain("not clean");
    expect(result.invoker.calls.length).toBe(0);
    // `expectClean` already proved no run directory exists, so no `state.json`
    // was written either.
  });

  it("rejects a dirty worktree", async () => {
    const h = await setup();
    await fs.writeFile(path.join(h.fixture.root, "stray.txt"), "dirty\n", "utf8");
    const result = await run(h, []);
    await expectClean(h, result);
    expect(result.err).toContain("not clean");
  });

  it("rejects a thread with a non-empty pending queue", async () => {
    const h = await setup();
    await dropPendingDecision(h.fixture, "d1.md");
    const result = await run(h, []);
    await expectClean(h, result);
  });

  it("rejects when a pending queue cannot be scanned", async () => {
    const h = await setup();
    // A regular file where the queue directory is expected makes the scan's
    // readdir fail with ENOTDIR. It has to be both untracked and ignored: Git
    // tracking anything at a temporary-workspace path is refused before the
    // scan is reached, and an unignored file would leave the worktree dirty.
    await fs.appendFile(
      path.join(h.fixture.root, ".gitignore"),
      ".pending-decisions\n",
      "utf8",
    );
    await h.fixture.git(["add", "--", ".gitignore"]);
    await h.fixture.git(["commit", "-m", "chore: ignore the queue path itself"]);
    await fs.writeFile(
      path.join(h.fixture.threadPath as string, ".pending-decisions"),
      "not a directory",
      "utf8",
    );
    const result = await run(h, []);
    await expectClean(h, result);
    // The scan failure is what refused this run, not an earlier gate.
    expect(result.err).toContain("Cannot scan ");
    expect(result.err).toContain(".pending-decisions");
  });

  it("refuses when an unfinished run already exists for the same thread (AC-7.1)", async () => {
    const h = await setup();
    // First run pauses (BLOCKED) leaving a waiting checkpoint and no changes.
    const first = await run(h, [
      { outcome: { kind: "completed", finalText: "Outcome: BLOCKED" } },
    ]);
    expect(first.code).toBe(2);
    const existingId = (await runDirNames(h.stateRoot))[0]!;

    const second = await run(h, standardSteps(h));
    expect(second.code).toBe(1);
    expect(second.err).toContain(existingId);
    expect(second.err).toContain("antmay afk resume");
    // Still exactly the one paused run; the second created nothing.
    expect(await runDirNames(h.stateRoot)).toEqual([existingId]);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("exits 1 on lock contention, printing the lock metadata and path", async () => {
    const h = await setup();
    const outcome = await acquireWorkspaceLock(
      h.stateRoot,
      h.fixture.root,
      "holder-run",
      new Date(),
    );
    if (!outcome.ok) throw new Error("expected to acquire the lock");

    const result = await run(h, standardSteps(h));
    expect(result.code).toBe(1);
    expect(result.err).toContain("already locked");
    expect(result.err).toContain(outcome.handle.lockPath);
    expect(await runDirNames(h.stateRoot)).toEqual([]);
    // Only the pre-acquired lock remains; the command never held its own.
    expect(await lockNames(h.stateRoot)).toHaveLength(1);
  });
});

describe.concurrent("runCommand — allocation races (AC-7.4, AC-7.5)", () => {
  it("re-checks the queues under the lock and creates nothing when one fills mid-allocation", async () => {
    const h = await setup();
    // generateId runs after the initial preflight scan but before lock
    // acquisition and the under-lock recheck: dropping a pending file here
    // exercises the locked recheck race.
    const result = await run(h, standardSteps(h), {
      generateId: () => {
        void dropPendingDecisionSync(h.fixture, "race.md");
        return "queuerace-000000000000";
      },
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain("unresolved pending bundle files");
    expect(await runDirNames(h.stateRoot)).toEqual([]);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("turns a locked queue rescan into a scan error after read-only preflight", async () => {
    const h = await setup();
    // Preflight sees absent queues as empty. Replacing the path with a regular
    // file after that scan makes the under-lock readdir fail with ENOTDIR.
    const result = await run(h, standardSteps(h), {
      generateId: () => {
        writeFileSync(
          path.join(h.fixture.threadPath as string, ".pending-decisions"),
          "not a directory",
          "utf8",
        );
        return "scanrace-000000000000";
      },
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain("Cannot scan ");
    expect(result.err).toContain(".pending-decisions");
    expect(await runDirNames(h.stateRoot)).toEqual([]);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("releases the first lock and regenerates on an ID collision (AC-7.5)", async () => {
    const h = await setup();
    // Pre-create the colliding run directory so createRunDirectory reports a
    // collision on the first candidate.
    await createRunDirectory(h.stateRoot, "collide-000000000000");

    let call = 0;
    const result = await run(h, standardSteps(h), {
      generateId: () => (call++ === 0 ? "collide-000000000000" : "fresh-111111111111"),
    });

    expect(result.code).toBe(0);
    const runDir = path.join(runsDirectory(h.stateRoot), "fresh-111111111111");
    const cp = await readCheckpoint(runDir);
    expect(cp.ok).toBe(true);
    if (cp.ok) expect(cp.checkpoint.runId).toBe("fresh-111111111111");
    // The pre-created colliding directory holds no checkpoint of its own.
    const collide = await readCheckpoint(
      path.join(runsDirectory(h.stateRoot), "collide-000000000000"),
    );
    expect(collide.ok).toBe(false);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("repeats the locked queue rescan for the fresh candidate after a collision", async () => {
    const h = await setup();
    await createRunDirectory(h.stateRoot, "collide-000000000000");

    let call = 0;
    const result = await run(h, standardSteps(h), {
      generateId: () => {
        const id =
          call === 0 ? "collide-000000000000" : "fresh-111111111111";
        call += 1;
        // After the colliding candidate releases, the fresh ID must still
        // acquire its own lock and rescan — a pending file dropped here proves
        // that second rescan runs.
        if (call === 2) {
          dropPendingDecisionSync(h.fixture, "after-collision.md");
        }
        return id;
      },
    });

    expect(result.code).toBe(1);
    expect(result.err).toContain("unresolved pending bundle files");
    expect(result.err).toContain("after-collision.md");
    // Collision left the empty colliding directory; the fresh candidate never
    // created one.
    expect(await runDirNames(h.stateRoot)).toEqual(["collide-000000000000"]);
    const collide = await readCheckpoint(
      path.join(runsDirectory(h.stateRoot), "collide-000000000000"),
    );
    expect(collide.ok).toBe(false);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });

  it("preserves the run directory and releases the lock when the initial checkpoint write fails", async () => {
    const h = await setup();
    let uninstalled = false;
    const result = await run(h, standardSteps(h), {
      generateId: () => "writefail-000000000000",
      writeInitialCheckpoint: async () => {
        throw new Error("disk full");
      },
      installSignals: () => ({
        signaled: () => null,
        exitCodeFor: (sig) => SIGNAL_EXIT[sig] ?? EXIT_SIGINT,
        uninstall: () => {
          uninstalled = true;
        },
      }),
    });

    expect(result.code).toBe(1);
    expect(result.err).toContain("Failed to write the initial checkpoint");
    expect(result.err).toContain("writefail-000000000000");
    expect(result.err).toContain("disk full");
    expect(await runDirNames(h.stateRoot)).toEqual(["writefail-000000000000"]);
    const cp = await readCheckpoint(
      path.join(runsDirectory(h.stateRoot), "writefail-000000000000"),
    );
    expect(cp.ok).toBe(false);
    expect(await lockNames(h.stateRoot)).toEqual([]);
    expect(uninstalled).toBe(true);
  });
});

describe.concurrent("runCommand — artifact drift after preflight (AC-7.1)", () => {
  it("pauses the stage without a harness call when its prerequisite disappears after composition", async () => {
    const h = await setup({
      pipeline: pipelineDocument(["reconcile-spec"]),
      settings: settingsFor(["reconcile-spec"]),
    });
    const specPath = path.join(h.fixture.threadPath as string, "spec.md");
    await fs.writeFile(specPath, "# Spec\n", "utf8");
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "docs: spec"]);

    // `generateId` runs after composition simulated the thread's state and
    // before the runner re-inspects it, which is the drift window.
    const result = await run(h, [{}], {
      generateId: () => {
        rmSync(specPath);
        return "artifactdrift-0000";
      },
    });

    expect(result.code).toBe(2);
    expect(result.invoker.calls.length).toBe(0);
    expect(result.out).toContain(
      "STAGE CANNOT START — requirements not met ❌",
    );
    expect(result.out).toContain("stage 1 of 1 · reconcile-spec");
    const cp = await readCheckpoint(await soleCheckpointDir(h.stateRoot));
    expect(cp.ok).toBe(true);
    if (!cp.ok) return;
    expect(cp.checkpoint.condition).toBe("waiting-for-user");
    expect(cp.checkpoint.stageIndex).toBe(0);
    expect(cp.checkpoint.attempts).toEqual([]);
    expect(cp.checkpoint.waiting?.reasons[0].kind).toBe("stage-prerequisite-unmet");
    expect(cp.checkpoint.waiting?.reasons[0].contract).toEqual([
      { dimension: "spec", expected: true, observed: false },
    ]);
  });
});

describe.concurrent("runCommand — non-blocking and pause behavior (AC-7.6, AC-1.3)", () => {
  it("warns about a corrupt sibling checkpoint without blocking creation (AC-7.6)", async () => {
    const h = await setup();
    const corrupt = await createRunDirectory(h.stateRoot, "corrupt-run-000000");
    if (corrupt.kind === "created") {
      await fs.writeFile(path.join(corrupt.runDir, "state.json"), "{ not json", "utf8");
    }
    const result = await run(h, standardSteps(h));
    expect(result.code).toBe(0);
    expect(result.err).toContain("warning");
    expect(result.err).toContain("unreadable");
    // The new run was created alongside the corrupt sibling.
    expect((await runDirNames(h.stateRoot)).length).toBe(2);
  });

  it("exits 2 on a durable pause and prints the exact resume command", async () => {
    const h = await setup();
    const result = await run(h, [
      { outcome: { kind: "completed", finalText: "Outcome: BLOCKED — needs a human" } },
    ]);
    expect(result.code).toBe(2);
    const runId = (await runDirNames(h.stateRoot))[0]!;
    expect(result.out).toContain(`antmay afk resume ${runId}`);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });
});

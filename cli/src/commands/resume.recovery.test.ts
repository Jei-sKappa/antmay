import { promises as fs } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { RunCheckpoint } from "../state/checkpoint/types.js";
import { acquireWorkspaceLock } from "../state/lock.js";
import { writeCheckpoint } from "../state/persist.js";
import { runDirectoryFor } from "../state/runs.js";
import {
  BLOCKED,
  DONE,
  STANDARD_STAGE_IDS,
  attemptCountAt,
  blockQueueScan,
  commitSubjects,
  dropPendingSync,
  fakeSignals,
  headOf,
  lockNames,
  okProbe,
  readCp,
  removePending,
  resume,
  seed,
  settingsFor,
  setup,
  soleRunId,
  standardSteps,
  writeRootFileSync,
  writeThreadFileSync,
  type Harness,
} from "../test-helpers/resume-harness.js";

/**
 * What a resume does about the pause it finds: queue gates under the lock,
 * harness-free Git-boundary finalization, artifact-contract repair, and abandoned
 * cursors.
 */

describe.concurrent("resumeCommand — queue handling under the lock (AC-15.3, AC-11.6)", () => {
  it("leaves a waiting run with non-empty queues byte-for-byte unchanged, prints files, exits 2", async () => {
    const h = await setup();
    await seed(h, [{ before: () => dropPendingSync(h.fixture, "q.md"), outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    const before = await readCp(h, runId);
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(2);
    // The printed list comes from the pause's queue reason, so a file still
    // present has to be named there — the durable checkpoint stays untouched.
    expect(result.out).toContain("q.md");
    const after = await readCp(h, runId);
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
  });

  it("names a bundle that appeared while the run was paused for another reason", async () => {
    const h = await setup();
    // Pause on the stage's own verdict with both queues empty, then queue a
    // bundle by hand: the pause never recorded a queue reason, but the file is
    // why this resume cannot proceed and the reader is owed its name.
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe("outcome-blocked");
    dropPendingSync(h.fixture, "appeared.md");
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(2);
    expect(result.out).toContain("appeared.md");
  });

  it("downgrades a locked queue-scan failure to a durable gate-error and exits 2", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    await blockQueueScan(h.fixture, ".pending-reviews");
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(2);
    const cp = await readCp(h, runId);
    expect(cp.waiting?.reasons[0].kind).toBe("gate-error");
    // What the pause explains has moved on; what a later resume may do about it
    // has not.
    expect(cp.waiting?.recovery).toEqual({ kind: "retry-stage" });
    expect(cp.waiting?.nextAction).toContain("unvalidated");
  });

  it("keeps a finalized DONE's declared resolution across a scan failure, then advances", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          dropPendingSync(h.fixture, "q.md");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    const finalizedRecovery = {
      kind: "resume-finalized-done",
      attempt: { stageIndex: 0, attempt: 1 },
      queueResolution: "advance",
    };
    expect((await readCp(h, runId)).waiting?.recovery).toEqual(finalizedRecovery);

    // An unreadable queue is not an empty one, so this resume may explain that
    // and nothing else — and must leave the finalized attempt exactly as
    // advanceable as it found it.
    await removePending(h.fixture, "q.md");
    await blockQueueScan(h.fixture, ".pending-reviews");
    const held = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(held.code).toBe(2);
    expect(held.invoker.calls.length).toBe(0);
    const heldCp = await readCp(h, runId);
    expect(heldCp.waiting?.reasons[0].kind).toBe("gate-error");
    expect(heldCp.waiting?.recovery).toEqual(finalizedRecovery);
    expect(heldCp.waiting?.nextAction).toBeUndefined();

    // Readable again: the resolution the pause recorded still applies, and the
    // finalized attempt is never rerun.
    await fs.rm(path.join(h.fixture.threadPath as string, ".pending-reviews"), {
      force: true,
    });
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    expect(attemptCountAt(await readCp(h, runId), 0)).toBe(1);
  });

  it("keeps a git-policy violation governing and reports a separate scan failure", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          writeRootFileSync(h.fixture, "stray.txt", "x");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    const initialReason = (await readCp(h, runId)).waiting?.reasons[0];
    expect(initialReason?.kind).toBe("git-policy-violation");
    // Revert the disallowed change so only the boundary diff remains, then break
    // the queue scan by putting a regular file where the queue directory is
    // expected (ENOTDIR).
    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    await fs.writeFile(
      path.join(h.fixture.threadPath as string, ".pending-reviews"),
      "not a dir",
      "utf8",
    );
    const result = await resume(h, runId, []);
    expect(result.code).toBe(2);
    const cp = await readCp(h, runId);
    expect(cp.waiting?.reasons[0]).toEqual(initialReason);
    expect(cp.waiting?.reasons.map((reason) => reason.kind)).toEqual([
      "git-policy-violation",
      "gate-error",
    ]);
    expect(cp.waiting?.reasons[1]?.diagnostics?.errorMessage).toBeDefined();
    expect(result.out).toContain("FAILED — queue scan error");
  });
});

describe.concurrent("resumeCommand — pending-queues resolution (AC-15.3)", () => {
  it("re-attempts the same stage for a non-DONE pending-queues pause", async () => {
    const h = await setup();
    await seed(h, [{ before: () => dropPendingSync(h.fixture, "q.md"), outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe("pending-queues");
    await removePending(h.fixture, "q.md");
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    const cp = await readCp(h, runId);
    expect(attemptCountAt(cp, 0)).toBe(2);
  });

  it("advances without rerunning for a DONE-finalized pending-queues pause declaring advance", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          dropPendingSync(h.fixture, "q.md");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    const seededCp = await readCp(h, runId);
    expect(seededCp.waiting?.reasons[0].kind).toBe("pending-queues");
    expect(seededCp.attempts[0]?.result).toBe("done");

    await removePending(h.fixture, "q.md");
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    const cp = await readCp(h, runId);
    expect(cp.condition).toBe("completed");
    // The finalized stage-0 attempt was never rerun.
    expect(attemptCountAt(cp, 0)).toBe(1);
  });

  it("re-attempts the same stage for a DONE-finalized pending-queues pause declaring rerun", async () => {
    const h = await setup();
    await seed(h, [
      { before: () => writeThreadFileSync(h.fixture, "spec.md", "# Spec\n"), outcome: DONE },
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec v2\n");
          dropPendingSync(h.fixture, "q.md");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    const seededCp = await readCp(h, runId);
    expect(seededCp.stageIndex).toBe(1);
    expect(seededCp.waiting?.reasons[0].kind).toBe("pending-queues");

    await removePending(h.fixture, "q.md");
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    const cp = await readCp(h, runId);
    // Stage 1 (reconcile-spec, rerun) ran a fresh attempt over the finalized one.
    expect(attemptCountAt(cp, 1)).toBe(2);
  });
});

describe.concurrent("resumeCommand — harness-free Git-boundary finalization (AC-15.3)", () => {
  it("commits the preserved diff without any harness call, then advances", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          writeRootFileSync(h.fixture, "stray.txt", "x");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe("git-policy-violation");

    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): spec`);
    const cp = await readCp(h, runId);
    // Stage 0 was finalized, never rerun by a harness invocation.
    expect(attemptCountAt(cp, 0)).toBe(1);
  });

  it("rechecks a boundary retry's promise before finalizing the saved DONE", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          writeRootFileSync(h.fixture, "stray.txt", "x");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    await fs.rm(path.join(h.fixture.threadPath as string, "spec.md"));
    await fs.rm(path.join(h.fixture.root, "stray.txt"));

    const stale = await resume(
      h,
      runId,
      standardSteps(h.fixture).slice(1),
    );
    expect(stale.code).toBe(2);
    expect(stale.invoker.calls).toHaveLength(0);
    const contractPause = await readCp(h, runId);
    expect(contractPause.waiting?.reasons[0].kind).toBe(
      "stage-contract-violation",
    );
    expect(contractPause.waiting?.recovery).toMatchObject({
      kind: "recheck-stage-contract",
      attempt: { stageIndex: 0, attempt: 1 },
    });
    expect(contractPause.waiting?.nextAction).toContain(
      "Repair the promised artifact",
    );

    writeThreadFileSync(h.fixture, "spec.md", "# Repaired spec\n");
    const repaired = await resume(
      h,
      runId,
      standardSteps(h.fixture).slice(1),
    );
    expect(repaired.code).toBe(0);
    expect(
      repaired.invoker.calls.filter((call) => call.stage.id === "spec"),
    ).toHaveLength(0);
    expect(attemptCountAt(await readCp(h, runId), 0)).toBe(1);
  });

  it("keeps the same attempt finalizable when the boundary refuses again, then commits it", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          writeRootFileSync(h.fixture, "stray.txt", "x");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    const paused = await readCp(h, runId);
    const savedDone = {
      kind: "retry-git-finalization",
      attempt: { stageIndex: 0, attempt: 1 },
      pausedAtHead: paused.attempts[0]?.headAfterAttempt,
    };
    expect(paused.waiting?.recovery).toEqual(savedDone);

    // The out-of-bounds file is still there, so this resume's boundary refuses
    // exactly as the run's did — and the preserved attempt stays finalizable.
    const refused = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(refused.code).toBe(2);
    expect(refused.invoker.calls.length).toBe(0);
    const stillPaused = await readCp(h, runId);
    expect(stillPaused.waiting?.reasons[0].kind).toBe("git-policy-violation");
    expect(stillPaused.waiting?.recovery).toEqual(savedDone);
    expect(attemptCountAt(stillPaused, 0)).toBe(1);

    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): spec`);
    expect(attemptCountAt(await readCp(h, runId), 0)).toBe(1);
  });

  it("advances when the intended diff was manually committed to an empty worktree", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          writeRootFileSync(h.fixture, "stray.txt", "x");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    const folder = h.fixture.threadFolder as string;
    // The user reverts the stray file and commits the intended diff themselves.
    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    await h.fixture.git(["add", "--", `docs/threads/${folder}/spec.md`]);
    await h.fixture.git(["commit", "-m", "manual: user commit"]);

    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    const subjects = await commitSubjects(h.fixture);
    // No executor spec commit: the user's commit already satisfied the boundary.
    expect(subjects).not.toContain(`docs(${folder}): spec`);
    expect(subjects).toContain("manual: user commit");
  });

  it("applies the declared rerun resolution after finalizing a Git pause that listed pending files", async () => {
    const h = await setup();
    await seed(h, [
      { before: () => writeThreadFileSync(h.fixture, "spec.md", "# Spec\n"), outcome: DONE },
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec v2\n");
          writeRootFileSync(h.fixture, "stray.txt", "x");
          dropPendingSync(h.fixture, "q.md");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    const seededCp = await readCp(h, runId);
    expect(seededCp.stageIndex).toBe(1);
    expect(seededCp.waiting?.reasons[0].kind).toBe("git-policy-violation");
    expect(
      seededCp.waiting?.reasons.find((r) => r.kind === "pending-queues")?.pendingFiles
        ?.length,
    ).toBeGreaterThan(0);

    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    await removePending(h.fixture, "q.md");
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): reconcile spec`);
    const cp = await readCp(h, runId);
    // Stage 1 (rerun) got a fresh attempt after the boundary finalized.
    expect(attemptCountAt(cp, 1)).toBe(2);
  });

  it("warns on cross-pause HEAD movement and never treats it as a violation (AC-12.7)", async () => {
    const h = await setup();
    await seed(h, [
      {
        before: () => {
          writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
          writeRootFileSync(h.fixture, "stray.txt", "x");
        },
        outcome: DONE,
      },
    ]);
    const runId = await soleRunId(h);
    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    // Move HEAD while paused with an unrelated commit.
    await fs.writeFile(path.join(h.fixture.root, "other.txt"), "y\n", "utf8");
    await h.fixture.git(["add", "--", "other.txt"]);
    await h.fixture.git(["commit", "-m", "chore: unrelated"]);

    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.err).toContain("HEAD moved");
    expect(result.code).toBe(0);
  });

  it("finalizes the implement boundary by committing the implementation report", async () => {
    // The implementation boundary is the one this case is about, so it selects
    // the whole Standard sequence to reach it.
    const h = await setup(settingsFor(), STANDARD_STAGE_IDS);
    const steps = standardSteps(h.fixture);
    steps[5] = {
      before: () => {
        writeThreadFileSync(h.fixture, "implementation-report.md", "# Report\n");
        writeRootFileSync(h.fixture, "stray.txt", "x");
      },
    };
    await seed(h, steps);
    const runId = await soleRunId(h);
    const seededCp = await readCp(h, runId);
    expect(seededCp.stageIndex).toBe(5);
    expect(seededCp.waiting?.reasons[0].kind).toBe("git-policy-violation");

    await fs.rm(path.join(h.fixture.root, "stray.txt"), { force: true });
    const result = await resume(h, runId, []);
    expect(result.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(
      `docs(${folder}): implementation report`,
    );
    const cp = await readCp(h, runId);
    expect(cp.condition).toBe("completed");
    // Stage 5 was finalized, never rerun by a harness invocation.
    expect(attemptCountAt(cp, 5)).toBe(1);
    // The boundary commit this resume made is the tip the finalized attempt
    // records, exactly as a boundary committed during the run leaves it.
    const finalized = cp.attempts.find((a) => a.stageIndex === 5);
    expect(finalized?.headAfterAttempt).toBe(await headOf(h.fixture));
  });
});

describe.concurrent("resumeCommand — artifact-contract recovery (AC-7.4, AC-7.5, AC-7.6)", () => {
  /**
   * Pause stage 0 on its contract: the `spec` stage reports DONE and writes
   * nothing, so the spec it promises is missing.
   */
  async function seedContractViolation(h: Harness): Promise<string> {
    const seeded = await seed(h, [{}]);
    expect(seeded.code).toBe(2);
    const runId = await soleRunId(h);
    const cp = await readCp(h, runId);
    expect(cp.waiting?.reasons[0].kind).toBe("stage-contract-violation");
    expect(cp.attempts[0]?.terminalResult?.token).toBe("DONE");
    return runId;
  }

  it("pauses on a prerequisite lost while stopped, then starts the stage once it is restored", async () => {
    const h = await setup();
    // Stage 0 writes the spec and finishes; stage 1 pauses on its own verdict.
    await seed(h, [
      { before: () => writeThreadFileSync(h.fixture, "spec.md", "# Spec\n") },
      { outcome: BLOCKED },
    ]);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).stageIndex).toBe(1);

    // The spec is deleted and the deletion committed: the worktree is clean, so
    // nothing but the contract check can refuse this resume.
    const specPath = path.join(h.fixture.threadPath as string, "spec.md");
    await fs.rm(specPath);
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "chore: drop the spec"]);

    const first = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(first.code).toBe(2);
    expect(first.invoker.calls.length).toBe(0);
    expect(first.out).toContain(
      "STAGE CANNOT START — requirements not met ❌",
    );
    expect(first.out).toContain("stage 2 of 3 · reconcile-spec");
    const paused = await readCp(h, runId);
    expect(paused.stageIndex).toBe(1);
    expect(paused.waiting?.reasons[0].kind).toBe("stage-prerequisite-unmet");
    expect(paused.waiting?.reasons[0].contract).toEqual([
      { dimension: "spec", expected: true, observed: false },
    ]);
    expect(attemptCountAt(paused, 1)).toBe(1);

    // Restored and committed, the stage starts.
    writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "chore: restore the spec"]);
    const second = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(second.code).toBe(0);
    expect(attemptCountAt(await readCp(h, runId), 1)).toBe(2);
  });

  it("finalizes the saved DONE without another attempt once the promised artifact is repaired", async () => {
    const h = await setup();
    const runId = await seedContractViolation(h);
    // The human writes the missing spec, leaving the worktree dirty — which
    // this pause is allowed to inspect.
    writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");

    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.err).not.toContain("not clean");
    expect(result.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): spec`);
    const cp = await readCp(h, runId);
    expect(cp.condition).toBe("completed");
    // Stage 0 was finalized from its saved DONE, never run again.
    expect(attemptCountAt(cp, 0)).toBe(1);
    expect(cp.attempts[0]?.result).toBe("done");
  });

  it("reports the HEAD rule advisorily when a repaired promise first reaches the boundary", async () => {
    const h = await setup();
    // The stage-0 attempt commits on its own — movement the `spec` stage
    // forbids — and reports DONE without the spec it promises, so the runner
    // stops at the contract and never evaluates the boundary.
    const seeded = await seed(h, [
      {
        before: async () => {
          writeRootFileSync(h.fixture, "stray.txt", "x");
          await h.fixture.git(["add", "-A"]);
          await h.fixture.git(["commit", "-m", "chore: attempt commit"]);
        },
      },
    ]);
    expect(seeded.code).toBe(2);
    const runId = await soleRunId(h);
    expect((await readCp(h, runId)).waiting?.reasons[0].kind).toBe(
      "stage-contract-violation",
    );

    // The human repairs the promise. The contract now holds, so finalization is
    // reached — and it is the first and only evaluation of a HEAD rule this
    // attempt already broke.
    writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
    const result = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(result.code).toBe(2);
    expect(result.invoker.calls.length).toBe(0);
    const cp = await readCp(h, runId);
    expect(cp.stageIndex).toBe(0);
    expect(cp.waiting?.reasons[0].kind).toBe("unexpected-head-movement");
    expect(cp.waiting?.reasons[0].message).toContain(
      cp.attempts[0]?.headAtStart,
    );
    expect(cp.waiting?.reasons[0].message).toContain(
      cp.attempts[0]?.headAfterAttempt,
    );
    expect(cp.waiting?.nextAction).toContain("will not block the next resume");
    expect(cp.waiting?.nextAction).not.toContain("unvalidated");

    const accepted = await resume(
      h,
      runId,
      standardSteps(h.fixture).slice(1),
    );
    expect(accepted.code).toBe(0);
    expect(attemptCountAt(await readCp(h, runId), 0)).toBe(1);
  });

  it("judges the HEAD rule against the second attempt's own start, not the stage entry", async () => {
    const h = await setup();
    // Attempt 1 of stage 0 reports DONE without the spec it promises.
    const runId = await seedContractViolation(h);

    // The human commits across the pause — HEAD moves without the promise being
    // met — so the clean-worktree resume runs the stage again.
    writeRootFileSync(h.fixture, "notes.txt", "partial repair\n");
    await h.fixture.git(["add", "-A"]);
    await h.fixture.git(["commit", "-m", "chore: human commit across the pause"]);
    const relaunched = await resume(h, runId, [{}]);
    expect(relaunched.code).toBe(2);
    const paused = await readCp(h, runId);
    expect(attemptCountAt(paused, 0)).toBe(2);
    expect(paused.waiting?.reasons[0].kind).toBe("stage-contract-violation");

    // Attempt 2 started after that commit and moved HEAD no further, so the
    // `spec` stage's forbidden-HEAD-movement rule holds and the repaired
    // promise finalizes.
    writeThreadFileSync(h.fixture, "spec.md", "# Spec\n");
    const finalized = await resume(h, runId, standardSteps(h.fixture).slice(1));
    expect(finalized.out).not.toContain("forbids HEAD movement");
    expect(finalized.code).toBe(0);
    const folder = h.fixture.threadFolder as string;
    expect(await commitSubjects(h.fixture)).toContain(`docs(${folder}): spec`);
    const cp = await readCp(h, runId);
    expect(cp.condition).toBe("completed");
    // The saved DONE of attempt 2 was finalized, never run a third time.
    expect(attemptCountAt(cp, 0)).toBe(2);
  });

  it("starts a fresh same-stage attempt when the promise is still unmet and the worktree is clean", async () => {
    const h = await setup();
    const runId = await seedContractViolation(h);

    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    const cp = await readCp(h, runId);
    expect(cp.condition).toBe("completed");
    expect(attemptCountAt(cp, 0)).toBe(2);
  });

  it("keeps the contract reason governing when a locked queue scan fails", async () => {
    const h = await setup();
    const runId = await seedContractViolation(h);
    // The queue scan fails while the pause is held. Downgrading the pause to a
    // gate-error would throw away the saved DONE's recovery path.
    await blockQueueScan(h.fixture, ".pending-reviews");

    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(2);
    const cp = await readCp(h, runId);
    expect(cp.waiting?.reasons[0].kind).toBe("stage-contract-violation");
    expect(cp.waiting?.reasons[1]?.kind).toBe("gate-error");
    expect(result.out).toContain("FAILED — queue scan error");
  });

  it("stays paused with repair-or-revert guidance when the promise is still unmet and the worktree is dirty", async () => {
    const h = await setup();
    const runId = await seedContractViolation(h);
    writeRootFileSync(h.fixture, "stray.txt", "x");

    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(2);
    expect(result.invoker.calls.length).toBe(0);
    const cp = await readCp(h, runId);
    expect(cp.stageIndex).toBe(0);
    expect(cp.waiting?.reasons[0].kind).toBe("stage-contract-violation");
    expect(cp.waiting?.reasons[0].detail).toContain("dirty");
    expect(cp.waiting?.nextAction).toContain("revert");
    expect(attemptCountAt(cp, 0)).toBe(1);
    // The recheck restates the still-unmet promise as the file it is about, in
    // the same words the rendered `Artifacts:` row uses.
    expect(cp.waiting?.reasons[0].message).toContain("a non-empty spec.md");
    expect(result.out).toContain("expected a non-empty spec.md, found no spec.md");
    expect(result.out).not.toContain("expected true, found false");
  });
});

describe.concurrent("resumeCommand — unrecoverable recovery documents (AC-2.3)", () => {
  /**
   * Rewrite a seeded run's raw `state.json`, which is what lets a case present a
   * document the validator refuses. The exact bytes are returned so the case can
   * prove nothing wrote over them.
   */
  async function writeRawCheckpoint(
    h: Harness,
    runId: string,
    mutate: (raw: Record<string, unknown>) => void,
  ): Promise<{ file: string; text: string }> {
    const file = path.join(runDirectoryFor(h.stateRoot, runId), "state.json");
    const raw = JSON.parse(await fs.readFile(file, "utf8")) as Record<string, unknown>;
    mutate(raw);
    const text = `${JSON.stringify(raw, null, 2)}\n`;
    await fs.writeFile(file, text, "utf8");
    return { file, text };
  }

  /** The two shapes the audit found a resume would accept and then finalize. */
  const unrecoverable: {
    name: string;
    mutate: (raw: Record<string, unknown>) => void;
  }[] = [
    {
      name: "a saved-DONE recovery whose referenced attempt reported BLOCKED",
      mutate: (raw) => {
        const stages = raw.stages as Array<{ queueResolution: string }>;
        (raw.waiting as Record<string, unknown>).recovery = {
          kind: "resume-finalized-done",
          attempt: { stageIndex: 0, attempt: 1 },
          queueResolution: stages[0]!.queueResolution,
        };
      },
    },
    {
      name: "a finalization recovery that references no recorded attempt",
      mutate: (raw) => {
        raw.attempts = [];
        (raw.waiting as Record<string, unknown>).recovery = {
          kind: "retry-git-finalization",
          attempt: { stageIndex: 0, attempt: 1 },
          pausedAtHead: "0".repeat(40),
        };
      },
    },
    {
      name: "a finalized-DONE recovery that references an older attempt before a newer failure",
      mutate: (raw) => {
        const stages = raw.stages as Array<{ queueResolution: string }>;
        const attempts = raw.attempts as Array<Record<string, unknown>>;
        const earlier = attempts[0]!;
        earlier.result = "done";
        earlier.terminalResult = {
          token: "DONE",
          candidateLine: "Outcome: DONE — earlier attempt",
          detail: "earlier attempt",
        };
        delete earlier.failure;
        attempts.push({
          ...earlier,
          attempt: 2,
          result: "waiting",
          terminalResult: {
            token: "BLOCKED",
            candidateLine: "Outcome: BLOCKED — newer attempt",
            detail: "newer attempt",
          },
          failure: { kind: "outcome-blocked", message: "newer attempt blocked" },
          logPath: "logs/01-spec-attempt-02.log",
        });
        (raw.waiting as Record<string, unknown>).recovery = {
          kind: "resume-finalized-done",
          attempt: { stageIndex: 0, attempt: 1 },
          queueResolution: stages[0]!.queueResolution,
        };
      },
    },
    {
      name: "a recovery carrying an extra control field",
      mutate: (raw) => {
        const waiting = raw.waiting as Record<string, unknown>;
        const recovery = waiting.recovery as Record<string, unknown>;
        recovery.legacyCursor = "old";
      },
    },
  ];

  for (const document of unrecoverable) {
    it(`refuses ${document.name} before acquiring the lock or writing state`, async () => {
      const h = await setup();
      await seed(h, [{ outcome: BLOCKED }]);
      const runId = await soleRunId(h);
      const written = await writeRawCheckpoint(h, runId, document.mutate);

      // Holding the workspace lock is what makes the ordering visible: a resume
      // that reached lock acquisition would refuse for that reason instead.
      const held = await acquireWorkspaceLock(
        h.stateRoot,
        h.fixture.root,
        "holder-run",
        new Date(),
      );
      if (!held.ok) throw new Error("expected to acquire the lock");

      let probeCalled = false;
      const result = await resume(h, runId, standardSteps(h.fixture), {
        probe: async (...args) => {
          probeCalled = true;
          return okProbe(...args);
        },
      });

      expect(result.code).toBe(1);
      expect(result.err).toContain("malformed or unreadable");
      expect(result.err).not.toContain("already locked");
      expect(probeCalled).toBe(false);
      expect(result.invoker.calls.length).toBe(0);
      // Nothing was persisted, so the stage cannot have advanced and the
      // referenced attempt cannot have been rewritten as done.
      expect(await fs.readFile(written.file, "utf8")).toBe(written.text);
    });
  }
});

describe.concurrent("resumeCommand — ready and executing recovery (AC-15.3, AC-15.4)", () => {
  /** Seed a durable ready checkpoint (post-allocation, pre-launch signal). */
  async function seedReady(h: Harness): Promise<string> {
    let calls = 0;
    // First signaled() (pre-allocation) is null; the second (pre-launch) fires
    // so the allocated ready checkpoint survives with no attempts.
    await seed(h, standardSteps(h.fixture), {
      installSignals: fakeSignals(() => (++calls > 1 ? "SIGINT" : null)),
    });
    return soleRunId(h);
  }

  it("persists a tokenless pre-attempt pending-queues pause for a ready run with queued files, then re-attempts", async () => {
    const h = await setup();
    const runId = await seedReady(h);
    expect((await readCp(h, runId)).condition).toBe("ready");

    // First resume: a ready cursor with a queued file persists a no-attempt pause.
    dropPendingSync(h.fixture, "q.md");
    const first = await resume(h, runId, standardSteps(h.fixture));
    expect(first.code).toBe(2);
    const paused = await readCp(h, runId);
    expect(paused.condition).toBe("waiting-for-user");
    expect(paused.waiting?.reasons[0].kind).toBe("pending-queues");
    expect(paused.attempts.length).toBe(0);

    // Second resume: queues empty, the pre-gate pause re-attempts the stage.
    await removePending(h.fixture, "q.md");
    const second = await resume(h, runId, standardSteps(h.fixture));
    expect(second.code).toBe(0);
    expect(attemptCountAt(await readCp(h, runId), 0)).toBe(1);
  });

  it("runs the stored next stage for a ready run", async () => {
    const h = await setup();
    const runId = await seedReady(h);
    const result = await resume(h, runId, standardSteps(h.fixture));
    expect(result.code).toBe(0);
    expect((await readCp(h, runId)).condition).toBe("completed");
  });

  it("refuses an executing run while a stale lock is present, then recovers after removal", async () => {
    const h = await setup();
    await seed(h, [{ outcome: BLOCKED }]);
    const runId = await soleRunId(h);
    // Rewrite the checkpoint to a raw abandoned executing state.
    const runDir = runDirectoryFor(h.stateRoot, runId);
    const base = await readCp(h, runId);
    const executingAttempt = {
      ...base.attempts[0]!,
      result: "executing" as const,
      terminalResult: null,
    };
    delete (executingAttempt as { endedAt?: string }).endedAt;
    delete (executingAttempt as { failure?: unknown }).failure;
    // A live attempt has not reached its post-attempt observation yet.
    delete (executingAttempt as { headAfterAttempt?: string }).headAfterAttempt;
    const executingCp: RunCheckpoint = {
      ...base,
      condition: "executing",
      waiting: null,
      attempts: [executingAttempt],
    };
    await writeCheckpoint(runDir, executingCp);

    // A present lock refuses the resume.
    const held = await acquireWorkspaceLock(
      h.stateRoot,
      h.fixture.root,
      "holder-run",
      new Date(),
    );
    if (!held.ok) throw new Error("expected to acquire the lock");
    const refused = await resume(h, runId, standardSteps(h.fixture));
    expect(refused.code).toBe(1);
    expect(refused.err).toContain("already locked");
    expect((await readCp(h, runId)).condition).toBe("executing");

    // Manual stale-lock removal, then recovery marks the attempt interrupted and
    // runs a fresh attempt.
    await held.handle.release();
    const recovered = await resume(h, runId, standardSteps(h.fixture));
    expect(recovered.code).toBe(0);
    const cp = await readCp(h, runId);
    expect(cp.attempts[0]?.result).toBe("interrupted");
    expect(attemptCountAt(cp, 0)).toBe(2);
    expect(await lockNames(h.stateRoot)).toEqual([]);
  });
});

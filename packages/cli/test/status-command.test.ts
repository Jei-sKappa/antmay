import {
  asAttachmentHandle,
  asRepositoryPath,
  asRunId,
  asThreadPath,
  type RepositoryPath,
  type RunRecord,
  type ThreadPendingCounts,
} from "@antmay/core";
import { describe, expect, it } from "vitest";
import {
  runStatus,
  type StatusDeps,
  type StatusOptions,
} from "../src/commands/status";
import type { EnsureObserverResult } from "../src/observer/ensure-observer";
import type { ReconcileRunResult } from "../src/observer/reconcile-run";
import type { ProcessRunner } from "../src/process/process-runner";

const REPO_A = asRepositoryPath("/canonical/repo-a");
const REPO_B = asRepositoryPath("/canonical/repo-b");

function run(id: string, overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: asRunId(id),
    repositoryPath: REPO_A,
    threadPath: asThreadPath("/canonical/repo-a/docs/threads/260718155545Z-x"),
    skill: "implement",
    harness: "claude",
    adapter: "herdr",
    session: { kind: "pinned", id: "session-uuid" },
    attachment: { available: true, handle: asAttachmentHandle("w1:p1") },
    classification: "active",
    reason: null,
    workerHealth: { state: "healthy", detail: null },
    ...overrides,
  };
}

const dummyRunner: ProcessRunner = {
  run: () => ({ code: 0, stdout: "", stderr: "" }),
  locate: (program) => `/bin/${program}`,
};

type Recorder = {
  out: string[];
  err: string[];
  reconciled: string[];
  ensured: string[];
  scannedRepos: RepositoryPath[][];
};

function makeDeps(
  overrides: {
    runsForRepository?: readonly RunRecord[];
    runsAll?: readonly RunRecord[];
    reconcile?: (record: RunRecord) => ReconcileRunResult;
    ensure?: (record: RunRecord) => EnsureObserverResult;
    attention?: readonly ThreadPendingCounts[];
    repositoryPath?: RepositoryPath;
  } = {},
): { deps: StatusDeps; rec: Recorder } {
  const rec: Recorder = {
    out: [],
    err: [],
    reconciled: [],
    ensured: [],
    scannedRepos: [],
  };
  const deps: StatusDeps = {
    cwd: "/canonical/repo-a/nested",
    runner: dummyRunner,
    listForRepository: () => overrides.runsForRepository ?? [],
    listAll: () => overrides.runsAll ?? [],
    reconcile: (record) => {
      rec.reconciled.push(record.id);
      return (
        overrides.reconcile?.(record) ?? {
          record,
          terminalized: false,
          health: record.workerHealth,
          diagnostic: null,
        }
      );
    },
    ensureObserver: (record) => {
      rec.ensured.push(record.id);
      return (
        overrides.ensure?.(record) ?? {
          action: "healthy",
          reason: "A healthy observer is already watching the run.",
        }
      );
    },
    scanAttention: (repos) => {
      rec.scannedRepos.push([...repos]);
      return overrides.attention ?? [];
    },
    resolveRepository: () => overrides.repositoryPath ?? REPO_A,
    writeOut: (message) => rec.out.push(message),
    writeErr: (message) => rec.err.push(message),
  };
  return { deps, rec };
}

const HUMAN: StatusOptions = {};

describe("runStatus — scope", () => {
  it("reports only the canonical cwd worktree's runs without --all", () => {
    const { deps, rec } = makeDeps({
      runsForRepository: [run("run-0001")],
      runsAll: [run("run-should-not-appear", { id: asRunId("run-other") })],
    });

    runStatus(HUMAN, deps);

    const stdout = rec.out.join("");
    expect(stdout).toContain("Runs for /canonical/repo-a");
    expect(stdout).toContain("run-0001");
    expect(stdout).not.toContain("run-other");
    expect(rec.scannedRepos).toEqual([[REPO_A]]);
  });

  it("enumerates every known repository with --all", () => {
    const { deps, rec } = makeDeps({
      runsAll: [run("run-a"), run("run-b", { repositoryPath: REPO_B })],
    });

    runStatus({ all: true }, deps);

    const stdout = rec.out.join("");
    expect(stdout).toContain("Runs across all repositories");
    expect(stdout).toContain("run-a");
    expect(stdout).toContain("run-b");
    // Attention is scanned for the unique repositories the runs span.
    expect(rec.scannedRepos).toEqual([[REPO_A, REPO_B]]);
  });
});

describe("runStatus — reconciliation before output", () => {
  it("reconciles every scoped run before rendering the document", () => {
    const { deps, rec } = makeDeps({
      runsForRepository: [run("run-0001"), run("run-0002")],
    });

    runStatus(HUMAN, deps);

    expect(rec.reconciled).toEqual(["run-0001", "run-0002"]);
  });

  it("renders the reconciled classification, not the pre-reconcile one", () => {
    const { deps, rec } = makeDeps({
      runsForRepository: [run("run-0001")],
      reconcile: (record) => ({
        record: {
          ...record,
          classification: "done",
          reason: "Outcome: DONE — shipped it",
        },
        terminalized: true,
        health: { state: "healthy", detail: null },
        diagnostic: null,
      }),
    });

    runStatus(HUMAN, deps);

    const stdout = rec.out.join("");
    expect(stdout).toContain("run-0001 [done]");
    expect(stdout).toContain("Outcome: DONE — shipped it");
  });
});

describe("runStatus — observer restoration", () => {
  it("restores stale active observation and reports it on stderr only", () => {
    const { deps, rec } = makeDeps({
      runsForRepository: [run("run-0001")],
      ensure: () => ({
        action: "restored",
        reason: "The observer heartbeat is stale; restoring observation.",
        pid: 42,
      }),
    });

    runStatus(HUMAN, deps);

    expect(rec.ensured).toEqual(["run-0001"]);
    expect(rec.err.join("")).toContain("restoring observation");
    expect(rec.out.join("")).not.toContain("restoring observation");
  });

  it("never restores observation for an already-terminal run", () => {
    const { deps, rec } = makeDeps({
      runsForRepository: [
        run("run-term", { classification: "done", reason: "done" }),
      ],
      reconcile: (record) => ({
        record,
        terminalized: false,
        health: record.workerHealth,
        diagnostic: null,
      }),
    });

    runStatus(HUMAN, deps);

    expect(rec.reconciled).toEqual(["run-term"]);
    expect(rec.ensured).toEqual([]);
  });
});

describe("runStatus — attention", () => {
  it("counts active-thread pending bundles and excludes empty workspaces", () => {
    const { deps, rec } = makeDeps({
      runsForRepository: [],
      attention: [
        {
          repositoryPath: REPO_A,
          threadPath: "/canonical/repo-a/docs/threads/260718155545Z-a",
          pendingDecisions: 2,
          pendingReviews: 0,
        },
        {
          repositoryPath: REPO_A,
          threadPath: "/canonical/repo-a/docs/threads/260718155545Z-empty",
          pendingDecisions: 0,
          pendingReviews: 0,
        },
      ],
    });

    runStatus(HUMAN, deps);

    const stdout = rec.out.join("");
    expect(stdout).toContain("260718155545Z-a");
    expect(stdout).toContain("pending decisions: 2");
    expect(stdout).not.toContain("260718155545Z-empty");
  });
});

describe("runStatus — human fields", () => {
  it("includes every §4.3 field and an attach hint for a retained pane", () => {
    const { deps, rec } = makeDeps({
      runsForRepository: [
        run("run-0001", {
          skill: "propose",
          harness: "codex",
          reason: "Outcome: BLOCKED — needs a decision",
          classification: "blocked",
        }),
      ],
      attention: [
        {
          repositoryPath: REPO_A,
          threadPath: "/canonical/repo-a/docs/threads/260718155545Z-a",
          pendingDecisions: 1,
          pendingReviews: 3,
        },
      ],
    });

    runStatus(HUMAN, deps);

    const stdout = rec.out.join("");
    expect(stdout).toContain("run-0001 [blocked]");
    expect(stdout).toContain("/canonical/repo-a");
    expect(stdout).toContain("docs/threads/260718155545Z-x");
    expect(stdout).toContain("propose (codex, herdr)");
    expect(stdout).toContain("Outcome: BLOCKED — needs a decision");
    expect(stdout).toContain("antmay attach run-0001 (pane w1:p1)");
    expect(stdout).toContain("pending decisions: 1");
    expect(stdout).toContain("pending reviews:   3");
  });

  it("marks attach unavailable when no retained pane exists", () => {
    const { deps, rec } = makeDeps({
      runsForRepository: [
        run("run-0001", {
          attachment: { available: false, handle: null },
        }),
      ],
    });

    runStatus(HUMAN, deps);

    const stdout = rec.out.join("");
    expect(stdout).toContain("attach:     unavailable");
    expect(stdout).not.toContain("antmay attach run-0001");
  });
});

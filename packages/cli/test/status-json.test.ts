import {
  asAttachmentHandle,
  asRepositoryPath,
  asRunId,
  asThreadPath,
  type RepositoryPath,
  type RunRecord,
  type StatusDocumentV1,
  type ThreadPendingCounts,
} from "@antmay/core";
import { describe, expect, it } from "vitest";
import { runStatus, type StatusDeps } from "../src/commands/status";
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

function makeDeps(overrides: {
  runsForRepository?: readonly RunRecord[];
  runsAll?: readonly RunRecord[];
  attention?: readonly ThreadPendingCounts[];
  reconcile?: (record: RunRecord) => ReconcileRunResult;
  ensure?: (record: RunRecord) => EnsureObserverResult;
  repositoryPath?: RepositoryPath;
}): { deps: StatusDeps; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const deps: StatusDeps = {
    cwd: "/canonical/repo-a",
    runner: dummyRunner,
    listForRepository: () => overrides.runsForRepository ?? [],
    listAll: () => overrides.runsAll ?? [],
    reconcile: (record) =>
      overrides.reconcile?.(record) ?? {
        record,
        terminalized: false,
        health: record.workerHealth,
        diagnostic: null,
      },
    ensureObserver: (record) =>
      overrides.ensure?.(record) ?? {
        action: "healthy",
        reason: "healthy",
      },
    scanAttention: () => overrides.attention ?? [],
    resolveRepository: () => overrides.repositoryPath ?? REPO_A,
    writeOut: (message) => out.push(message),
    writeErr: (message) => err.push(message),
  };
  return { deps, out, err };
}

function parseDocument(out: string[]): StatusDocumentV1 {
  const stdout = out.join("");
  return JSON.parse(stdout) as StatusDocumentV1;
}

describe("status --json — strict document shape", () => {
  it("emits exactly one schema-version-1 document with no extra fields", () => {
    const { deps, out } = makeDeps({
      runsForRepository: [run("run-0001", { reason: "note" })],
      attention: [
        {
          repositoryPath: REPO_A,
          threadPath: "/canonical/repo-a/docs/threads/260718155545Z-a",
          pendingDecisions: 1,
          pendingReviews: 2,
        },
      ],
    });

    runStatus({ json: true }, deps);

    // Exactly one parseable JSON document on stdout.
    expect(out.join("")).toMatch(/^\{[\s\S]*\}\n$/);
    const document = parseDocument(out);
    expect(document.schemaVersion).toBe(1);
    expect(Object.keys(document).sort()).toEqual([
      "attention",
      "runs",
      "schemaVersion",
      "scope",
    ]);
    expect(Object.keys(document.scope).sort()).toEqual([
      "mode",
      "repositoryPath",
    ]);
    expect(Object.keys(document.runs[0] ?? {}).sort()).toEqual([
      "adapter",
      "attach",
      "classification",
      "harness",
      "id",
      "reason",
      "repositoryPath",
      "session",
      "skill",
      "threadPath",
    ]);
    expect(Object.keys(document.runs[0]?.session ?? {}).sort()).toEqual([
      "id",
      "kind",
    ]);
    expect(Object.keys(document.runs[0]?.attach ?? {}).sort()).toEqual([
      "available",
      "handle",
    ]);
    expect(Object.keys(document.attention[0] ?? {}).sort()).toEqual([
      "pendingDecisions",
      "pendingReviews",
      "repositoryPath",
      "threadPath",
    ]);
  });

  it("uses repositoryPath null only for all scope", () => {
    const repoScope = makeDeps({ runsForRepository: [run("run-0001")] });
    runStatus({ json: true }, repoScope.deps);
    const repoDoc = parseDocument(repoScope.out);
    expect(repoDoc.scope).toEqual({
      mode: "repository",
      repositoryPath: REPO_A,
    });

    const allScoped = makeDeps({ runsAll: [run("run-0001")] });
    runStatus({ all: true, json: true }, allScoped.deps);
    const allDoc = parseDocument(allScoped.out);
    expect(allDoc.scope).toEqual({ mode: "all", repositoryPath: null });
  });
});

describe("status --json — stdout/stderr separation", () => {
  it("keeps diagnostics off stdout and prints only the JSON document there", () => {
    const { deps, out, err } = makeDeps({
      runsForRepository: [run("run-0001")],
      reconcile: (record) => ({
        record,
        terminalized: false,
        health: { state: "degraded", detail: "transcript unreadable" },
        diagnostic: "transcript unreadable",
      }),
      ensure: () => ({
        action: "restored",
        reason: "restoring observation",
        pid: 7,
      }),
    });

    runStatus({ json: true }, deps);

    // stdout parses cleanly as one JSON document — no prose leaked in.
    expect(() => parseDocument(out)).not.toThrow();
    expect(err.join("")).toContain("transcript unreadable");
    expect(err.join("")).toContain("restoring observation");
  });
});

describe("status — human/JSON parity", () => {
  it("agrees on run ids, classifications, reasons, attach, and attention", () => {
    const fixtureRuns = [
      run("run-0001", {
        classification: "done",
        reason: "Outcome: DONE — shipped it",
      }),
      run("run-0002", {
        repositoryPath: REPO_B,
        classification: "active",
        attachment: { available: false, handle: null },
      }),
    ];
    const attention: ThreadPendingCounts[] = [
      {
        repositoryPath: REPO_A,
        threadPath: "/canonical/repo-a/docs/threads/260718155545Z-a",
        pendingDecisions: 4,
        pendingReviews: 0,
      },
    ];

    const jsonDeps = makeDeps({ runsAll: fixtureRuns, attention });
    runStatus({ all: true, json: true }, jsonDeps.deps);
    const document = parseDocument(jsonDeps.out);

    const humanDeps = makeDeps({ runsAll: fixtureRuns, attention });
    runStatus({ all: true }, humanDeps.deps);
    const human = humanDeps.out.join("");

    for (const projected of document.runs) {
      expect(human).toContain(projected.id);
      expect(human).toContain(`[${projected.classification}]`);
      if (projected.reason !== null) {
        expect(human).toContain(projected.reason);
      }
      if (projected.attach.available && projected.attach.handle !== null) {
        expect(human).toContain(`antmay attach ${projected.id}`);
      }
    }
    for (const entry of document.attention) {
      expect(human).toContain(entry.threadPath);
      expect(human).toContain(`pending decisions: ${entry.pendingDecisions}`);
    }
    // Both projections reduce to the same run set.
    expect(document.runs.map((projected) => projected.id).sort()).toEqual([
      "run-0001",
      "run-0002",
    ]);
  });
});

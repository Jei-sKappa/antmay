import {
  allScope,
  asAttachmentHandle,
  asRepositoryPath,
  asRunId,
  asThreadPath,
  projectStatusDocument,
  type RunRecord,
  repositoryScope,
  type StatusDocumentV1,
} from "@antmay/core";
import { describe, expect, it } from "vitest";

function record(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: asRunId("run-b"),
    repositoryPath: asRepositoryPath("/repo"),
    threadPath: asThreadPath("/repo/docs/threads/260718155545Z-x"),
    skill: "implement",
    harness: "claude",
    adapter: "herdr",
    session: { kind: "pinned", id: "s-1" },
    attachment: { available: true, handle: asAttachmentHandle("pane:1") },
    classification: "done",
    reason: "shipped",
    workerHealth: { state: "healthy", detail: null },
    ...overrides,
  };
}

describe("status scope builders", () => {
  it("builds repository and all scopes with the fixed shape", () => {
    expect(repositoryScope("/repo")).toEqual({
      mode: "repository",
      repositoryPath: "/repo",
    });
    expect(allScope()).toEqual({ mode: "all", repositoryPath: null });
  });
});

describe("status document projection", () => {
  it("projects a run record into exactly the schema fields", () => {
    const doc = projectStatusDocument({
      scope: repositoryScope("/repo"),
      runs: [record()],
      attention: [],
    });

    const expected: StatusDocumentV1 = {
      schemaVersion: 1,
      scope: { mode: "repository", repositoryPath: "/repo" },
      runs: [
        {
          id: "run-b",
          repositoryPath: "/repo",
          threadPath: "/repo/docs/threads/260718155545Z-x",
          skill: "implement",
          harness: "claude",
          adapter: "herdr",
          classification: "done",
          reason: "shipped",
          session: { kind: "pinned", id: "s-1" },
          attach: { available: true, handle: "pane:1" },
        },
      ],
      attention: [],
    };
    expect(doc).toEqual(expected);

    const runKeys = Object.keys(doc.runs[0] ?? {}).sort();
    expect(runKeys).toEqual(
      [
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
      ].sort(),
    );
    expect(Object.keys(doc).sort()).toEqual(
      ["attention", "runs", "scope", "schemaVersion"].sort(),
    );
  });

  it("orders runs by id and attention deterministically regardless of input order", () => {
    const runsForward = projectStatusDocument({
      scope: allScope(),
      runs: [
        record({ id: asRunId("run-c") }),
        record({ id: asRunId("run-a") }),
        record({ id: asRunId("run-b") }),
      ],
      attention: [
        {
          repositoryPath: "/b",
          threadPath: "/b/t2",
          pendingDecisions: 1,
          pendingReviews: 0,
        },
        {
          repositoryPath: "/a",
          threadPath: "/a/t1",
          pendingDecisions: 0,
          pendingReviews: 2,
        },
        {
          repositoryPath: "/a",
          threadPath: "/a/t0",
          pendingDecisions: 3,
          pendingReviews: 3,
        },
      ],
    });
    const runsReversed = projectStatusDocument({
      scope: allScope(),
      runs: [
        record({ id: asRunId("run-b") }),
        record({ id: asRunId("run-c") }),
        record({ id: asRunId("run-a") }),
      ],
      attention: [
        {
          repositoryPath: "/a",
          threadPath: "/a/t0",
          pendingDecisions: 3,
          pendingReviews: 3,
        },
        {
          repositoryPath: "/a",
          threadPath: "/a/t1",
          pendingDecisions: 0,
          pendingReviews: 2,
        },
        {
          repositoryPath: "/b",
          threadPath: "/b/t2",
          pendingDecisions: 1,
          pendingReviews: 0,
        },
      ],
    });

    expect(runsForward).toEqual(runsReversed);
    expect(runsForward.runs.map((run) => run.id)).toEqual([
      "run-a",
      "run-b",
      "run-c",
    ]);
    expect(
      runsForward.attention.map((a) => [a.repositoryPath, a.threadPath]),
    ).toEqual([
      ["/a", "/a/t0"],
      ["/a", "/a/t1"],
      ["/b", "/b/t2"],
    ]);
  });

  it("preserves null reason, null session id, and unavailable attach", () => {
    const doc = projectStatusDocument({
      scope: repositoryScope("/repo"),
      runs: [
        record({
          classification: "active",
          reason: null,
          session: { kind: "heuristic", id: null },
          attachment: { available: false, handle: null },
        }),
      ],
      attention: [],
    });
    const run = doc.runs[0];
    expect(run?.reason).toBeNull();
    expect(run?.session).toEqual({ kind: "heuristic", id: null });
    expect(run?.attach).toEqual({ available: false, handle: null });
  });
});

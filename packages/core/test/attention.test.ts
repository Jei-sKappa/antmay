import { describe, expect, it } from "vitest";
import {
  collectAttention,
  needsAttention,
  type ThreadPendingCounts,
} from "../src/attention";

function counts(
  overrides: Partial<ThreadPendingCounts> = {},
): ThreadPendingCounts {
  return {
    repositoryPath: "/repo",
    threadPath: "/repo/docs/threads/260718155545Z-x",
    pendingDecisions: 0,
    pendingReviews: 0,
    ...overrides,
  };
}

describe("needsAttention", () => {
  it("is false for an empty workspace", () => {
    expect(needsAttention({ pendingDecisions: 0, pendingReviews: 0 })).toBe(
      false,
    );
  });

  it("is true when either bundle set is non-empty", () => {
    expect(needsAttention({ pendingDecisions: 1, pendingReviews: 0 })).toBe(
      true,
    );
    expect(needsAttention({ pendingDecisions: 0, pendingReviews: 2 })).toBe(
      true,
    );
    expect(needsAttention({ pendingDecisions: 3, pendingReviews: 4 })).toBe(
      true,
    );
  });
});

describe("collectAttention", () => {
  it("excludes empty workspaces and keeps non-empty ones with their counts", () => {
    const result = collectAttention([
      counts({ threadPath: "/repo/docs/threads/a", pendingDecisions: 2 }),
      counts({ threadPath: "/repo/docs/threads/b" }),
      counts({ threadPath: "/repo/docs/threads/c", pendingReviews: 1 }),
    ]);

    expect(result.map((entry) => entry.threadPath)).toEqual([
      "/repo/docs/threads/a",
      "/repo/docs/threads/c",
    ]);
    expect(result[0]).toMatchObject({ pendingDecisions: 2, pendingReviews: 0 });
    expect(result[1]).toMatchObject({ pendingDecisions: 0, pendingReviews: 1 });
  });

  it("preserves both counts for a thread carrying both bundle kinds", () => {
    const result = collectAttention([
      counts({ pendingDecisions: 3, pendingReviews: 5 }),
    ]);
    expect(result).toEqual([
      {
        repositoryPath: "/repo",
        threadPath: "/repo/docs/threads/260718155545Z-x",
        pendingDecisions: 3,
        pendingReviews: 5,
      },
    ]);
  });

  it("returns nothing when every workspace is empty", () => {
    expect(collectAttention([counts(), counts()])).toEqual([]);
  });
});

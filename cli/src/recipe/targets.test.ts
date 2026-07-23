import { describe, expect, it } from "vitest";

import { resolveSelector, resolveStageTarget } from "./targets.js";
import type { PathSelector, StageTarget } from "./types.js";

const THREAD = "docs/threads/260723121015Z-afk-workflow-executor";

describe("resolveStageTarget", () => {
  it("resolves the thread root to a repo-relative path with a trailing slash", () => {
    const result = resolveStageTarget({ kind: "thread-root" }, THREAD);
    expect(result).toEqual({ ok: true, path: `${THREAD}/` });
  });

  it("normalizes a redundant trailing slash on the thread root", () => {
    const result = resolveStageTarget({ kind: "thread-root" }, `${THREAD}/`);
    expect(result).toEqual({ ok: true, path: `${THREAD}/` });
  });

  it("joins a thread-file path repo-relative", () => {
    const result = resolveStageTarget(
      { kind: "thread-file", path: "spec.md" },
      THREAD,
    );
    expect(result).toEqual({ ok: true, path: `${THREAD}/spec.md` });
  });

  it("joins a nested thread-file path", () => {
    const result = resolveStageTarget(
      { kind: "thread-file", path: "plan-tasks/03.md" },
      THREAD,
    );
    expect(result).toEqual({ ok: true, path: `${THREAD}/plan-tasks/03.md` });
  });

  it("rejects an empty thread-file path", () => {
    const result = resolveStageTarget({ kind: "thread-file", path: "" }, THREAD);
    expect(result.ok).toBe(false);
  });

  it("rejects an absolute thread-file path", () => {
    const result = resolveStageTarget(
      { kind: "thread-file", path: "/etc/passwd" },
      THREAD,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a thread-file path escaping via ..", () => {
    const result = resolveStageTarget(
      { kind: "thread-file", path: "../other/spec.md" },
      THREAD,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("..");
  });

  it("rejects a mid-path .. traversal that escapes", () => {
    const result = resolveStageTarget(
      { kind: "thread-file", path: "plan-tasks/../../escape.md" },
      THREAD,
    );
    expect(result.ok).toBe(false);
  });

  it("stays recipe-agnostic for a synthetic descriptor", () => {
    const synthetic: StageTarget = { kind: "thread-file", path: "notes/todo.md" };
    const result = resolveStageTarget(synthetic, "docs/threads/999999Z-synthetic");
    expect(result).toEqual({
      ok: true,
      path: "docs/threads/999999Z-synthetic/notes/todo.md",
    });
  });
});

describe("resolveSelector", () => {
  it("resolves an exact-file selector repo-relative", () => {
    const selector: PathSelector = {
      kind: "exact-file",
      threadRelativePath: "spec.md",
    };
    const result = resolveSelector(selector, THREAD);
    expect(result).toEqual({
      ok: true,
      selector: { kind: "exact-file", path: `${THREAD}/spec.md` },
    });
  });

  it("resolves a subtree selector to its prefix", () => {
    const selector: PathSelector = {
      kind: "subtree",
      threadRelativePath: "plan-tasks",
    };
    const result = resolveSelector(selector, THREAD);
    expect(result).toEqual({
      ok: true,
      selector: { kind: "subtree", path: `${THREAD}/plan-tasks` },
    });
  });

  it("rejects a selector escaping the thread", () => {
    const selector: PathSelector = {
      kind: "exact-file",
      threadRelativePath: "../escape.md",
    };
    const result = resolveSelector(selector, THREAD);
    expect(result.ok).toBe(false);
  });
});

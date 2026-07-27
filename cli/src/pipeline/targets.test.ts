import { describe, expect, it } from "vitest";

import { STAGE_CATALOG } from "./catalog.js";
import {
  resolveSelector,
  resolveStageTarget,
  resolveStageTargetRule,
} from "./targets.js";
import type { ArtifactState, PathSelector, StageTarget } from "./types.js";

const THREAD = "docs/threads/260723121015Z-afk-workflow-executor";

const STATE_WITHOUT_SPEC: ArtifactState = {
  validThread: true,
  proposal: false,
  spec: false,
  plan: "absent",
  implementationReport: false,
};
const STATE_WITH_SPEC: ArtifactState = { ...STATE_WITHOUT_SPEC, spec: true };

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

  it("stays pipeline-agnostic for a synthetic descriptor", () => {
    const synthetic: StageTarget = { kind: "thread-file", path: "notes/todo.md" };
    const result = resolveStageTarget(synthetic, "docs/threads/999999Z-synthetic");
    expect(result).toEqual({
      ok: true,
      path: "docs/threads/999999Z-synthetic/notes/todo.md",
    });
  });
});

describe("resolveStageTargetRule", () => {
  it("resolves a fixed rule regardless of artifact state", () => {
    const rule = STAGE_CATALOG["plan-strict"].targetRule;
    expect(resolveStageTargetRule(rule, THREAD, STATE_WITH_SPEC)).toEqual({
      ok: true,
      path: `${THREAD}/spec.md`,
    });
    expect(resolveStageTargetRule(rule, THREAD, STATE_WITHOUT_SPEC)).toEqual({
      ok: true,
      path: `${THREAD}/spec.md`,
    });
  });

  it("targets plan-brief at spec.md when the state has a spec", () => {
    const rule = STAGE_CATALOG["plan-brief"].targetRule;
    expect(resolveStageTargetRule(rule, THREAD, STATE_WITH_SPEC)).toEqual({
      ok: true,
      path: `${THREAD}/spec.md`,
    });
  });

  it("targets plan-brief at the thread root when the state has no spec", () => {
    const rule = STAGE_CATALOG["plan-brief"].targetRule;
    expect(resolveStageTargetRule(rule, THREAD, STATE_WITHOUT_SPEC)).toEqual({
      ok: true,
      path: `${THREAD}/`,
    });
  });

  it("resolves every catalog stage to a path inside the thread", () => {
    for (const stage of Object.values(STAGE_CATALOG)) {
      for (const state of [STATE_WITH_SPEC, STATE_WITHOUT_SPEC]) {
        const result = resolveStageTargetRule(stage.targetRule, THREAD, state);
        expect(result.ok).toBe(true);
        if (!result.ok) continue;
        expect(result.path.startsWith(`${THREAD}/`)).toBe(true);
      }
    }
  });

  it("keeps the traversal check on a state-sensitive branch", () => {
    const result = resolveStageTargetRule(
      {
        kind: "when-spec-present",
        whenPresent: { kind: "thread-file", path: "../escape.md" },
        otherwise: { kind: "thread-root" },
      },
      THREAD,
      STATE_WITH_SPEC,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("..");
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

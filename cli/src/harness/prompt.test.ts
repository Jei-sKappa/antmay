import { describe, expect, it } from "vitest";

import { renderStagePrompt } from "./prompt.js";

const TARGET = "docs/threads/260723121015Z-afk-workflow-executor/spec.md";

describe("renderStagePrompt (AC-4.3, AC-6.2)", () => {
  it("renders the codex trigger byte-exact without a profile prompt", () => {
    expect(renderStagePrompt("codex", "spec", TARGET, "")).toBe(
      "$spec `docs/threads/260723121015Z-afk-workflow-executor/spec.md`.",
    );
  });

  it("renders the claude-code trigger byte-exact without a profile prompt", () => {
    expect(renderStagePrompt("claude-code", "spec", TARGET, "")).toBe(
      "/spec `docs/threads/260723121015Z-afk-workflow-executor/spec.md`.",
    );
  });

  it("appends the profile prompt after a single space for codex", () => {
    expect(renderStagePrompt("codex", "plan-strict", TARGET, "be terse")).toBe(
      "$plan-strict `docs/threads/260723121015Z-afk-workflow-executor/spec.md`. be terse",
    );
  });

  it("appends the profile prompt after a single space for claude-code", () => {
    expect(
      renderStagePrompt("claude-code", "plan-strict", TARGET, "be terse"),
    ).toBe(
      "/plan-strict `docs/threads/260723121015Z-afk-workflow-executor/spec.md`. be terse",
    );
  });

  it("adds nothing beyond the trigger when the profile prompt is empty", () => {
    const rendered = renderStagePrompt("codex", "review-spec", TARGET, "");
    expect(rendered.startsWith("$review-spec `")).toBe(true);
    expect(rendered.endsWith("`.")).toBe(true);
  });
});

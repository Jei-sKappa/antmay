import { describe, expect, it } from "vitest";

import { CLAUDE_CODE } from "./claude-code.js";

describe("the Claude Code harness", () => {
  it("is reached through the claude executable", () => {
    expect(CLAUDE_CODE.id).toBe("claude-code");
    expect(CLAUDE_CODE.executable).toBe("claude");
  });

  it("triggers a skill with a leading /", () => {
    expect(CLAUDE_CODE.skillTrigger("spec")).toBe("/spec");
    expect(CLAUDE_CODE.skillTrigger("plan-strict")).toBe("/plan-strict");
  });

  it("spells the continuation command", () => {
    expect(CLAUDE_CODE.continuationCommand("S")).toBe("claude --resume 'S'");
  });

  it("quotes whitespace and shell metacharacters as one argument", () => {
    const id = `a b;$(rm -rf /)|x&y"z`;
    expect(CLAUDE_CODE.continuationCommand(id)).toBe(`claude --resume '${id}'`);
  });

  it("encodes an embedded single quote as one POSIX-safe argument", () => {
    expect(CLAUDE_CODE.continuationCommand("foo'bar")).toBe(
      "claude --resume 'foo'\\''bar'",
    );
  });
});

import { describe, expect, it } from "vitest";

import { nativeContinuationCommand } from "./native-session.js";

describe("nativeContinuationCommand", () => {
  it("spells the Codex continuation command", () => {
    expect(nativeContinuationCommand("codex", "S")).toBe("codex resume 'S'");
  });

  it("spells the Claude Code continuation command", () => {
    expect(nativeContinuationCommand("claude-code", "S")).toBe(
      "claude --resume 'S'",
    );
  });

  it("quotes an ordinary ID as one POSIX-safe argument", () => {
    expect(nativeContinuationCommand("codex", "sess-abc-123")).toBe(
      "codex resume 'sess-abc-123'",
    );
  });

  it("quotes whitespace and shell metacharacters as one argument", () => {
    const id = `a b;$(rm -rf /)|x&y"z`;
    expect(nativeContinuationCommand("claude-code", id)).toBe(
      `claude --resume '${id}'`,
    );
  });

  it("encodes an embedded single quote as one POSIX-safe argument", () => {
    expect(nativeContinuationCommand("codex", "foo'bar")).toBe(
      "codex resume 'foo'\\''bar'",
    );
  });
});

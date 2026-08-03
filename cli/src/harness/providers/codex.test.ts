import { describe, expect, it } from "vitest";

import { CODEX } from "./codex.js";

describe("the Codex harness", () => {
  it("is reached through the codex executable", () => {
    expect(CODEX.id).toBe("codex");
    expect(CODEX.executable).toBe("codex");
  });

  it("triggers a skill with a leading $", () => {
    expect(CODEX.skillTrigger("spec")).toBe("$spec");
    expect(CODEX.skillTrigger("plan-strict")).toBe("$plan-strict");
  });

  it("spells the continuation command", () => {
    expect(CODEX.continuationCommand("S")).toBe("codex resume 'S'");
  });

  it("quotes an ordinary ID as one POSIX-safe argument", () => {
    expect(CODEX.continuationCommand("sess-abc-123")).toBe(
      "codex resume 'sess-abc-123'",
    );
  });

  it("encodes an embedded single quote as one POSIX-safe argument", () => {
    expect(CODEX.continuationCommand("foo'bar")).toBe(
      "codex resume 'foo'\\''bar'",
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  resolveConfigRoot,
  resolveRoots,
  resolveStateRoot,
} from "./roots.js";

const HOME = "/Users/example";

describe("resolveConfigRoot — precedence", () => {
  it("prefers ANTMAY_CONFIG_HOME over everything", () => {
    const result = resolveConfigRoot(
      { ANTMAY_CONFIG_HOME: "/abs/cfg", XDG_CONFIG_HOME: "/abs/xdg" },
      HOME,
    );
    expect(result).toEqual({ ok: true, root: "/abs/cfg" });
  });

  it("falls back to $XDG_CONFIG_HOME/antmay", () => {
    const result = resolveConfigRoot({ XDG_CONFIG_HOME: "/abs/xdg" }, HOME);
    expect(result).toEqual({ ok: true, root: "/abs/xdg/antmay" });
  });

  it("falls back to <home>/.config/antmay", () => {
    const result = resolveConfigRoot({}, HOME);
    expect(result).toEqual({ ok: true, root: "/Users/example/.config/antmay" });
  });
});

describe("resolveStateRoot — precedence", () => {
  it("prefers ANTMAY_STATE_HOME over everything", () => {
    const result = resolveStateRoot(
      { ANTMAY_STATE_HOME: "/abs/state", XDG_STATE_HOME: "/abs/xdg" },
      HOME,
    );
    expect(result).toEqual({ ok: true, root: "/abs/state" });
  });

  it("falls back to $XDG_STATE_HOME/antmay", () => {
    const result = resolveStateRoot({ XDG_STATE_HOME: "/abs/xdg" }, HOME);
    expect(result).toEqual({ ok: true, root: "/abs/xdg/antmay" });
  });

  it("falls back to <home>/.local/state/antmay", () => {
    const result = resolveStateRoot({}, HOME);
    expect(result).toEqual({
      ok: true,
      root: "/Users/example/.local/state/antmay",
    });
  });
});

describe("empty values count as unset", () => {
  it("treats an empty primary var as unset and drops to XDG", () => {
    const result = resolveConfigRoot(
      { ANTMAY_CONFIG_HOME: "", XDG_CONFIG_HOME: "/abs/xdg" },
      HOME,
    );
    expect(result).toEqual({ ok: true, root: "/abs/xdg/antmay" });
  });

  it("treats an empty XDG var as unset and drops to home", () => {
    const result = resolveStateRoot({ XDG_STATE_HOME: "" }, HOME);
    expect(result).toEqual({
      ok: true,
      root: "/Users/example/.local/state/antmay",
    });
  });
});

describe("relative values are rejected naming the variable, without expansion", () => {
  it("rejects a relative primary value", () => {
    const result = resolveConfigRoot({ ANTMAY_CONFIG_HOME: "relative/path" }, HOME);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("ANTMAY_CONFIG_HOME");
  });

  it("rejects a leading-tilde value as relative (no tilde expansion)", () => {
    const result = resolveConfigRoot({ ANTMAY_CONFIG_HOME: "~/cfg" }, HOME);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("ANTMAY_CONFIG_HOME");
  });

  it("rejects a leading-variable value as relative (no variable expansion)", () => {
    const result = resolveStateRoot({ ANTMAY_STATE_HOME: "$HOME/state" }, HOME);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("ANTMAY_STATE_HOME");
  });
});

describe("absolute paths with literal ~ or $VAR segments are preserved verbatim", () => {
  it("keeps a literal ~ segment inside an absolute path", () => {
    const result = resolveConfigRoot({ ANTMAY_CONFIG_HOME: "/abs/~weird/cfg" }, HOME);
    expect(result).toEqual({ ok: true, root: "/abs/~weird/cfg" });
  });

  it("keeps a literal $VAR segment inside an absolute XDG path", () => {
    const result = resolveStateRoot({ XDG_STATE_HOME: "/abs/$HOME/x" }, HOME);
    expect(result).toEqual({ ok: true, root: "/abs/$HOME/x/antmay" });
  });
});

describe("missing home fails clearly only when needed", () => {
  it("fails when the home fallback is required but home is unknown", () => {
    const result = resolveConfigRoot({}, undefined);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("home");
  });

  it("succeeds without a home when an absolute env value is provided", () => {
    const result = resolveConfigRoot({ ANTMAY_CONFIG_HOME: "/abs/cfg" }, undefined);
    expect(result).toEqual({ ok: true, root: "/abs/cfg" });
  });
});

describe("resolveRoots composition and independence", () => {
  it("resolves both roots together", () => {
    const result = resolveRoots(
      { ANTMAY_CONFIG_HOME: "/abs/cfg", ANTMAY_STATE_HOME: "/abs/state" },
      HOME,
    );
    expect(result).toEqual({
      ok: true,
      configRoot: "/abs/cfg",
      stateRoot: "/abs/state",
    });
  });

  it("fails combined resolution on a config-root problem", () => {
    const result = resolveRoots(
      { ANTMAY_CONFIG_HOME: "relative", ANTMAY_STATE_HOME: "/abs/state" },
      HOME,
    );
    expect(result.ok).toBe(false);
  });

  it("resolves the state root independently despite an invalid config-only value", () => {
    const env = { ANTMAY_CONFIG_HOME: "relative", ANTMAY_STATE_HOME: "/abs/state" };
    expect(resolveConfigRoot(env, HOME).ok).toBe(false);
    expect(resolveStateRoot(env, HOME)).toEqual({ ok: true, root: "/abs/state" });
  });
});

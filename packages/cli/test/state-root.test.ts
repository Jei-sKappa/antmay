import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveStateRoot } from "../src/state/root";

const homeFallback = join(homedir(), ".local", "state", "antmay");

describe("state-root resolution priority", () => {
  it("uses ANTMAY_STATE_HOME when set to a non-empty path", () => {
    expect(
      resolveStateRoot({
        ANTMAY_STATE_HOME: "/tmp/antmay-explicit",
        XDG_STATE_HOME: "/tmp/xdg",
      }),
    ).toBe(resolve("/tmp/antmay-explicit"));
  });

  it("falls back to <XDG_STATE_HOME>/antmay when only XDG is set", () => {
    expect(resolveStateRoot({ XDG_STATE_HOME: "/tmp/xdg" })).toBe(
      join(resolve("/tmp/xdg"), "antmay"),
    );
  });

  it("falls back to ~/.local/state/antmay when neither is set", () => {
    expect(resolveStateRoot({})).toBe(homeFallback);
  });

  it("treats an empty ANTMAY_STATE_HOME as unset and honors XDG", () => {
    expect(
      resolveStateRoot({ ANTMAY_STATE_HOME: "", XDG_STATE_HOME: "/tmp/xdg" }),
    ).toBe(join(resolve("/tmp/xdg"), "antmay"));
  });

  it("treats an empty XDG_STATE_HOME as unset and falls back to home", () => {
    expect(
      resolveStateRoot({ ANTMAY_STATE_HOME: "", XDG_STATE_HOME: "" }),
    ).toBe(homeFallback);
  });

  it("resolves a relative ANTMAY_STATE_HOME to an absolute path", () => {
    expect(resolveStateRoot({ ANTMAY_STATE_HOME: "relative/state" })).toBe(
      resolve("relative/state"),
    );
  });
});

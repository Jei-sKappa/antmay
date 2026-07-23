import { mkdtempSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HarnessId } from "../config/settings.js";
import type { ProbeExec } from "./probe.js";
import { probeHarnessExecutables } from "./probe.js";

let binDir: string;
let repoRoot: string;
let savedPath: string | undefined;

beforeEach(() => {
  binDir = mkdtempSync(path.join(tmpdir(), "antmay-bin-"));
  repoRoot = mkdtempSync(path.join(tmpdir(), "antmay-repo-"));
  savedPath = process.env.PATH;
  // Replace PATH so only the fakes we create are discoverable — nothing leaks
  // in from the developer's real environment.
  process.env.PATH = binDir;
});

afterEach(() => {
  process.env.PATH = savedPath;
});

function fakeBinary(name: string, body: string): void {
  const file = path.join(binDir, name);
  writeFileSync(file, `#!/bin/sh\n${body}\n`);
  chmodSync(file, 0o755);
}

describe("probeHarnessExecutables (real executables on PATH)", () => {
  it("captures trimmed version lines under the requested harness", async () => {
    fakeBinary("codex", 'echo "codex-cli 0.12.0"');
    fakeBinary("claude", 'echo "  claude 1.2.3  "');
    const result = await probeHarnessExecutables(
      ["codex", "claude-code"],
      repoRoot,
    );
    expect(result).toEqual({
      ok: true,
      versions: { codex: "codex-cli 0.12.0", "claude-code": "claude 1.2.3" },
    });
  });

  it("diagnoses a non-zero exit distinctly", async () => {
    fakeBinary("codex", 'echo "bad thing" 1>&2\nexit 1');
    const result = await probeHarnessExecutables(["codex"], repoRoot);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({
      harness: "codex",
      binary: "codex",
    });
    expect(result.failures[0]!.reason).toContain("code 1");
    expect(result.failures[0]!.reason).toContain("bad thing");
  });

  it("diagnoses exit 0 with no output as empty output", async () => {
    fakeBinary("codex", "exit 0");
    const result = await probeHarnessExecutables(["codex"], repoRoot);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.failures[0]!.reason).toContain("no version output");
  });

  it("diagnoses a missing binary distinctly", async () => {
    // No fake created — claude is not on the (isolated) PATH.
    const result = await probeHarnessExecutables(["claude-code"], repoRoot);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.failures[0]).toMatchObject({
      harness: "claude-code",
      binary: "claude",
    });
    expect(result.failures[0]!.reason).toContain("not found");
  });

  it("aggregates all failing harnesses while capturing the successes", async () => {
    fakeBinary("codex", 'echo "codex 9.9.9"');
    fakeBinary("claude", "exit 3");
    const result = await probeHarnessExecutables(
      ["codex", "claude-code"],
      repoRoot,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({ harness: "claude-code" });
    expect(result.failures[0]!.reason).toContain("code 3");
  });
});

describe("probeHarnessExecutables (injected exec)", () => {
  it("de-duplicates the requested harnesses before probing", async () => {
    const seen: string[] = [];
    const exec: ProbeExec = async (binary) => {
      seen.push(binary);
      return { kind: "exit", code: 0, stdout: `${binary} 1.0.0`, stderr: "" };
    };
    const requested: HarnessId[] = ["codex", "codex", "claude-code", "codex"];
    const result = await probeHarnessExecutables(requested, repoRoot, exec);
    expect(seen.sort()).toEqual(["claude", "codex"]);
    expect(result).toEqual({
      ok: true,
      versions: { codex: "codex 1.0.0", "claude-code": "claude 1.0.0" },
    });
  });

  it("passes repoRoot and the fixed 10s timeout to the exec", async () => {
    const calls: { binary: string; cwd: string; timeout: number }[] = [];
    const exec: ProbeExec = async (binary, cwd, timeoutMs) => {
      calls.push({ binary, cwd, timeout: timeoutMs });
      return { kind: "exit", code: 0, stdout: "v1", stderr: "" };
    };
    await probeHarnessExecutables(["codex"], repoRoot, exec);
    expect(calls).toEqual([
      { binary: "codex", cwd: repoRoot, timeout: 10_000 },
    ]);
  });

  it("diagnoses a timeout distinctly", async () => {
    const exec: ProbeExec = async () => ({ kind: "timeout" });
    const result = await probeHarnessExecutables(["codex"], repoRoot, exec);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.failures[0]!.reason).toBe("timed out after 10s");
  });

  it("diagnoses a terminating signal distinctly", async () => {
    const exec: ProbeExec = async () => ({ kind: "signal", signal: "SIGKILL" });
    const result = await probeHarnessExecutables(["codex"], repoRoot, exec);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.failures[0]!.reason).toBe("terminated by signal SIGKILL");
  });

  it("diagnoses a non-ENOENT spawn error distinctly", async () => {
    const exec: ProbeExec = async () => ({
      kind: "spawn-error",
      message: "permission denied",
      code: "EACCES",
    });
    const result = await probeHarnessExecutables(["codex"], repoRoot, exec);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.failures[0]!.reason).toContain("EACCES");
  });
});

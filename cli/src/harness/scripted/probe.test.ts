import { describe, expect, it, vi } from "vitest";

import type { HarnessId } from "../id.js";
import {
  probeScriptedHarnessExecutables,
  SCRIPTED_PROBE_VERSION,
} from "./probe.js";
import { tempDirSync } from "../../test-helpers/temp-root.js";

describe("probeScriptedHarnessExecutables", () => {
  const repoRoot = tempDirSync("antmay-scripted-probe-");

  it("returns a deterministic non-empty version for each distinct harness", async () => {
    const result = await probeScriptedHarnessExecutables(
      ["codex", "claude-code"],
      repoRoot,
    );
    expect(result).toEqual({
      ok: true,
      versions: {
        codex: SCRIPTED_PROBE_VERSION,
        "claude-code": SCRIPTED_PROBE_VERSION,
      },
    });
    expect(SCRIPTED_PROBE_VERSION.length).toBeGreaterThan(0);
  });

  it("de-duplicates logical harness inputs before probing", async () => {
    const requested: HarnessId[] = ["codex", "codex", "claude-code", "codex"];
    const result = await probeScriptedHarnessExecutables(requested, repoRoot);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(Object.keys(result.versions).sort()).toEqual([
      "claude-code",
      "codex",
    ]);
  });

  it("does not require executables on PATH", async () => {
    vi.stubEnv("PATH", "");
    try {
      const result = await probeScriptedHarnessExecutables(
        ["codex", "claude-code"],
        repoRoot,
      );
      expect(result.ok).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

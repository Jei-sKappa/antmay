import type { HarnessId } from "../../config/execution.js";
import type { ProbeResult } from "../backends/probe.js";

/** Deterministic version observation returned for every logical harness. */
export const SCRIPTED_PROBE_VERSION = "scripted-harness 1.0.0";

/**
 * Process-free executable probe for scripted harness mode. De-duplicates the
 * requested logical harnesses and returns a fixed non-empty version line for
 * each without spawning a process or touching the filesystem.
 */
export async function probeScriptedHarnessExecutables(
  harnesses: HarnessId[],
  _repoRoot: string,
): Promise<ProbeResult> {
  const unique = [...new Set(harnesses)];
  const versions: Partial<Record<HarnessId, string>> = {};
  for (const harness of unique) {
    versions[harness] = SCRIPTED_PROBE_VERSION;
  }
  return { ok: true, versions };
}

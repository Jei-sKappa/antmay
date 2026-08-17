import type { HarnessId } from "../../id.js";
import type { ProbeResult } from "../probe.js";

/** Deterministic version observation returned for every logical harness. */
export const SIMULATED_PROBE_VERSION = "simulated-harness 1.0.0";

/**
 * Process-free executable probe for simulated harness mode. De-duplicates the
 * requested logical harnesses and returns a fixed non-empty version line for
 * each without spawning a process or touching the filesystem.
 */
export async function probeSimulatedHarnessExecutables(
  harnesses: HarnessId[],
  _repoRoot: string,
): Promise<ProbeResult> {
  const unique = [...new Set(harnesses)];
  const versions: Partial<Record<HarnessId, string>> = {};
  for (const harness of unique) {
    versions[harness] = SIMULATED_PROBE_VERSION;
  }
  return { ok: true, versions };
}

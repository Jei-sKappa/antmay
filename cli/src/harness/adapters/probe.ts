/**
 * The executable-probe vocabulary: what probing a set of harnesses answers, and
 * the shape of the probe that answers it.
 *
 * Availability belongs to the adapter family rather than to the harness, so each
 * family supplies its own probe and the resolver pairs one with that same
 * family's invoker. All three are written in terms of these declarations, which
 * is why they sit above both families rather than inside either.
 *
 * It declares and does nothing — only `import type` statements and exported
 * declarations. How a probe reaches an executable is not vocabulary: the real
 * family's injectable subprocess seam stays with the probe that spawns through
 * it, because a family that contacts nothing can produce no such outcome.
 */

import type { HarnessId } from "../id.js";

/**
 * One failing harness probe: the harness that failed, the binary that was
 * probed, and a human-readable reason distinguishing spawn, timeout, signal,
 * exit-code, and empty-output failures.
 */
export type ProbeFailure = {
  harness: HarnessId;
  binary: string;
  reason: string;
};

/**
 * The aggregate result of probing every requested harness executable. On
 * success, `versions` carries each requested harness's trimmed `--version`
 * line. On failure, `failures` lists every harness that failed, each diagnosed
 * distinctly.
 */
export type ProbeResult =
  | { ok: true; versions: Partial<Record<HarnessId, string>> }
  | { ok: false; failures: ProbeFailure[] };

/**
 * Probe every requested logical harness's executable. One runtime's invoker and
 * probe always come from the same adapter family, so this is the seam that moves
 * with the invoker rather than a dependency of its own.
 */
export type HarnessExecutableProbe = (
  harnesses: HarnessId[],
  repoRoot: string,
) => Promise<ProbeResult>;

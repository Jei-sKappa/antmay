import { resolveStateRoot } from "../../../config/roots.js";
import type { ResumePreflightResult } from "../types.js";

/**
 * Resolve only the state root for a resume. A config-root problem never blocks
 * a state-only resume.
 */
export function resolveResumeStateRoot(
  env: NodeJS.ProcessEnv,
  homedir: string | undefined,
): ResumePreflightResult<{ stateRoot: string }> {
  const stateRootResult = resolveStateRoot(env, homedir);
  if (!stateRootResult.ok) {
    return {
      ok: false,
      refusal: { kind: "message", message: stateRootResult.message },
    };
  }
  return { ok: true, stateRoot: stateRootResult.root };
}

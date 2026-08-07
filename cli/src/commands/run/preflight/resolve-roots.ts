import { resolveRoots } from "../../../config/roots.js";
import type { RunPreflightResult } from "../types.js";

/**
 * Resolve the configuration and state roots for a new run. Every later
 * reference is resolved against the config root or the invocation working
 * directory, so nothing can be read before the roots are known.
 */
export function resolveRunRoots(
  env: NodeJS.ProcessEnv,
  homedir: string | undefined,
): RunPreflightResult<{ configRoot: string; stateRoot: string }> {
  const roots = resolveRoots(env, homedir);
  if (!roots.ok) {
    return { ok: false, refusal: { kind: "message", message: roots.message } };
  }
  return {
    ok: true,
    configRoot: roots.configRoot,
    stateRoot: roots.stateRoot,
  };
}

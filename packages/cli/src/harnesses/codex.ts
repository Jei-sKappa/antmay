// Codex launch planning. Interactive Codex exposes no equivalent to session-ID
// pinning, so launch claims no deterministic identity: it records a HEURISTIC
// session (with a null id) and captures the canonical repository cwd and the
// spawn time, which later rollout discovery joins against best-effort. The
// harness starts in the canonical repository cwd with its own configured
// permission behavior unchanged — no permission posture is injected. The Codex
// session root stays injectable: when provided it is passed into the pane
// environment and carried on the observation binding for the reader.

import type { SessionIdentity } from "@antmay/core";
import type { HarnessLaunchInput, HarnessLaunchPlan } from "./index";

/** Build the Codex launch plan: heuristic session, cwd/spawn-time, invocation. */
export function planCodexLaunch(input: HarnessLaunchInput): HarnessLaunchPlan {
  const session: SessionIdentity = { kind: "heuristic", id: null };
  const spawnedAtMs = (input.now ?? Date.now)();

  const sessionRoot = input.env?.ANTMAY_CODEX_SESSION_ROOT ?? null;
  const env: Record<string, string> = {};
  if (sessionRoot !== null) {
    env.ANTMAY_CODEX_SESSION_ROOT = sessionRoot;
  }

  return {
    session,
    spec: {
      command: input.harnessExecutable,
      args: [],
      cwd: input.repositoryPath,
      env,
      initialInput: input.invocation,
    },
    observation: { kind: "codex", sessionRoot, spawnedAtMs },
  };
}

// Claude Code launch planning. Claude supports deterministic session pinning, so
// launch generates a UUID, passes it through `--session-id`, and records it as a
// PINNED session identity that later transcript observation reads back. The
// harness starts in the canonical repository cwd with its own configured
// permission behavior unchanged — no permission posture is injected. The Claude
// transcript root stays injectable: when provided it is passed into the pane
// environment and carried on the observation binding for the reader.

import { randomUUID } from "node:crypto";
import type { SessionIdentity } from "@antmay/core";
import type { HarnessLaunchInput, HarnessLaunchPlan } from "./index";

/** Build the Claude launch plan: pinned session, cwd, invocation, observation. */
export function planClaudeLaunch(input: HarnessLaunchInput): HarnessLaunchPlan {
  const sessionId = (input.generateSessionId ?? randomUUID)();
  const session: SessionIdentity = { kind: "pinned", id: sessionId };

  const transcriptRoot = input.env?.ANTMAY_CLAUDE_TRANSCRIPT_ROOT ?? null;
  const env: Record<string, string> = {};
  if (transcriptRoot !== null) {
    env.ANTMAY_CLAUDE_TRANSCRIPT_ROOT = transcriptRoot;
  }

  return {
    session,
    spec: {
      command: input.harnessExecutable,
      args: ["--session-id", sessionId],
      cwd: input.repositoryPath,
      env,
      initialInput: input.invocation,
    },
    observation: { kind: "claude", sessionId, transcriptRoot },
  };
}

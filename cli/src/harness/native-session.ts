import type { HarnessId } from "../config/settings.js";

/**
 * Quote `value` as one POSIX single-quoted shell argument. Every embedded
 * single quote is encoded as `'\''` so the whole ID stays one argument when
 * pasted into a POSIX shell.
 */
function posixSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * Compose the paste-ready native command that reopens a provider conversation
 * for `harness` and opaque `sessionId`. Pure: no provider filesystem access,
 * transcript probe, or subprocess launch.
 */
export function nativeContinuationCommand(
  harness: HarnessId,
  sessionId: string,
): string {
  const quoted = posixSingleQuote(sessionId);
  return harness === "codex"
    ? `codex resume ${quoted}`
    : `claude --resume ${quoted}`;
}

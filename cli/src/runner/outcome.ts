/**
 * The authoritative terminal-outcome parser. Antmay independently interprets the
 * captured iteration text and never relies on which Sandcastle completion signal
 * matched: only the trimmed final non-empty line decides advancement.
 *
 * On a match, `token` is the recognized outcome, `candidateLine` is the whole
 * trimmed final line, and `detail` is the uninterpreted remainder after the
 * token. On no match, `token` is `null` and `candidateLine` is the final
 * non-empty line, or `null` when the text held no non-empty line at all.
 */
export type OutcomeParse =
  | { token: "DONE" | "BLOCKED" | "REFUSED"; candidateLine: string; detail: string }
  | { token: null; candidateLine: string | null };

const OUTCOME_RE = /^Outcome: (DONE|BLOCKED|REFUSED)\b/;

/**
 * Parse the terminal outcome of a single captured iteration. Line endings are
 * normalized (`\r\n`/`\r` → `\n`); the trimmed final non-empty line is matched
 * from its start against `/^Outcome: (DONE|BLOCKED|REFUSED)\b/`. Earlier
 * `Outcome:` lines in the transcript never match — only the final line counts.
 */
export function parseTerminalOutcome(finalText: string): OutcomeParse {
  const normalized = finalText.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");

  let candidateLine: string | null = null;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const trimmed = lines[i].trim();
    if (trimmed.length > 0) {
      candidateLine = trimmed;
      break;
    }
  }

  if (candidateLine === null) {
    return { token: null, candidateLine: null };
  }

  const match = OUTCOME_RE.exec(candidateLine);
  if (match === null) {
    return { token: null, candidateLine };
  }

  const token = match[1] as "DONE" | "BLOCKED" | "REFUSED";
  const detail = candidateLine.slice(match[0].length).trim();
  return { token, candidateLine, detail };
}

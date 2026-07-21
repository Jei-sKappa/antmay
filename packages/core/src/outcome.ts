// Anchored terminal-outcome grammar. A completion-oriented skill reports its
// terminal outcome only on a single closing line of its final chat message,
// shaped exactly `Outcome: DONE | BLOCKED | REFUSED — <reason>` with an em-dash
// separator. This module recognizes that one line and rejects anything that
// merely resembles it: an embedded, quoted, indented, or mid-sentence lookalike
// is not a terminal outcome. It reads plain text only; deciding which text is
// the final top-level assistant message is the caller's job.

import { type TerminalOutcome, transcriptTerminalOutcome } from "./run";

// One anchored outcome line: `Outcome: ` at the very start of a line — no
// leading whitespace, quote, or blockquote marker — then one of the three
// uppercase status tokens, the ` — ` em-dash separator, then a reason that
// begins with a non-space character. Trailing whitespace is tolerated; any
// leading character at all is not, which rejects quoted and mid-sentence
// lookalikes.
const OUTCOME_LINE = /^Outcome: (DONE|BLOCKED|REFUSED) — (\S.*?)\s*$/;

const STATUS_TO_KIND = {
  DONE: "done",
  BLOCKED: "blocked",
  REFUSED: "refused",
} as const;

/**
 * Parse the anchored terminal-outcome line out of `text`, returning the
 * transcript-derived outcome with its complete, non-empty reason, or `null`
 * when no genuine anchored line is present. When several anchored lines appear,
 * the last one wins because a completion-oriented message closes with its
 * outcome.
 */
export function parseTerminalOutcome(text: string): TerminalOutcome | null {
  let found: TerminalOutcome | null = null;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    const match = OUTCOME_LINE.exec(line);
    if (match === null) {
      continue;
    }
    const status = match[1] as keyof typeof STATUS_TO_KIND;
    const reason = match[2] ?? "";
    found = transcriptTerminalOutcome(STATUS_TO_KIND[status], reason);
  }
  return found;
}

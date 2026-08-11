/**
 * The terminal-outcome protocol: the tokens a stage attempt may report, the
 * prefix their line opens with, the line itself, and the parser that recognizes
 * one. The skill suite emits these lines and the CLI classifies them, so the
 * values are a published contract — this module is where they are stated, and
 * every consumer in every domain derives its copy from here.
 *
 * It imports nothing, deliberately. Four domains depend on it, one of them
 * through a module that depends back on the domain this one sits in, and a leaf
 * cannot take part in a cycle whatever depends on it.
 */

/**
 * The recognized terminal outcomes, in the order every rendering lists them.
 * `DONE` advances the stage; the other two stop it for a human.
 */
export const TERMINAL_OUTCOMES = ["DONE", "BLOCKED", "REFUSED"] as const;

/** The terminal outcome that advances a stage. */
export const DONE_OUTCOME = TERMINAL_OUTCOMES[0];

/** One recognized terminal outcome. */
export type TerminalOutcome = (typeof TERMINAL_OUTCOMES)[number];

/** The exact opening of a terminal-outcome line, trailing space included. */
export const OUTCOME_PREFIX = "Outcome: ";

/**
 * Whether an untrusted value is one of the recognized tokens. The narrowing a
 * validator reading a persisted document or a parser reading agent text needs,
 * stated once so no caller tests membership against a widened collection.
 */
export function isTerminalOutcome(value: unknown): value is TerminalOutcome {
  return TERMINAL_OUTCOMES.some((token) => token === value);
}

/**
 * The complete outcome line for a token: the prefix and the token, and — when a
 * reason is supplied — the dash-separated detail an agent appends to it. This is
 * the one construction of the line, so a completion signal watched for, a
 * fabricated final message, and rendered prose cannot spell it differently.
 */
export function formatTerminalOutcome(
  token: TerminalOutcome,
  detail?: string,
): string {
  const line = `${OUTCOME_PREFIX}${token}`;
  return detail === undefined ? line : `${line} — ${detail}`;
}

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
  | { token: TerminalOutcome; candidateLine: string; detail: string }
  | { token: null; candidateLine: string | null };

/**
 * The prefix, one recognized token, and a word boundary — so a token a longer
 * word merely opens with is not one.
 */
const OUTCOME_RE = new RegExp(
  `^${OUTCOME_PREFIX}(${TERMINAL_OUTCOMES.join("|")})\\b`,
);

/**
 * Parse the terminal outcome of a single captured iteration. Line endings are
 * normalized (`\r\n`/`\r` → `\n`); the trimmed final non-empty line is matched
 * from its start against the recognized vocabulary. Earlier outcome lines in the
 * transcript never match — only the final line counts.
 */
export function parseTerminalOutcome(finalText: string): OutcomeParse {
  const normalized = finalText.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");

  const trimmed = lines.map((line) => line.trim());
  const candidateLine = trimmed.reverse().find((line) => line.length > 0) ?? null;

  if (candidateLine === null) {
    return { token: null, candidateLine: null };
  }

  const match = OUTCOME_RE.exec(candidateLine);
  if (match === null) {
    return { token: null, candidateLine };
  }

  // The alternation is the vocabulary itself, so a capture is one of its tokens.
  const token = match[1] as TerminalOutcome;
  const detail = candidateLine.slice(match[0].length).trim();
  return { token, candidateLine, detail };
}

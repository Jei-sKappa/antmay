// Claude transcript reader. Claude Code writes one JSONL record per turn to the
// session's pinned transcript path. Terminal evidence comes only from the final
// top-level (non-sidechain) assistant text turn of the run identified by the
// pinned session id, extended forward through any `forkedFrom` continuation.
// Everything else — user turns, echoed prompts, tool results, sidechain
// (subagent) turns, and non-final assistant turns — is structurally excluded
// before the outcome grammar ever runs, so an outcome-looking string in one of
// those places cannot classify the run.

import { readFileSync } from "node:fs";
import { parseTerminalOutcome } from "@antmay/core";
import {
  type JsonlRecord,
  type JsonlScan,
  parseJsonl,
  readObject,
  readString,
} from "./jsonl";
import {
  finalEvidence,
  noOutcomeEvidence,
  type TranscriptEvidence,
  unavailableEvidence,
} from "./types";

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSidechain(record: JsonlRecord): boolean {
  return record.isSidechain === true;
}

// The source session id a record was forked from, accepting either a bare
// string or an object carrying a `sessionId`.
function forkParent(record: JsonlRecord): string | undefined {
  const value = record.forkedFrom;
  if (typeof value === "string") {
    return value;
  }
  const nested = readObject(record, "forkedFrom");
  return nested === undefined ? undefined : readString(nested, "sessionId");
}

// The set of session ids that belong to the same logical run: the pinned id
// plus every session that forked (directly or transitively) from it. Following
// the chain forward keeps a fork's continuation attached to the run we launched.
function forkChain(
  records: readonly JsonlRecord[],
  pinned: string,
): Set<string> {
  const chain = new Set<string>([pinned]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const record of records) {
      const sessionId = readString(record, "sessionId");
      const parent = forkParent(record);
      if (
        sessionId !== undefined &&
        parent !== undefined &&
        chain.has(parent) &&
        !chain.has(sessionId)
      ) {
        chain.add(sessionId);
        changed = true;
      }
    }
  }
  return chain;
}

// Concatenated assistant text of a record, or `null` when the record is not an
// assistant turn or carries no text content (e.g. a tool_use-only turn).
function assistantText(record: JsonlRecord): string | null {
  if (readString(record, "type") !== "assistant") {
    return null;
  }
  const message = readObject(record, "message");
  if (message === undefined || message.role !== "assistant") {
    return null;
  }
  const content = message.content;
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return null;
  }
  const parts: string[] = [];
  for (const block of content) {
    if (typeof block === "object" && block !== null && !Array.isArray(block)) {
      const typed = block as JsonlRecord;
      if (typed.type === "text" && typeof typed.text === "string") {
        parts.push(typed.text);
      }
    }
  }
  return parts.length > 0 ? parts.join("\n") : null;
}

/**
 * Read terminal evidence from a Claude pinned transcript.
 *
 * @param input.transcriptPath the pinned session's JSONL file path.
 * @param input.repositoryPath the canonical repository folder the run launched
 *   in, validated against the transcript's embedded `cwd`.
 * @param input.sessionId the pinned Claude session id that identifies the run.
 */
export function readClaudeTranscriptEvidence(input: {
  transcriptPath: string;
  repositoryPath: string;
  sessionId: string;
}): TranscriptEvidence {
  let content: string;
  try {
    content = readFileSync(input.transcriptPath, "utf8");
  } catch (error) {
    return unavailableEvidence(
      `Claude transcript at ${input.transcriptPath} is unreadable: ${describeError(error)}`,
    );
  }

  const scan: JsonlScan = parseJsonl(content);

  // The pinned session must actually appear, otherwise this transcript belongs
  // to a different run and its evidence cannot be trusted.
  const hasPinnedSession = scan.records.some(
    (record) => readString(record, "sessionId") === input.sessionId,
  );
  if (!hasPinnedSession) {
    return unavailableEvidence(
      `Claude transcript does not contain the pinned session ${input.sessionId}.`,
    );
  }

  const chain = forkChain(scan.records, input.sessionId);

  // The last real conversational turn (user or assistant) in the run's fork
  // chain, excluding sidechain/subagent turns. Bookkeeping records (summary,
  // progress, snapshots, system) never count as the final turn.
  let lastTurn: JsonlRecord | undefined;
  for (const record of scan.records) {
    if (isSidechain(record)) {
      continue;
    }
    const sessionId = readString(record, "sessionId");
    if (sessionId === undefined || !chain.has(sessionId)) {
      continue;
    }
    const type = readString(record, "type");
    if (type === "user" || type === "assistant") {
      lastTurn = record;
    }
  }

  if (lastTurn === undefined) {
    return noOutcomeEvidence(
      "No top-level conversational turn found yet.",
      scan.malformedLines,
    );
  }

  // Validate the embedded working directory when the final turn carries one.
  const cwd = readString(lastTurn, "cwd");
  if (cwd !== undefined && cwd !== input.repositoryPath) {
    return unavailableEvidence(
      `Claude transcript cwd ${cwd} does not match repository ${input.repositoryPath}.`,
    );
  }

  const text = assistantText(lastTurn);
  if (text === null) {
    // The final turn is a user turn or an assistant turn without text (e.g. a
    // trailing tool call), so the run has not closed with an outcome.
    return noOutcomeEvidence(
      "The final top-level turn carries no assistant text outcome.",
      scan.malformedLines,
    );
  }

  const outcome = parseTerminalOutcome(text);
  if (outcome !== null) {
    return finalEvidence(outcome);
  }
  return noOutcomeEvidence(
    "The final assistant turn carries no terminal outcome.",
    scan.malformedLines,
  );
}

// Codex transcript reader. Interactive Codex does not pin a session id, so the
// rollout is discovered from the recorded repository cwd plus a spawn-time
// heuristic. Subagent rollouts (those carrying a `thread_source`) are rejected,
// and terminal evidence comes only from the last genuine top-level
// `task_complete` event's final agent message. Echoed prompts in user input,
// tool call output, and non-final agent messages are never read, so an
// outcome-looking string in any of them cannot classify the run.

import { type Dirent, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
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

// A rollout is a subagent rollout when its session metadata records the parent
// thread it was spawned from.
function isSubagentMeta(meta: JsonlRecord): boolean {
  const source = meta.thread_source;
  return source !== undefined && source !== null;
}

// The first `session_meta` payload only. A `codex fork` replays the source
// rollout's `session_meta` as history, so later ones must not re-identify the
// file.
function firstSessionMeta(
  records: readonly JsonlRecord[],
): JsonlRecord | undefined {
  for (const record of records) {
    if (readString(record, "type") === "session_meta") {
      return readObject(record, "payload") ?? {};
    }
  }
  return undefined;
}

// The recorded working directory: from the first `session_meta`, falling back
// to the first `turn_context` for a meta-less rollout.
function rolloutCwd(records: readonly JsonlRecord[]): string | undefined {
  const meta = firstSessionMeta(records);
  const metaCwd = meta === undefined ? undefined : readString(meta, "cwd");
  if (metaCwd !== undefined) {
    return metaCwd;
  }
  for (const record of records) {
    if (readString(record, "type") === "turn_context") {
      const payload = readObject(record, "payload");
      const cwd =
        payload === undefined ? undefined : readString(payload, "cwd");
      if (cwd !== undefined) {
        return cwd;
      }
    }
  }
  return undefined;
}

// Start time of the rollout in epoch milliseconds, taken from the first record
// that carries a parseable `timestamp`, or `null` when none does.
function rolloutStartMs(records: readonly JsonlRecord[]): number | null {
  for (const record of records) {
    const timestamp = readString(record, "timestamp");
    if (timestamp !== undefined) {
      const parsed = Date.parse(timestamp);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

// The final agent message of the last top-level `task_complete` event. `present`
// records whether any task completion occurred at all.
function lastTaskComplete(records: readonly JsonlRecord[]): {
  present: boolean;
  text: string | null;
} {
  let present = false;
  let text: string | null = null;
  for (const record of records) {
    if (readString(record, "type") !== "event_msg") {
      continue;
    }
    const payload = readObject(record, "payload");
    if (payload === undefined || payload.type !== "task_complete") {
      continue;
    }
    present = true;
    text = readString(payload, "last_agent_message") ?? null;
  }
  return { present, text };
}

function isRolloutFilename(name: string): boolean {
  return name.startsWith("rollout-") && name.endsWith(".jsonl");
}

function listRolloutFiles(root: string): string[] {
  const files: string[] = [];
  let entries: Dirent<string>[];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listRolloutFiles(full));
    } else if (entry.isFile() && isRolloutFilename(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Discover the top-level Codex rollout for a run. Among rollouts under
 * `sessionRoot` whose recorded cwd matches `repositoryPath` and that are not
 * subagent rollouts, the one whose start time is nearest the recorded spawn
 * time wins; ties fall back to the most recently modified file. Returns `null`
 * when no rollout matches (yet).
 */
export function discoverCodexRollout(input: {
  sessionRoot: string;
  repositoryPath: string;
  spawnedAtMs: number;
}): string | null {
  const candidates: Array<{ path: string; distance: number; mtimeMs: number }> =
    [];
  for (const path of listRolloutFiles(input.sessionRoot)) {
    let content: string;
    try {
      content = readFileSync(path, "utf8");
    } catch {
      continue;
    }
    const { records } = parseJsonl(content);
    const meta = firstSessionMeta(records);
    if (meta !== undefined && isSubagentMeta(meta)) {
      continue;
    }
    if (rolloutCwd(records) !== input.repositoryPath) {
      continue;
    }
    const startMs = rolloutStartMs(records);
    const distance =
      startMs === null
        ? Number.POSITIVE_INFINITY
        : Math.abs(startMs - input.spawnedAtMs);
    let mtimeMs = 0;
    try {
      mtimeMs = statSync(path).mtimeMs;
    } catch {
      mtimeMs = 0;
    }
    candidates.push({ path, distance, mtimeMs });
  }
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) =>
    a.distance !== b.distance ? a.distance - b.distance : b.mtimeMs - a.mtimeMs,
  );
  return candidates[0]?.path ?? null;
}

/**
 * Read terminal evidence from an already-selected Codex rollout file, validating
 * the recorded cwd and rejecting subagent rollouts.
 */
export function readCodexRolloutEvidence(input: {
  rolloutPath: string;
  repositoryPath: string;
}): TranscriptEvidence {
  let content: string;
  try {
    content = readFileSync(input.rolloutPath, "utf8");
  } catch (error) {
    return unavailableEvidence(
      `Codex rollout at ${input.rolloutPath} is unreadable: ${describeError(error)}`,
    );
  }

  const scan: JsonlScan = parseJsonl(content);
  const meta = firstSessionMeta(scan.records);
  if (meta !== undefined && isSubagentMeta(meta)) {
    return unavailableEvidence(
      "Codex rollout is a subagent thread and cannot classify the top-level run.",
    );
  }

  const cwd = rolloutCwd(scan.records);
  if (cwd !== undefined && cwd !== input.repositoryPath) {
    return unavailableEvidence(
      `Codex rollout cwd ${cwd} does not match repository ${input.repositoryPath}.`,
    );
  }

  const completion = lastTaskComplete(scan.records);
  if (!completion.present || completion.text === null) {
    return noOutcomeEvidence(
      "No top-level task completion with a final agent message yet.",
      scan.malformedLines,
    );
  }

  const outcome = parseTerminalOutcome(completion.text);
  if (outcome !== null) {
    return finalEvidence(outcome);
  }
  return noOutcomeEvidence(
    "The top-level task completion carries no terminal outcome.",
    scan.malformedLines,
  );
}

/**
 * Read terminal evidence for a Codex run: discover the top-level rollout by cwd
 * and spawn-time heuristic, then classify it. When no rollout is discoverable
 * the evidence is transiently unavailable, leaving the run active.
 */
export function readCodexTranscriptEvidence(input: {
  sessionRoot: string;
  repositoryPath: string;
  spawnedAtMs: number;
}): TranscriptEvidence {
  const rolloutPath = discoverCodexRollout(input);
  if (rolloutPath === null) {
    return unavailableEvidence(
      `No Codex rollout for ${input.repositoryPath} was discovered under ${input.sessionRoot}.`,
    );
  }
  return readCodexRolloutEvidence({
    rolloutPath,
    repositoryPath: input.repositoryPath,
  });
}

// Structured transcript detection: harness-neutral terminal evidence read from
// Claude pinned transcripts and discovered Codex rollouts. Filesystem discovery
// and parsing live here in the CLI; the anchored terminal-outcome grammar and
// classification live in `@antmay/core`.

export { readClaudeTranscriptEvidence } from "./claude";
export {
  discoverCodexRollout,
  readCodexRolloutEvidence,
  readCodexTranscriptEvidence,
} from "./codex";
export { type JsonlRecord, type JsonlScan, parseJsonl } from "./jsonl";
export {
  finalEvidence,
  malformedEvidence,
  noOutcomeEvidence,
  pendingEvidence,
  type TranscriptEvidence,
  unavailableEvidence,
} from "./types";

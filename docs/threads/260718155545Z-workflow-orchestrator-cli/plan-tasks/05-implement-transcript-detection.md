### Task 5: Implement structured transcript detection

**Objective:** Derive terminal evidence only from genuine top-level final Claude or Codex transcript events while tolerating malformed/additive data and rejecting outcome-looking false positives.

**Input / context:** Core lifecycle types from Task 2; `spec.md` §§3.3 and 4.2 plus FR-6; `decisions.md DR1`, `decisions.md DR3`, `decisions.md DR21`, and `decisions.md DR22`. The parser module structure is a degree of freedom; keep filesystem discovery in `packages/cli` and the terminal-outcome grammar/classification in `packages/core`.

**Steps:**
1. Implement the anchored terminal-outcome parser for exactly `Outcome: DONE | BLOCKED | REFUSED — <reason>`, returning the complete non-empty reason and rejecting embedded, quoted, or malformed lookalikes.
2. Define a harness-neutral `TranscriptEvidence` result that distinguishes reliable final outcome, no final outcome yet, transiently unavailable evidence, and malformed lines skipped without claiming the endpoint ended.
3. Parse Claude JSONL leniently, select only final top-level non-sidechain assistant text, exclude subagent files, validate embedded cwd/session identity, and follow `forkedFrom` chains without raw grepping.
4. Discover and parse Codex rollout JSONL by recorded repository cwd and spawn-time heuristic, reject subagent `thread_source` rollouts, and use only a genuine top-level `task_complete` final message.
5. Keep additive unknown fields compatible, skip malformed individual lines, and never apply a harness-version gate.
6. Add fixture-driven tests for DONE/BLOCKED/REFUSED reasons, user/echoed/tool/file/non-final assistant false positives, malformed and additively drifting lines, Claude fork chains, Codex top-level versus subagent selection, missing files, and temporarily unreadable evidence.

**Files modified:**
- `packages/core/src/outcome.ts` (NEW)
- `packages/core/src/index.ts`
- `packages/core/test/outcome.test.ts` (NEW)
- `packages/cli/src/transcripts/types.ts` (NEW)
- `packages/cli/src/transcripts/jsonl.ts` (NEW)
- `packages/cli/src/transcripts/claude.ts` (NEW)
- `packages/cli/src/transcripts/codex.ts` (NEW)
- `packages/cli/src/transcripts/index.ts` (NEW)
- `packages/cli/test/claude-transcript.test.ts` (NEW)
- `packages/cli/test/codex-transcript.test.ts` (NEW)
- `packages/cli/test/fixtures/transcripts/claude.jsonl` (NEW)
- `packages/cli/test/fixtures/transcripts/claude-fork.jsonl` (NEW)
- `packages/cli/test/fixtures/transcripts/codex.jsonl` (NEW)
- `packages/cli/test/fixtures/transcripts/codex-subagent.jsonl` (NEW)

**Verification:** `bun run test -- packages/core/test/outcome.test.ts packages/cli/test/claude-transcript.test.ts packages/cli/test/codex-transcript.test.ts`, `bun run build`, `bun run typecheck`, and `bun run check` all exit 0; `rg 'readFile.*pane|pane.*Outcome' packages/core packages/cli/src/transcripts` returns no classifier path.

**Acceptance criteria:**
- Genuine final top-level Claude and Codex messages classify DONE/BLOCKED/REFUSED with complete reasons.
- User, echoed prompt, tool/file output, non-final assistant, sidechain/subagent, and pane text cannot classify a run.
- Claude fork chains and Codex heuristic discovery resolve the intended top-level run.
- Malformed lines are skipped and additive fields are accepted without version gating.
- Missing or transiently unreadable transcript evidence is distinguishable from positive execution-end evidence.

**Consumes:** `RunRecord`, session identity, classification, and terminal transition types from Task 2.

**Produces:** `parseTerminalOutcome(text)` in core and harness-neutral `readTranscriptEvidence(run)` implementations for Claude and Codex.

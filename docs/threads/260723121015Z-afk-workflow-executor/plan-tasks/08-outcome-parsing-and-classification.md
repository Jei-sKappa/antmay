# Task 8: Outcome parsing and result classification

**Objective:** Implement the authoritative terminal-outcome parser and the pure classification-precedence function that turns an attempt's outcome, harness result, and queue state into the single next action.

**Input / context:** `spec.md` §"Interpreting a stage result" (outcome parsing, classification precedence, malformed handling) ; `decisions.md DR29` (final-line parse is the sole advancement authority), `DR21` (Sandcastle signals never decide), `DR30` (malformed → durable pause, no retry/inference), `DR41`/`DR44`/`DR52` (precedence: DONE → boundary first; non-DONE + pending files → `pending-queues`; then idle-timeout, harness-error, outcome token). Consumes `WaitingKind` from Task 5 and `AttemptOutcome` from Task 7. Both modules are pure functions with exhaustive unit tests — no I/O.

**Steps:**

1. Create `cli/src/runner/outcome.ts` exporting `parseTerminalOutcome(finalText: string): OutcomeParse` where `OutcomeParse = { token: "DONE" | "BLOCKED" | "REFUSED"; candidateLine: string; detail: string } | { token: null; candidateLine: string | null }`: normalize line endings (`\r\n`/`\r` → `\n`), take the trimmed final non-empty line of the captured iteration text, match from the line start against `/^Outcome: (DONE|BLOCKED|REFUSED)\b/`; on match, `detail` is the uninterpreted remainder after the token (bare token, em-dash detail, and plain-text detail all parse); on no match, `candidateLine` is that final non-empty line (or `null` for whitespace-only text). Earlier `Outcome:` lines in the transcript never match — only the final line counts.
2. Create `cli/src/runner/classify.ts` exporting the pure precedence function:
   - `type ClassificationInput = { attemptOutcome: AttemptOutcome; parse: OutcomeParse | null; pendingFiles: string[]; queueScanError: string | null; boundary: BoundaryDisposition }` where `BoundaryDisposition = { evaluated: false } | { evaluated: true; ok: true } | { evaluated: true; ok: false; kind: "git-policy-violation" | "commit-error"; message: string }` (the runner evaluates/finalizes the boundary via Task 9 before calling classify for DONE results). Preserve the concrete queue-scan diagnostic rather than reducing it to a boolean, so a `gate-error` waiting object has a complete human message.
   - `type Classification = { action: "advance" } | { action: "pause"; kind: WaitingKind; message: string } | { action: "pause-done"; kind: "pending-queues"; message: string }` — `pause-done` marks the DONE-finalized queue pause whose attempt records `done` (DR52/DR53); every other pause records `waiting`;
   - precedence, in order: a failed queue scan → `gate-error`; a parsed DONE with a finalized-ok boundary → `advance` when `pendingFiles` is empty, else `pause-done`/`pending-queues`; a parsed DONE with a failed boundary → pause with the boundary's kind, listing any pending files in the message; for every non-DONE result, non-empty `pendingFiles` → `pending-queues` (taking precedence over BLOCKED/REFUSED and provider errors); then `attemptOutcome.category === "idle-timeout"` → `idle-timeout`; other harness failure → `harness-error`; then the token — `BLOCKED` → `outcome-blocked`, `REFUSED` → `outcome-refused`, no/unrecognizable token → `malformed-outcome`.
   - Messages are complete human sentences carrying the required content: `malformed-outcome` includes the expected prefixes and the candidate line when present; `pending-queues` includes the sorted pending paths; harness kinds carry the neutral category plus original class/message.
3. Add `cli/src/runner/outcome.test.ts`: bare token; ` — detail` em-dash form; plain trailing text; trailing blank lines and `\r\n` endings; earlier `Outcome: DONE` in the transcript ignored when the final line differs; lowercase/prefixed/mid-line tokens rejected; whitespace-only text → `{ token: null, candidateLine: null }` (AC-10.1, AC-10.2 content).
4. Add `cli/src/runner/classify.test.ts` covering the full precedence matrix: queue-scan-error dominance; DONE+ok+empty → advance; DONE+ok+pending → pause-done; DONE+violation (with and without pending files listed); BLOCKED/REFUSED/provider-error/idle-timeout each with and without pending files; missing token → malformed; message-content assertions per kind (AC-11.3, AC-10.3 message content).

**Files modified:** `cli/src/runner/outcome.ts` (NEW), `cli/src/runner/classify.ts` (NEW), `cli/src/runner/outcome.test.ts` (NEW), `cli/src/runner/classify.test.ts` (NEW)

**Verification:** `npm --prefix cli run check` exits 0; `npm --prefix cli run test -- src/runner` exits 0.

**Acceptance criteria:**

- The parser matches AC-10.1 exactly (regex, final non-empty line, normalization, accepted detail forms) and produces the stored candidate/token/detail triple of AC-10.2.
- Classification order matches AC-11.3 and DR44's explicit scan-error rule: gate-error on a failed scan, otherwise DONE boundary-first, pending-files dominance for non-DONE, then idle-timeout → harness-error → token; DONE queue pauses are distinguishable (`pause-done`) so the runner can record the attempt as `done`.
- A Sandcastle completion-signal match with no valid final-line token classifies as `malformed-outcome`, never advance (AC-10.2).

**Consumes:** `WaitingKind` from `cli/src/state/checkpoint.ts` (Task 5); `AttemptOutcome` from `cli/src/harness/types.ts` (Task 7).

**Produces:** `parseTerminalOutcome(finalText): OutcomeParse` from `cli/src/runner/outcome.ts`; `classifyAttempt(input: ClassificationInput): Classification` plus the `BoundaryDisposition` type from `cli/src/runner/classify.ts`.

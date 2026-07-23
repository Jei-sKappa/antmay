# Task 11: Terminal display

**Objective:** Implement the terminal `Display`: startup summaries, permission warnings, the curated live view with heartbeat, stage/pause/completion rendering, and the color and stream rules.

**Input / context:** `spec.md` §"Terminal display" and the output requirements in §"CLI surface and exit codes" (final output names the run ID and condition; the CLI never prints a line beginning with `Outcome:`); `decisions.md DR43` (summaries, live view, heartbeat, pause/completion content, prominent unrestricted warning), `DR19` (curated streaming, no raw provider JSON, stdout/stderr split, `NO_COLOR`), `DR22` (waiting output includes reason and exact resume command), `DR56` (resume re-prints the unrestricted warning). Exact wording, truncation lengths, and styling are free (spec degrees of freedom 2 and 6) provided every required content element appears. Consumes the `Display` interface from Task 10.

**Steps:**

1. Create `cli/src/display/terminal.ts` exporting `createTerminalDisplay(options: { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream; isTTY: boolean; noColor: boolean }): Display` plus two standalone render helpers the commands call outside the runner loop: `printRunSummary(display-options, info: { runId: string; recipeName: string; threadRelPath: string; workspacePath: string; dangerouslySkipPermissions: boolean; stageCount: number })` and `printUsageError`-independent warning helper `printUnrestrictedWarning(stderr)`.
2. Implement the `Display` methods: `attemptStarted` prints stage position/ID, harness/model, attempt number, absolute log path; `harnessEvent` renders normalized assistant text as-is and tool calls as one concise line each with arguments truncated to a fixed display length (full data stays in the log — the display never receives raw JSON, only `HarnessEvent`s); `heartbeat` prints elapsed time (called by the runner every five minutes); `stageSucceeded` prints position and duration; `runPaused` prints the stored waiting reason/message, pending paths when present, log path, run ID, and the exact resume command; `runCompleted` prints run ID, recipe, total elapsed time, and the absolute checkpoint path.
3. Implement stream and color discipline: normal messages to stdout; warnings and errors (including the unrestricted-permissions warning and `warn`) to stderr; color codes only when `isTTY && !noColor` (`noColor` derived from a non-empty `NO_COLOR` env by the caller); color carries no meaning on its own; no spinners or cursor-control sequences that corrupt piped streams. Guard every rendered string: no output line may begin with `Outcome:` — prefix any echoed candidate line (e.g. inside a malformed-outcome message) so the guarantee holds structurally.
4. Make `printRunSummary` render the run ID, recipe, thread, workspace, permission mode, and stage count, and emit the prominent multi-line unrestricted warning to stderr when `dangerouslySkipPermissions` is true (reused verbatim by resume's startup path, DR56).
5. Add `cli/src/display/terminal.test.ts` using in-memory writable streams: each method's required content elements present; tool-call truncation; stdout/stderr routing; color absent when `noColor` or not TTY, present otherwise; heartbeat output; summary with and without the unrestricted warning; no rendered line beginning with `Outcome:` even when a waiting object carries a candidate line `Outcome: DONEish` (AC-1.5).

**Files modified:** `cli/src/display/terminal.ts` (NEW), `cli/src/display/terminal.test.ts` (NEW)

**Verification:** `npm --prefix cli run check` exits 0; `npm --prefix cli run test -- src/display` exits 0.

**Acceptance criteria:**

- Every AC-18.1–AC-18.3 content element is asserted in tests: summaries, warnings, attempt announcements, curated live view with display-only truncation, heartbeat, stage/pause/completion lines, no raw provider JSON, stdout/stderr separation.
- Color appears only on TTY with `NO_COLOR` unset and carries no meaning (AC-16.3 color rule shared here).
- No code path in the display can emit a line starting with `Outcome:` (AC-1.5).

**Consumes:** `Display`, `WaitingInfo`-carrying pause payloads, and `HarnessEvent` shapes from Tasks 5, 7, and 10.

**Produces:** `createTerminalDisplay(options): Display`, `printRunSummary(...)`, `printUnrestrictedWarning(stderr)` from `cli/src/display/terminal.ts`.

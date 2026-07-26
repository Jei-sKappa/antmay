# Spec — Expose provider session IDs so AFK stages can be continued in the native Codex/Claude Code CLIs

## Intended outcome

After this change, a person whose `antmay afk` run has paused can reopen the *exact* Codex or Claude Code conversation the paused stage ran in, using the provider's own interactive CLI, and can find that conversation again later without reading raw state files.

Concretely, three things become true:

1. Every stage attempt that reached its provider records which provider conversation it ran in, durably, in the run checkpoint.
2. The pause block printed when a run stops for a human includes a ready-to-paste command that reopens that conversation, next to the existing `Log` and `Resume` lines.
3. `antmay afk list` shows each run's most recent conversation identity, so the reference survives a lost terminal.

The motivating case: the `spec` stage reports `Outcome: DONE` but leaves a `.pending-decisions/` bundle. The run pauses. Rather than answering those decisions cold, the person reopens the conversation that authored the spec, runs `resolve-pending-decisions` inside it, commits the result, and resumes the run.

## Context

`antmay` is a strict, non-interactive executor that drives a pipeline stage by stage through an agentic harness (Codex or Claude Code) via Sandcastle, with durable checkpoints and per-stage Git boundaries. Both provider CLIs can reopen a past conversation by ID — `codex resume <id>` and `claude --resume <id>` — and because Antmay runs them through Sandcastle's `noSandbox()`, the providers write their native transcripts to the host's normal storage as usual.

Sandcastle already extracts a session ID from each provider's stream. Antmay discards it. Nothing in the checkpoint identifies the conversation, nothing in the terminal output names it, and the only way to recover one today is to `jq` the raw provider lines out of an attempt log by hand.

This thread closes that gap. It exposes and durably records provider-session *identity*. It does not make Antmay reuse a conversation: the executor never enables Sandcastle session capture, never passes a resume or fork session, and starts every stage attempt — including a resumed stage — in a fresh agent conversation. Reopening a conversation stays an out-of-band act a human performs in their own terminal. (Those constraints were set for v0 in `docs/threads/260723121015Z-afk-workflow-executor/`; they are stated here in full because this spec must stand alone.)

The two operations must not be conflated: `antmay afk resume <run-id>` resumes Antmay's durable workflow checkpoint, while `codex resume <id>` reopens a provider conversation. Nothing in this change couples them.

## Scope

In scope:

- Capturing the provider session ID inside the Sandcastle harness adapter, for successful *and* failed attempts.
- A capture-health diagnostic surfaced as a single terminal warning.
- Reshaping the Antmay-owned `AttemptOutcome` so a session sits beside the attempt result rather than inside one of its variants.
- Persisting the session on the attempt record in the run checkpoint, plus its validation.
- One new line in the pause block, and one new column in `antmay afk list`.
- A synthetic session in the scripted test harness so both new renderings are demo-reachable.
- Two drift guards: a CI test pinning Antmay's matcher against Sandcastle's own parser, and an opt-in real-provider verifier with its own vitest config.
- Living documentation under `cli/`.

Explicitly **out** of scope:

- **Provider-session reuse.** Antmay never passes `resumeSession` or `forkSession`, and `captureSessions` stays `false` for both providers. Retrying a stage still starts a fresh conversation.
- **A fourth subcommand.** No `antmay afk session`; the command surface stays `run`, `resume`, `list` (per `decisions.md` DR6).
- **Launching a provider CLI.** Antmay prints a command; it never spawns an interactive provider process.
- **Transcript verification.** Antmay never inspects `~/.codex/sessions/` or `~/.claude/projects/` to check whether a transcript still exists (per `decisions.md` DR5).
- **A per-attempt view of every session in a run.** Deferred to a future thread, to be designed with the wider rework of `list` output (per `decisions.md` DR6).
- **Any change to `resume`'s clean-worktree rule** (per `decisions.md` DR3).
- **Any checkpoint schema version bump or migration** (per `decisions.md` DR4).
- **Any edit under `docs/threads/260723121015Z-afk-workflow-executor/`** — not its `decisions.md`, not its `spec.md`. The seed of this thread suggests otherwise; that suggestion is void, because the method forbids modifying another thread and because none of that thread's decisions are reversed here (per `decisions.md` DR9).
- **Writing the session into the attempt log** header or footer. The raw provider line is already there.
- **Changes to the `runFailed` and `runInterrupted` renderings.** Neither has an attempt whose session is in question.

## Expected behavior

### Capturing the session (`cli/src/harness/sandcastle.ts`)

The adapter watches the raw provider stream for the session-identity line and holds the **first** match for the lifetime of the attempt (per `decisions.md` DR1):

- Codex: `{ "type": "thread.started", "thread_id": "<id>" }`
- Claude Code: `{ "type": "system", "subtype": "init", "session_id": "<id>" }`

Sandcastle already delivers every provider stdout line to the `onAgentStreamEvent` callback the adapter wires, as `{ type: "raw", line, iteration, timestamp }`; those events are currently dropped. Non-JSON and unparseable lines must not throw.

This matters because a rejected Sandcastle `run()` produces no `RunResult` at all, so an idle timeout, a provider error, and an abort would otherwise carry no session — which is precisely when a human wants to inspect the conversation.

On the resolve path both sources exist, and **Sandcastle is the authority**: `result.iterations.at(-1)?.sessionId` wins, and the matched value is the fallback used only when Sandcastle's is absent. The captured session attaches to failed outcomes as well as completed ones.

A capture diagnostic is produced in exactly two situations, both meaning *Antmay's matcher is stale even though the recorded ID is correct*:

- Both sources present and different.
- Sandcastle produced an ID and the matcher found none.

The inverse — matcher found one, Sandcastle did not — is normal on the reject path and produces no diagnostic. Neither does the case where no session line ever arrived.

### Carrying it across the harness seam (`cli/src/harness/types.ts`)

`AttemptOutcome` becomes an object with three members (per `decisions.md` DR7):

```ts
export type AttemptOutcome = {
  /** The provider conversation this attempt ran in, when one was identified. */
  session?: { id: string };
  /** A capture diagnostic the runner forwards verbatim to `display.warn`. */
  sessionWarning?: string;
  result:
    | { kind: "completed"; finalText: string }
    | {
        kind: "failed";
        category: "idle-timeout" | "aborted" | "provider-error";
        errorClass: string;
        errorMessage: string;
      };
};
```

Hoisting `session` out of the union is what makes it true by construction that a session is independent of how the attempt ended. `sessionWarning` is a sibling, not a field inside `session`, because it describes the health of Antmay's capture mechanism rather than the identity of a conversation — the recorded ID stays correct in both diagnostic cases — and it is never persisted.

No new callback and no new `HarnessEvent` variant is added. The adapter writes the diagnostic's prose; the runner forwards it verbatim to `display.warn` exactly once per attempt that carries one. Classification consumes only the `result` half, which is unchanged.

Every consumer moves with the shape: `cli/src/harness/sandcastle.ts`, `cli/src/harness/scripted/invoker.ts`, `cli/src/test-helpers/fake-harness.ts`, `cli/src/runner/classify.ts`, and `cli/src/runner/runner.ts`, where `outcome.kind` becomes `outcome.result.kind`.

### Persisting it (`cli/src/state/checkpoint.ts`)

`AttemptRecord` gains (per `decisions.md` DR4):

```ts
agentSession?: { harness: HarnessId; id: string };
```

Written on **every** attempt whose outcome carried a session, whatever that attempt's result — `done`, `waiting`, and `interrupted` alike — not on a subset selected by outcome. Absent when no session was captured, which is a real state: the runner's pre-launch interruption path settles an attempt that never invoked the harness, and a provider may emit no init line.

`harness` is stored alongside the ID even though it is derivable from the snapshotted stage profile, so a reader can compose the native command from the attempt record alone. The runner supplies it from the resolved stage profile; the harness seam does not carry it.

The value is attached only on the settle-time write the runner already performs, which gives the runner's interruption helper an optional session parameter — supplied at its post-abort call site, absent at its pre-launch one. No additional checkpoint write is introduced: mid-attempt, the persisted executing record carries no session.

`validateAttempt` validates the field as optional; when present, `harness` must be a known harness id and `id` a non-empty string. `schemaVersion` stays `0`.

### Showing it at a pause (`cli/src/display/`)

When the attempt a pause is about carries a session, the pause block's action section gains one line under the key `Continue`, alongside `Log` and `Resume`, whose value is the exact native command (per `decisions.md` DR5):

```
  Continue  codex resume 019a2f3c-…
  Log       /Users/…/attempt-1-spec-1.log
  Resume    antmay afk resume 20260726T163046000Z-11aa22bb
```

For Claude Code the value is `claude --resume <id>`. No separate harness-name label is rendered: the harness is legible from the binary name in the command. A paste-ready line matches this section's established idiom — its stated purpose is that the last thing on screen is the thing to type next — and it removes the one detail nobody memorizes, which is that the two providers spell continuation differently.

The session shown always belongs to the attempt the pause is about, so no attempt-selection rule applies. A pause taken before any attempt was allocated — the pre-attempt queue gate, a gate error — shows no `Continue` line, exactly as it already shows no `Log` line.

Whenever the `Continue` line is present, the same block also states that the worktree must be clean before `antmay afk resume`, so the person commits or reverts whatever the conversation changed (per `decisions.md` DR3). This is necessary because `resume` requires a clean worktree for a `pending-queues` pause, and the natural next step — `resolve-pending-decisions` appending to `decisions.md`, which the stage's own boundary commit already committed — leaves the worktree dirty. Without the caution, a person would invest a whole conversation before discovering the precondition. The caution is rendered by the display; no `nextAction` is added to the checkpoint and no new field enters it.

Rendering requires no filesystem access: the ID is an opaque reference and the line is composed identically whether or not a transcript still exists.

### Finding it later (`cli/src/commands/list.ts`)

`renderRow` gains one column showing the session of the **most recent attempt that carries one**, rendered `<harness>/<session-id>` to reuse the row's existing `harness/model` idiom, and omitted for a run that captured none (per `decisions.md` DR6). A completed run's row shows it too, even though such a row deliberately omits stage and `harness/model`; the stored `harness` keeps the column self-describing there.

The selection rule is exact where it matters: for a run waiting on a human, the latest attempt is always the current stage's, because a pause happens on the stage the cursor sits at. It can lag the displayed stage only for `ready` runs, which persist just between two checkpoint writes, and for completed runs, where nothing is blocked. `cli/README.md` states the rule.

`list` stays read-only: no lock, no settings, no config root, no Git.

### Scripted harness and demo scenarios

`createScriptedInvoker` reports a deterministic, self-evidently synthetic session of the form `scripted-session-<stage-id>-<attempt>` (per `decisions.md` DR8). This exists because a pause block cannot be seeded — it is drawn by a live run, and every demo run goes through the scripted invoker, which contacts no provider. The value's shape is what keeps it honest: `scripted-session-spec-1` cannot be mistaken for a real conversation and nobody will paste it expecting a provider to accept it.

- `cli/scripts/scenarios/04-waiting-for-user.mjs` then renders the `Continue` line with no change to the scenario file itself, since the line follows from the outcome.
- `cli/scripts/scenarios/18-list.mjs` gains `agentSession` in its shared seed shape. Its `expectExit: 0` already forces every seed through the real checkpoint validator, so the seeded field is verified for free.
- No new scenario file is added; the scenario table in `cli/README.md` is updated for whatever its rows now say.
- The capture diagnostic gets **no** scenario: `display.warn` renders one generic yellow `warning: <message>` line, so it is visually identical to any other warning, and identical renderings do not earn separate scenarios. The scripted invoker therefore needs no fabricated-disagreement case.

### Drift guards

Antmay's matcher can silently stop working in two independent ways, and they need different guards (per `decisions.md` DR2).

**Sandcastle-side drift** — Sandcastle changes which shape it maps to a session ID. Guarded in CI by a case in `cli/src/harness/sandcastle.test.ts` that asserts one fixture line per provider *twice over*: that Antmay's matcher extracts the expected ID, and that `codex(model).parseStreamLine(line)` / `claudeCode(model).parseStreamLine(line)` yields a `session_id` event carrying the same value. `parseStreamLine` is part of Sandcastle's public `AgentProvider` interface and needs no provider binary, credentials, or network. This runs inside `npm run check`.

**Provider-side drift** — a provider renames the field, so Antmay *and* Sandcastle both stop finding it and still agree on any fixture. No offline test can detect this, because the fixture encodes the same assumption. Guarded by `cli/src/harness/session-id.manual.ts`, run by a new `npm run verify:session` — `vitest run --config vitest.manual.config.ts` (per `decisions.md` DR10). That new config declares `include: ["src/**/*.manual.ts"]`, `environment: "node"`, and its own `testTimeout`/`hookTimeout` sized for real provider round trips rather than the 30 s default that `cli/vitest.config.ts` budgets for concurrent Git-backed cases. `cli/vitest.config.ts` is not modified: the manual file stays out of `npm test` and `npm run check` because the default config's `include` never matches it, not because an exclusion holds it back, so no later edit can pull live provider calls into the gate by deleting a line. `cli/tsconfig.json` includes all of `src`, so the file is typechecked either way. It holds two independent cases, one per provider — independent so that whoever has only one provider authenticated gets one clear pass and one clear failure rather than an ambiguous half-run. Each invokes `createSandcastleInvoker()` in a throwaway temporary directory with a trivial prompt, `dangerouslySkipPermissions: true` so a no-op prompt cannot hang on an approval, and a short idle timeout. Each asserts that an ID was captured and that the two sources agree, then prints the native resume command for a human to paste. Missing credentials **fail** the case rather than skipping it, because a silent skip is how this guard would rot.

Asserting the last mile — that `codex resume <id>` genuinely reopens the conversation — needs an interactive terminal and stays a human step, pointed at from the manual smoke checklist in `cli/README.md`.

## Constraints

**Toolchain and dependency.** TypeScript, ESM, Node `>=22`, bundled with `tsup`, tested with `vitest` 2.1.9. The sole runtime dependency is `@ai-hero/sandcastle` 0.12.0, pinned. `npm --prefix cli run check` (typecheck + test + build) must pass.

**Test selection is config-only.** Vitest 2.1.9 exposes `-c, --config <path>`, `--dir <path>`, and `--exclude <glob>`, and no `--include`; passing one aborts with `CACError: Unknown option --include`. Positional arguments filter *within* the configured `include` rather than widening it, `--dir` narrows the scan while `include` still applies, and `--exclude` only appends to the resolved exclude list. No command line can reach a file the config's `include` misses, or lift an exclusion the config declares.

**Pre-release policy (`cli/AGENTS.md`).** The checkpoint schema stays at `schemaVersion: 0`. Write no migration, no compatibility shim, no deprecation window. Making existing run directories unreadable is acceptable and should simply be stated in the commit message. A field is optional only when its absence is a real state — which is the case for `agentSession` — never to let previously written state validate.

**Sandcastle invocation shape is otherwise frozen.** `captureSessions: false` for both providers; no `resumeSession`, no `forkSession`, no structured `output`, no retries. Reading raw lines sets no option. Only the single captured result feeds the terminal-outcome gate; the session match never does.

**No Sandcastle type crosses the adapter boundary.** The session reaches the runner as a plain Antmay-owned `{ id: string }`.

**The harness → native-command mapping lives in exactly one module.** It has two consumers (the pause renderer and the manual verifier) and must not be duplicated.

**Exit codes are fixed** (`cli/src/cli/exit-codes.ts`): `0` ok, `1` failure, `2` waiting/paused, `130`/`143`/`129` for signals. None is repurposed. No new exit code appears.

**Help, version, and usage strings stay pure constants** in `cli/src/cli/help.ts` and must not touch config, state, Git, or harnesses. Since no subcommand is added, they change only if a documented behavior of an existing subcommand changes.

**Dynamic-import discipline** is preserved: the Node guard, dispatch, and per-command dependency loading stay lazy.

**Concurrent test files.** `commands/resume.test.ts`, `commands/run.test.ts`, and `runner/runner.test.ts` use `describe.concurrent`. Any new case in them allocates through the existing helpers and registers **no** teardown of its own — no `afterEach`, no `onTestFinished`.

**Every distinct terminal rendering has a demo scenario** (`cli/AGENTS.md`). Two new renderings arrive here; both must be reachable, per the scenario section above.

**Platform:** macOS only for v0.

## Acceptance criteria

### FR-1 — The adapter captures a provider session ID from the raw stream

*Enforces `decisions.md` DR1.*

- **AC-1.1** Given a Codex raw line `{"type":"thread.started","thread_id":"X"}`, the adapter's matcher yields `X`.
- **AC-1.2** Given a Claude Code raw line `{"type":"system","subtype":"init","session_id":"X"}`, the matcher yields `X`.
- **AC-1.3** Given raw lines that are not JSON, are JSON of another shape, or are JSON missing the ID field, the matcher yields nothing and throws nothing.
- **AC-1.4** Given two matching lines with different IDs in one attempt, the first is retained.
- **AC-1.5** When Sandcastle's `iterations` value and the matched value are both present, the outcome's `session.id` equals **Sandcastle's**.
- **AC-1.6** When Sandcastle's `run()` rejects with an idle timeout, a provider error, or an abort, and a matching line was seen, the returned failed outcome still carries `session.id`.
- **AC-1.7** When no matching line was seen and Sandcastle supplied nothing, the outcome carries no `session`.
- **AC-1.8** `buildSandcastleRunOptions` still yields `captureSessions: false` for both providers and sets no `resumeSession`, `forkSession`, `output`, or retry option.

### FR-2 — Capture drift produces exactly one warning

*Enforces `decisions.md` DR1 and DR7.*

- **AC-2.1** Both sources present and different → `sessionWarning` is set and `session.id` is Sandcastle's value.
- **AC-2.2** Sandcastle present, matcher found nothing → `sessionWarning` is set and `session.id` is Sandcastle's value.
- **AC-2.3** Matcher present, Sandcastle absent → no `sessionWarning`.
- **AC-2.4** Neither present → no `sessionWarning` and no `session`.
- **AC-2.5** For an attempt whose outcome carries `sessionWarning`, the runner calls `display.warn` exactly once with that string verbatim, on every settle path (advance, DONE-pause, non-DONE pause, interruption).

### FR-3 — `AttemptOutcome` states that a session is independent of the result

*Enforces `decisions.md` DR7.*

- **AC-3.1** `AttemptOutcome` is an object with optional `session`, optional `sessionWarning`, and a required `result` holding the unchanged `completed`/`failed` union.
- **AC-3.2** Classification depends only on the outcome's `result`: no classification path reads `session` or `sessionWarning`.
- **AC-3.3** `npm --prefix cli run check` passes: no type errors, no failing tests, no unmigrated call site.

### FR-4 — The session is durable on the attempt record

*Enforces `decisions.md` DR4.*

- **AC-4.1** An attempt whose outcome carried a session persists `agentSession: { harness, id }`, for each of `result: "done"`, `"waiting"`, and `"interrupted"`.
- **AC-4.2** An attempt whose outcome carried no session persists no `agentSession`; a pre-launch interruption, which never invoked the harness, is one such case.
- **AC-4.3** `validateAttempt` accepts an absent `agentSession`; rejects a non-object, an unknown `harness`, a missing `harness`, an empty `id`, and a non-string `id`, each with a message naming the offending path.
- **AC-4.4** The persisted `harness` equals the harness of the snapshotted stage profile that ran the attempt.
- **AC-4.5** A checkpoint written by this version still declares `schemaVersion: 0`, and the validator still rejects any other value with its existing no-migration message.
- **AC-4.6** Read mid-attempt (before the harness call resolves), the persisted executing attempt record carries no `agentSession`.

### FR-5 — The pause block offers the native command

*Enforces `decisions.md` DR5 and DR3.*

- **AC-5.1** A pause on a Codex attempt carrying session `X` renders an action line keyed `Continue` whose value is exactly `codex resume X`.
- **AC-5.2** The same on Claude Code renders exactly `claude --resume X`.
- **AC-5.3** A pause on an attempt carrying no session renders no `Continue` line.
- **AC-5.4** A pause taken before any attempt was allocated renders neither a `Continue` line nor a `Log` line.
- **AC-5.5** Every pause block containing a `Continue` line also states the clean-worktree precondition for `antmay afk resume`.
- **AC-5.6** The block renders identically for a session ID that matches no transcript on disk, and rendering performs no filesystem access.
- **AC-5.7** The `runFailed` and `runInterrupted` blocks are byte-for-byte unchanged.

### FR-6 — `antmay afk list` shows the run's most recent session

*Enforces `decisions.md` DR6.*

- **AC-6.1** A run whose latest session-carrying attempt used Codex with ID `X` renders a column `codex/X`.
- **AC-6.2** A run no attempt of which carried a session renders no session column value.
- **AC-6.3** A completed run's row renders the column, even though it omits stage and `harness/model`.
- **AC-6.4** When several attempts across several stages carry sessions, the rendered value is the last such attempt in the record order.
- **AC-6.5** `list` still acquires no lock and reads no settings, config root, or Git state.

### FR-7 — Both new renderings are demo-reachable

*Enforces `decisions.md` DR8.*

- **AC-7.1** The scripted invoker returns `session.id` of the form `scripted-session-<stage-id>-<attempt>`.
- **AC-7.2** `npm run demo` with `04-waiting-for-user` exits `2` and its pause block contains the `Continue` line.
- **AC-7.3** `npm run demo` with `18-list` exits `0` and its table shows the session column, the seeds having passed the real checkpoint validator.
- **AC-7.4** No scenario file is added, and the scenario table in `cli/README.md` matches what the scenarios now end on.

### FR-8 — Both drift guards exist and work

*Enforces `decisions.md` DR2.*

- **AC-8.1** A case in `cli/src/harness/sandcastle.test.ts` asserts, per provider and on one shared fixture line, both that Antmay's matcher extracts the ID and that Sandcastle's `parseStreamLine` yields a `session_id` event with the same value. It requires no network, credentials, or provider binary.
- **AC-8.2** `npm test` and `npm run check` do not collect `session-id.manual.ts`; `npm run verify:session` does. `cli/vitest.config.ts` is unchanged, so the exclusion holds by non-match rather than by an exclude rule.
- **AC-8.3** Each manual case fails, rather than skipping, when its provider's credentials are absent.
- **AC-8.4** Each manual case asserts that an ID was captured and that the two sources agree, then prints the provider's native resume command.

### FR-9 — Documentation reflects the change and no other thread is touched

*Enforces `decisions.md` DR9.*

- **AC-9.1** No file under `docs/threads/260723121015Z-afk-workflow-executor/` is modified.
- **AC-9.2** `cli/README.md` documents the `list` session column and its selection rule, points the manual smoke checklist at `npm run verify:session`, and has an accurate scenario table.
- **AC-9.3** `cli/AGENTS.md` lists `npm run verify:session` among its toolchain commands and records the scripted invoker's synthetic session in its scripted-harness section. Its command-surface description is unchanged.
- **AC-9.4** Any reference to the earlier executor thread uses the full repo-relative thread path and is removable without leaving an incomplete sentence.

## Degrees of freedom

The *what* above is pinned. These *hows* are deliberately left to the implementer — each satisfies every AC unchanged, changes nothing a reader of the terminal would weigh in on, and is reversible without revising this spec:

- **Where the harness → native-command mapping lives**, provided it lives in exactly one module (see Constraints) and both consumers use it.
- **How the raw-line matcher is factored** — a helper function, a closure over the attempt, or a small stateful object — and whether it is exported, provided AC-8.1 can call it.
- **Where the `display.warn` call sits** in the runner relative to classification and persistence, provided AC-2.5 holds on every settle path.
- **Whether the classifier receives the whole outcome or only its `result`**, provided AC-3.2 holds.
- **The exact prose of the capture diagnostic** and of the clean-worktree caution, provided each states what FR-2 and AC-5.5 require.
- **The session column's position** in the `list` row's column order.
- **The trivial prompt text, temporary-directory strategy, idle timeout, and timeout budget** of the manual verifier.
- **Test file organization** for the new cases, subject to the concurrent-file constraint above.

Not free, and worth restating because each is pinned above rather than left to the implementer: the `Continue` key label and the two command spellings; `agentSession`'s field names and its optionality; `schemaVersion: 0`; the `<harness>/<session-id>` column format and the most-recent-attempt selection rule; the `scripted-session-<stage-id>-<attempt>` form; Sandcastle's precedence over the matcher on the resolve path; and `npm run verify:session` selecting the manual verifier through its own `vitest.manual.config.ts` while `cli/vitest.config.ts` stays untouched.

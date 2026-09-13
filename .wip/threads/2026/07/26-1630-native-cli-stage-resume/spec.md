# Native continuation of AFK harness sessions

## Intended outcome

When an AFK stage launches Codex or Claude Code, Antmay captures the native
provider session ID, saves it on the stage attempt, and gives the user a
paste-ready command for reopening that conversation in the provider CLI.
Capturing the ID while the attempt is still executing makes the conversation
recoverable even when the Antmay process is later killed or abandoned.

This feature exposes provider-session identity; it does not make the provider
conversation part of Antmay's execution state. `antmay afk resume <run-id>`
continues the checkpointed pipeline, while `codex resume <session-id>` or
`claude --resume <session-id>` opens the provider conversation in a human's
terminal.

## Context

Sandcastle already receives the provider session identity and exposes a
normalized `session_id` event from its provider parser. It also returns a
session ID after a successful invocation. Antmay currently retains the verbose
provider stream in the attempt log but discards this identity, leaving a user
to extract it manually.

The motivating case is a stage that completes its work but leaves a pending
decision. Antmay pauses, the user reopens the same conversation that produced
the work, resolves or investigates the issue there, deliberately commits or
reverts any resulting repository changes, and then returns to the pipeline with
`antmay afk resume`.

## Scope

This work includes:

- provider-neutral live session discovery through Sandcastle;
- session identity on completed and failed harness outcomes;
- immediate and settlement-time checkpoint persistence;
- a native continuation command on attempt-backed pause renderings;
- the latest captured session in `antmay afk list`;
- checkpoint validation, deterministic automated coverage, demo coverage, and
  living CLI documentation.

This work does not:

- enable Sandcastle-managed session capture or copy native transcripts;
- pass a resume or fork session into a harness invocation;
- make a resumed Antmay stage reuse a previous provider conversation;
- launch a provider CLI or add an `antmay afk session` subcommand;
- inspect provider-private transcript storage or guarantee that a transcript
  still exists;
- add a complete per-attempt session browser;
- change queue resolution, stage advancement, exit codes, workspace locking,
  or the existing clean-worktree enforcement and error text.

Historical thread artifacts outside this thread remain untouched (the relevant
earlier executor thread is
`docs/threads/260723121015Z-afk-workflow-executor/`). Every stage attempt,
including an attempt started by `antmay afk resume`, remains a fresh harness
conversation; native continuation is an out-of-band human action (per
`decisions.md` DR9).

## Behavioral contract

### Session discovery and harness result

For each real attempt, the Sandcastle adapter constructs one provider instance
and uses that same instance as the run's agent and as the parser for raw stream
lines. Every raw line is passed to the provider's public
`parseStreamLine(line)`. Antmay retains the first normalized `session_id` with
a non-empty ID and does not implement Codex- or Claude-specific JSON parsing
(per `decisions.md` DR15).

The harness request has an optional `onSessionCaptured` callback alongside
`onEvent`. The adapter calls it once with `{ id }` when the first live session
is discovered. Session metadata is executor information, so it does not enter
the `HarnessEvent` stream rendered as agent output (per `decisions.md` DR13 and
DR17). Every invoker seam accepts the callback; test fakes may ignore it or
invoke it when a test needs to model live capture.

`AttemptOutcome` remains the existing `completed` / `failed` discriminated
union and gains an optional `session?: { id: string }` shared by both variants.
Consumers continue to classify with `outcome.kind`; there is no nested result
and no session-capture diagnostic member (per `decisions.md` DR17).

The first live ID is the attempt's session on both successful and failed
outcomes. If a run resolves without a live ID,
`result.iterations.at(-1)?.sessionId` is the settlement-only fallback. Antmay
does not compare independently parsed values or emit a parser-disagreement
warning (per `decisions.md` DR15).

### Durable session identity

An attempt record optionally carries:

```ts
agentSession?: {
  id: string;
}
```

The field is absent when no session was captured, including an interruption
before the harness launches. When present, `id` is a non-empty string.
`schemaVersion` remains `0`; no migration or compatibility layer is introduced.
The attempt does not duplicate its harness because that value is already
authoritative in
`checkpoint.stages[attempt.stageIndex].profile.harness`
(per `decisions.md` DR4 and DR22).

The first live capture starts exactly one provisional checkpoint write. That
write adds `agentSession` to the current `executing` attempt without changing
the attempt result or run condition. Its promise is retained, and no later
checkpoint write for the attempt may overlap it. Once the harness settles, the
runner observes the provisional write before any interruption or ordinary
settlement checkpoint write begins (per `decisions.md` DR16).

Every settlement path includes the captured session again, whether the attempt
completed, failed, timed out, or was aborted. A session available only from the
resolved-result fallback is written at settlement and causes no provisional
write (per `decisions.md` DR4, DR15, and DR16).

If the provisional write fails, Antmay emits one warning and lets the harness
continue. The final settlement write retries persistence through the ordinary
checkpoint path; failure there retains the existing fatal checkpoint behavior.
There is no retry loop, harness cancellation, or durable warning field
(per `decisions.md` DR21).

Consequently, a successful provisional write leaves a killed process's
checkpoint in the normal `executing` recovery state with the native session ID
already attached. The verbose attempt log remains the emergency manual
recovery source when early persistence fails.

### Native continuation command

One Antmay-owned helper maps a harness and opaque session ID to a POSIX-safe
native command. It produces:

```text
codex resume '<quoted-id>'
claude --resume '<quoted-id>'
```

The helper shell-quotes every ID, including IDs containing a single quote.
Every Antmay surface that presents a native continuation command uses this
helper. Antmay performs no transcript-existence check before showing the
command (per `decisions.md` DR5 and DR20).

The pause action section shows a `Continue` line exactly when the attempt that
the pause concerns has a persisted `agentSession`. The ID comes from that
attempt; the harness comes from its snapshotted stage profile. The line appears
for pauses drawn immediately by the runner and for the same pauses later
re-rendered by `antmay afk resume`. A pause that has no associated attempt, or
whose attempt has no session, has no `Continue` line. Existing `Log` and
`Resume` behavior remains intact. The command's binary identifies the harness,
so no separate harness-name label is rendered (per `decisions.md` DR5, DR11,
and DR22).

### Run listing

Each valid `antmay afk list` row includes the most recent attempt in that run
that carries `agentSession`, rendered as
`<snapshotted-harness>/<session-id>`. The harness is resolved through that
attempt's `stageIndex`. The value is omitted when no attempt captured a
session. This selection rule also applies to executing and completed runs; it
does not imply that the selected session belongs to the run's currently
displayed stage. A complete per-attempt session view belongs with a future
broader rework of the command's output (per `decisions.md` DR6 and DR22).

### Scripted behavior and documentation

The scripted invoker reports a deterministic session
`scripted-session-<stage-id>-<attempt>` through the live callback and on its
outcome. Existing demo scenario `04-waiting-for-user` displays the native
continuation line without scenario-specific setup, and `18-list` seeds the
ID-only attempt shape and displays the latest-session column. No separate demo
scenario is needed for these renderings (per `decisions.md` DR8 and DR22).

`cli/README.md` documents the native-session journey, the `list` selection
rule, and a concise human-run smoke check against whichever real provider is
configured. The check confirms that an executing checkpoint receives the ID,
pastes the printed native command, verifies that the same conversation opens,
and reminds the user to commit or revert conversation-made changes before
running `antmay afk resume`. Its scenario table accurately describes the
updated renderings (per `decisions.md` DR6, DR18, and DR19).

`cli/AGENTS.md` records the scripted invoker's synthetic session behavior.
There is no credential-dependent test file, `npm run verify:session` script, or
second Vitest configuration for this feature (per `decisions.md` DR18).

## Constraints

- Use Sandcastle's provider parser as the sole authority for provider wire
  formats; Antmay owns no duplicate Codex or Claude session matcher
  (per `decisions.md` DR15).
- Keep `captureSessions: false`, pass neither `resumeSession` nor
  `forkSession`, and start every stage attempt as a fresh conversation
  (per `decisions.md` DR9).
- Keep raw provider JSON in the verbose attempt log and out of the curated
  `HarnessEvent` display stream (per `decisions.md` DR17).
- Preserve the checkpoint's atomic-write behavior and explicitly order the new
  provisional write before later writes; atomic replacement alone is not an
  ordering guarantee (per `decisions.md` DR16).
- Treat the provider ID as an opaque, non-empty string. Do not validate a
  provider-specific ID grammar or inspect provider-local transcript paths
  (per `decisions.md` DR20).
- Keep the CLI command surface at `run`, `resume`, and `list`. Native
  continuation never changes Antmay's checkpoint by itself
  (per `decisions.md` DR6 and DR9).
- Add no pause-time clean-worktree caution or shared rendering predicate.
  Existing `resume` enforcement remains authoritative; the journey is
  documented in `cli/README.md` (per `decisions.md` DR19).
- Keep automated tests deterministic and free of real provider credentials and
  paid model calls. `npm --prefix cli run check` remains the complete automated
  gate (per `decisions.md` DR18).

## Acceptance criteria

The decision citations on each functional requirement govern all acceptance
criteria nested beneath it.

### FR-1 — Capture a provider-neutral session identity

Source: `decisions.md` DR13, DR15, and DR17.

- **AC-1.1** A raw line that the attempt's Sandcastle provider parses into
  `{ type: "session_id", sessionId: "S" }` causes the adapter to retain `S`
  without any provider-specific JSON matcher.
- **AC-1.2** When several normalized session events are observed, the live
  callback is invoked exactly once and both completed and failed outcomes carry
  the first ID.
- **AC-1.3** A resolved run with no live ID but with a final iteration session
  ID carries that ID on its completed outcome without invoking the live
  callback or starting provisional persistence.
- **AC-1.4** `AttemptOutcome` is still directly discriminated by `kind`,
  `HarnessEvent` has no session variant, and no `sessionWarning` or
  capture-source comparison exists.

### FR-2 — Persist captured identity without stale-write races

Source: `decisions.md` DR4, DR16, DR21, and DR22.

- **AC-2.1** Checkpoint validation accepts an attempt with no `agentSession` and
  one with `{ "agentSession": { "id": "S" } }`, and rejects a present session
  whose `id` is missing, non-string, or empty.
- **AC-2.2** The first live capture starts one checkpoint write that leaves the
  run and attempt `executing`, preserves the other semantic state, and adds the
  ID-only `agentSession`. Later session events start no additional provisional
  writes.
- **AC-2.3** A controlled test in which the provisional write remains pending
  proves that no settlement checkpoint write starts until it resolves; after
  both complete, `state.json` contains the settled condition and attempt rather
  than stale `executing` state.
- **AC-2.4** Completed, provider-error, idle-timeout, and post-launch
  interruption settlement paths retain a captured session on the attempt.
- **AC-2.5** A failed provisional write emits one warning, does not abort the
  harness, and is followed by a settlement write that includes the session.
  Failure of that settlement write follows the existing fatal checkpoint path.
- **AC-2.6** Checkpoints written by this implementation still declare
  `schemaVersion: 0`, with no migration or compatibility code.

### FR-3 — Present a safe native continuation command

Source: `decisions.md` DR5, DR11, DR20, and DR22.

- **AC-3.1** Command-composition tests prove that Codex renders
  `codex resume 'S'`, Claude Code renders `claude --resume 'S'`, and an ID
  containing a single quote is encoded as one POSIX-safe shell argument.
- **AC-3.2** Every attempt-backed pause with a persisted session renders one
  `Continue` line using that attempt's ID and its snapshotted stage harness,
  both when initially paused and when re-rendered by `antmay afk resume`,
  without a separate harness-name label.
- **AC-3.3** A pause without an attempt or without `agentSession` renders no
  `Continue` line and preserves its existing `Log` and `Resume` lines.
- **AC-3.4** Producing the command performs no provider-transcript filesystem
  lookup and does not launch a provider process.

### FR-4 — Make a lost session discoverable from `list`

Source: `decisions.md` DR6 and DR22.

- **AC-4.1** A run with multiple session-carrying attempts renders only the
  latest one's `<harness>/<session-id>`, deriving the harness from that
  attempt's snapshotted stage.
- **AC-4.2** `ready`, `executing`, `waiting-for-user`, and `completed`
  checkpoints can render the selected session, while a run with no captured
  session renders no session value.

### FR-5 — Cover the feature deterministically

Source: `decisions.md` DR8 and DR18.

- **AC-5.1** The scripted invoker reports exactly
  `scripted-session-<stage-id>-<attempt>` through `onSessionCaptured` and its
  returned outcome.
- **AC-5.2** Demo scenario `04-waiting-for-user` visibly exercises the
  `Continue` line, and `18-list` visibly exercises the latest-session value
  using the ID-only checkpoint shape; both declare and produce their expected
  exit codes.
- **AC-5.3** Automated tests cover first-ID selection, successful and failed
  outcomes, fallback capture, validation, ordered persistence, early-write
  failure, command quoting, pause re-rendering, and list selection.
- **AC-5.4** `npm --prefix cli run check` passes without credentials, paid
  model calls, a manual test file, a `verify:session` package script, or a
  feature-specific Vitest configuration.

### FR-6 — Preserve the execution boundary and document the journey

Source: `decisions.md` DR6, DR9, DR18, and DR19.

- **AC-6.1** Real harness construction still sets `captureSessions: false`,
  supplies no resume/fork session option, and every new or resumed stage
  attempt starts a fresh provider conversation.
- **AC-6.2** The CLI exposes no fourth subcommand and never launches the native
  provider CLI as part of `run`, `resume`, or `list`.
- **AC-6.3** Existing `resume` queue resolution, clean-worktree validation,
  error text, and exit codes are unchanged, and pause rendering adds no
  clean-worktree caution.
- **AC-6.4** No historical thread artifact outside this thread is changed (the
  relevant earlier executor thread is
  `docs/threads/260723121015Z-afk-workflow-executor/`).
- **AC-6.5** `cli/README.md` documents the native-session journey, latest-session
  list rule, real-provider smoke check, clean-worktree instruction, and updated
  scenario renderings.
- **AC-6.6** `cli/AGENTS.md` describes the scripted session ID emitted by the
  developer-only invoker and does not add a live-provider verification command.

## Coverage and traceability

| Expected behavior | Covered by |
| --- | --- |
| Sandcastle-owned parsing and provider-neutral outcome | FR-1 |
| Early, ordered, recoverable checkpoint persistence | FR-2 |
| Paste-ready pause command on initial and resumed renderings | FR-3 |
| Latest-session recovery after terminal history is lost | FR-4 |
| Deterministic unit, integration, and demo evidence | FR-5 |
| Unchanged executor semantics and accurate living documentation | FR-6 |

## Degrees of freedom

- The TypeScript expression used to share the optional `session` member across
  the two `AttemptOutcome` variants is open, provided `outcome.kind` remains
  the direct discriminant and the public shape satisfies FR-1.
- The module name and location of the native-command helper, and whether callers
  pass a composed optional command or session context into the display layer,
  are open provided every command is produced by one helper from persisted
  attempt identity plus the snapshotted harness.
- The exact prose of the single provisional-write warning is open provided it
  clearly identifies the failed early persistence and the attempt continues.
- Test-double, fixture, and deferred-promise organization is open provided the
  observable ordering, persistence, rendering, and fallback cases above are
  proven and the standard check remains deterministic.

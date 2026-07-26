# Expose provider session IDs so AFK stages can be continued in the native Codex/Claude Code CLIs

The source of this thread is a handoff document produced by a research session on 2026-07-26. That session investigated whether a person can reopen the Codex or Claude Code conversation that Sandcastle used for an `antmay afk` stage — motivated by a `spec` stage that emits `Outcome: DONE` while leaving pending decisions, which the user would rather resolve inside the same conversation that authored the spec, using the provider's native interactive CLI. The research found this is technically possible for both providers (`codex resume <session-id>` and `claude --resume <session-id>`), that Sandcastle already surfaces the provider session ID on `RunResult.iterations[n].sessionId`, and that Antmay currently discards it and persists no provider-session reference in its checkpoint. The intended outcome of this thread is to decide and implement how Antmay exposes and durably records provider-session identity — while keeping the Antmay workflow-resumption semantics (`antmay afk resume <run-id>`) separate from reopening a provider conversation. No implementation changes were made during the research; the working tree was clean and no commits were created.

The handoff document is reproduced verbatim below:

<handoff-document source="temp/native-cli-stage-resume.md">
# Handoff: continue Antmay AFK agent sessions in native CLIs

## Objective

Investigate whether a person can reopen the Codex or Claude Code conversation used by Sandcastle for an `antmay afk` stage.

The motivating case is a `spec` stage that emits `Outcome: DONE` but leaves pending decisions. The user would like to resolve those decisions in the same conversation that authored the spec, using the provider’s native interactive CLI.

No implementation changes have been made.

## Bottom line

Yes, this is technically possible for both providers.

- Codex can reopen the conversation with:

  ```sh
  codex resume <session-id>
  ```

- Claude Code can reopen it with:

  ```sh
  claude --resume <session-id>
  ```

- Sandcastle 0.12.0 already extracts the provider session ID and returns it as `RunResult.iterations[n].sessionId`.
- Antmay currently discards that field and does not persist a provider-session reference in its checkpoint.
- Because Antmay uses Sandcastle’s `noSandbox()`, the provider CLIs run directly on the host and save their native session transcripts normally.
- Antmay’s `captureSessions: false` disables Sandcastle-managed session copying. It does not pass Codex’s `--ephemeral` option or Claude Code’s `--no-session-persistence` option.
- Antmay enables verbose raw logging, so existing attempt logs already contain the event carrying the session ID.

The missing functionality is therefore mainly Antmay UX and durable metadata, not provider or Sandcastle support.

## Current Antmay behavior

The relevant adapter is:

```text
cli/src/harness/sandcastle.ts
```

`buildAgent()` explicitly passes `captureSessions: false` to both `codex()` and `claudeCode()`.

This implements the original V0 decisions recorded in:

```text
docs/threads/260723121015Z-afk-workflow-executor/decisions.md
```

In particular, DR7 and DR39 say that agent-session capture and resumption are disabled and that every workflow-stage invocation starts a fresh agent conversation.

After Sandcastle finishes, `createSandcastleInvoker()` currently returns only:

```ts
{ kind: "completed", finalText: result.stdout }
```

It does not preserve:

```ts
result.iterations.at(-1)?.sessionId
```

Consequently:

- `AttemptOutcome` in `cli/src/harness/types.ts` has no session field.
- `AttemptRecord` in `cli/src/state/checkpoint.ts` has no session field.
- `state.json` does not identify the native conversation.
- `antmay afk list` and terminal output cannot show how to reopen it.

This is separate from Antmay workflow resumption:

- `antmay afk resume <run-id>` resumes the durable workflow checkpoint.
- `codex resume <session-id>` or `claude --resume <session-id>` resumes the provider conversation.

These identities and operations should not be conflated.

## Why the native sessions still exist

Sandcastle’s pinned provider integrations launch approximately:

- Codex through `codex exec --json ...`
- Claude Code through `claude --print --output-format stream-json ...`

With Antmay’s current options, neither command disables the provider’s native session persistence.

Sandcastle extracts:

- Codex:

  ```json
  {
    "type": "thread.started",
    "thread_id": "<session-id>"
  }
  ```

- Claude Code:

  ```json
  {
    "type": "system",
    "subtype": "init",
    "session_id": "<session-id>"
  }
  ```

Sandcastle documents `IterationResult.sessionId` separately from `sessionFilePath`:

- `sessionId` comes from the provider event stream.
- `sessionFilePath` is absent when Sandcastle-managed capture is disabled.

Since Antmay uses `noSandbox()`, the native subprocess writes directly into the host’s normal provider storage:

- Codex:

  ```text
  ~/.codex/sessions/YYYY/MM/DD/rollout-*-<session-id>.jsonl
  ```

- Claude Code:

  ```text
  ~/.claude/projects/<encoded-project-path>/<session-id>.jsonl
  ```

If Antmay later moves to an isolated sandbox, this assumption will change. It would then need Sandcastle session capture or another transcript-transfer mechanism.

## Recover a session ID from an existing attempt

Find the attempt log from the run’s `state.json` under `attempts[].logPath`, or use the log path printed by Antmay.

The log starts with non-JSON Antmay header lines. The commands below use `jq -Rr` and `fromjson?` to ignore them.

### Codex

```sh
SESSION_ID=$(
  jq -Rr '
    fromjson?
    | select(.type == "thread.started")
    | .thread_id
  ' /absolute/path/to/attempt.log | head -1
)

codex resume "$SESSION_ID"
```

Codex also supports non-interactive continuation:

```sh
codex exec resume "$SESSION_ID" "Follow-up instruction"
```

Sandcastle-created sessions originate from `codex exec`, so they may be hidden from the ordinary interactive picker. The current Codex CLI can include them with:

```sh
codex resume --include-non-interactive
```

Direct resume by ID does not depend on the picker.

Official documentation:

- https://learn.chatgpt.com/docs/developer-commands?surface=cli#cli-codex-resume
- https://learn.chatgpt.com/docs/developer-commands?surface=cli#cli-codex-exec

### Claude Code

```sh
SESSION_ID=$(
  jq -Rr '
    fromjson?
    | select(.type == "system" and .subtype == "init")
    | .session_id
  ' /absolute/path/to/attempt.log | head -1
)

claude --resume "$SESSION_ID"
```

Claude’s official documentation explicitly says that sessions created with `claude -p` or the Agent SDK do not appear in the session picker but can still be resumed directly by ID. That matches Sandcastle’s print-mode invocation.

Official documentation:

- https://code.claude.com/docs/en/sessions
- https://code.claude.com/docs/en/cli-usage
- https://code.claude.com/docs/en/headless

## Intended user journey

1. Antmay runs the `spec` stage through Codex or Claude Code.
2. The agent emits `Outcome: DONE`.
3. A `.pending-decisions/` bundle exists.
4. Antmay pauses at its post-attempt queue gate.
5. Antmay shows the provider session ID and native resume command.
6. The user opens the same conversation:

   ```sh
   codex resume <session-id>
   ```

   or:

   ```sh
   claude --resume <session-id>
   ```

7. In that conversation, the user invokes `resolve-pending-decisions`.
8. The decisions are appended to `decisions.md`, the pending bundle is consumed, and any accepted follow-up is performed.
9. The user returns to the orchestrator:

   ```sh
   antmay afk resume <run-id>
   ```

Under the current checkpoint semantics, the final command may start a fresh attempt of the paused stage. Reopening the provider conversation does not itself update Antmay’s checkpoint or mark the stage finalized.

## Recommended minimal product change

Expose and persist provider-session identity while leaving Antmay workflow-resumption semantics unchanged.

### 1. Extend the harness result

For example:

```ts
export type AttemptOutcome =
  | {
      kind: "completed";
      finalText: string;
      sessionId?: string;
    }
  | {
      kind: "failed";
      category: "idle-timeout" | "aborted" | "provider-error";
      errorClass: string;
      errorMessage: string;
    };
```

In `createSandcastleInvoker()`:

```ts
const result = await run(buildSandcastleRunOptions(request));

return {
  kind: "completed",
  finalText: result.stdout,
  sessionId: result.iterations.at(-1)?.sessionId,
};
```

### 2. Persist the reference on the attempt

A possible provider-neutral checkpoint shape:

```ts
agentSession?: {
  harness: "codex" | "claude-code";
  id: string;
};
```

The harness is already present in the snapshotted stage profile, but storing it with the ID makes the attempt record more self-contained.

The checkpoint validator must validate the optional field.

A deliberate decision is needed about whether this additive field:

- remains compatible with `schemaVersion: 1`, or
- requires a new checkpoint schema and migration policy.

### 3. Display the native resume command

When an attempt pauses or completes:

```text
Continue agent conversation:
  codex resume <id>
```

or:

```text
Continue agent conversation:
  claude --resume <id>
```

### 4. Consider a dedicated command

For example:

```sh
antmay afk session <run-id>
```

Possible behaviors:

- Print the native command only.
- Launch the native interactive CLI.
- Support an explicit attempt selector when a run has multiple attempts.

The selection rule must be defined. Possible defaults include:

- Latest attempt in the run.
- Latest attempt for the current stage.
- No default: require an attempt number when ambiguous.

## Recommended semantic boundary

Keep these operations separate:

- Opening or continuing an agent conversation.
- Resuming an Antmay workflow.

Do not make `antmay afk resume` silently reuse the previous provider session as part of the minimal feature.

That larger change would reverse DR7 and DR39 and introduce several new concerns:

- Transcript retention and deletion.
- Provider-specific recovery failures.
- Interrupted versus completed attempts.
- Model changes between attempts.
- Multiple attempts and session selection.
- Checkpoint portability between machines.
- Coupling durable workflow recovery to provider-local files.

An explicit future option for provider-session reuse could be designed separately.

## Questions to settle before implementation

1. Is the feature only about discovering and opening the conversation, or should Antmay reuse that session when retrying a stage?
2. Should `antmay afk session` print a command or launch the interactive CLI?
3. Which attempt should it select when a run contains several sessions?
4. Should session metadata be stored for:
   - successful attempts,
   - paused attempts,
   - failed attempts,
   - or every attempt where Sandcastle emitted an ID?
5. What should happen if the native transcript has expired or been deleted?
6. Should Antmay verify transcript existence, or treat the provider ID as an opaque reference?
7. Does adding an optional checkpoint field require `schemaVersion: 2`?
8. Should DR7 and DR39 be superseded only for session exposure while preserving fresh-conversation retries?
9. After a native conversation resolves pending decisions, should `antmay afk resume` rerun the paused stage or provide a way to finalize/advance it without rerunning?

## Likely implementation files

```text
cli/src/harness/sandcastle.ts
cli/src/harness/types.ts
cli/src/state/checkpoint.ts
cli/src/runner/runner.ts
cli/src/display/types.ts
cli/src/display/terminal.ts
```

If adding a command:

```text
cli/src/cli/parse.ts
cli/src/cli/help.ts
cli/src/program.ts
cli/src/commands/<new-command>.ts
```

Also update:

```text
cli/README.md
```

If the behavior changes product semantics rather than merely exposing metadata, update or supersede the relevant records in:

```text
docs/threads/260723121015Z-afk-workflow-executor/decisions.md
docs/threads/260723121015Z-afk-workflow-executor/spec.md
```

Add focused tests adjacent to every changed module and run:

```sh
npm --prefix cli run check
```

## Evidence map

- Current capture policy and discarded result:

  ```text
  cli/src/harness/sandcastle.ts
  ```

- Current provider-neutral result:

  ```text
  cli/src/harness/types.ts
  ```

- Current attempt/checkpoint schema:

  ```text
  cli/src/state/checkpoint.ts
  ```

- Attempt-log handling:

  ```text
  cli/src/state/logs.ts
  ```

- Original session decisions:

  ```text
  docs/threads/260723121015Z-afk-workflow-executor/decisions.md
  ```

  Relevant records: DR7 and DR39.

- Original specification constraints:

  ```text
  docs/threads/260723121015Z-afk-workflow-executor/spec.md
  ```

- Pinned Sandcastle behavior:

  ```text
  cli/node_modules/@ai-hero/sandcastle/README.md
  cli/node_modules/@ai-hero/sandcastle/dist/index.js
  ```

Relevant Sandcastle README sections:

- `IterationResult`
- `Session capture`
- `Session resume`
- `ClaudeCodeOptions`
- `CodexOptions`

## Repository state at handoff

- Research date: 2026-07-26.
- Repository:

  ```text
  /Users/jacopo/Developer/projects/personal/tools/antmay.feat-afk-orchestrator
  ```

- No implementation changes were made.
- No commits were created.
- The working tree was clean after the research.
</handoff-document>

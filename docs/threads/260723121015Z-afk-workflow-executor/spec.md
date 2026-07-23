# Spec: AFK Workflow Executor CLI (v0)

Decision citations of the form `(DR<N>)` refer to the settled records in `decisions.md`. Where a later record supersedes part of an earlier one, this spec states only the surviving rule.

## Intended outcome

A working v0 of the **AFK workflow executor**: a strict, non-interactive `antmay afk` CLI, shipped as a self-contained Node/TypeScript package under `cli/` in this repository, that executes the built-in six-stage `standard` recipe — `spec`, `reconcile-spec`, `review-spec`, `plan-strict`, `reconcile-plan`, `implement-plan-with-subagents` — unattended against one explicitly selected active thread, through either Codex or Claude Code (DR4, DR6, DR17).

When implemented, the user can:

1. hand-author one global `settings.json` choosing a harness and model per stage (DR12, DR14, DR32);
2. run `antmay afk run standard --thread <target>` and walk away (DR45);
3. return to either a fully completed recipe — every positively completed stage's declared artifacts committed with a deterministic message (DR49, DR50) — or a durably paused run whose stored reason, pending-bundle paths, log path, and exact resume command are printed and persisted (DR2, DR41, DR43);
4. resume the paused run later, from any terminal, with `antmay afk resume <run-id>` (DR2, DR36); and
5. discover all runs across repositories with `antmay afk list` (DR15, DR38).

A stage advances only on positive evidence: successful harness completion, an authoritatively parsed `Outcome: DONE` final line, empty `.pending-decisions/` and `.pending-reviews/` queues, and a satisfied per-stage Git boundary (DR3, DR29, DR50). Everything else pauses the run without losing work.

## Context

The Modular Agentic Workflow carries a unit of work through completion-oriented skills that a person normally invokes one at a time, watching each `Outcome:` line and resolving `.pending-decisions/` and `.pending-reviews/` bundles between invocations. `seed.md` opens this thread to remove the human dispatcher from the successful path: build a CLI that runs the predefined Standard-oriented sequence unattended, continuing through successful steps and stopping only when an `Outcome:` reports an issue or a pending bundle requests human attention.

`seed.md` also asked whether `.library/sources/mattpocock_sandcastle` is the right foundation for harness integration, sandboxing, and orchestration. That evaluation is settled: v0 depends on Sandcastle, pinned to the exact validated version `0.12.0`, and uses only its public `run`, `codex`, `claudeCode`, and `noSandbox` APIs behind a narrow Antmay-owned harness adapter; recipes, checkpoints, outcome parsing, queue gates, pause semantics, and resume behavior use Antmay-owned types and logic so Sandcastle remains replaceable (DR7, DR33, DR39). Sandcastle's worktree, merge, container, and isolated-sandbox facilities are not used in v0 (DR1, DR7).

V0 is a single-user proof of concept: it runs directly in the current checkout (DR1), supports macOS only (DR25), keeps settings creation manual (DR14), and defers lifecycle administration, crash-recovery automation, and publication (DR15, DR16, DR17).

## Scope

### In scope

- The `antmay` binary with the `afk` namespace: `run`, `resume`, `list`, plus help/version forms (DR45).
- One built-in recipe, `standard`, executed by a generic recipe-agnostic runner (DR4).
- Two first-class harnesses, Codex and Claude Code, behind a common adapter boundary over Sandcastle 0.12.0 (DR6, DR7, DR39).
- Global settings loading, strict validation, and per-stage execution-profile resolution with run-creation snapshotting (DR12, DR13, DR32).
- Thread-target resolution and validation, workspace derivation, and exclusive workspace locking (DR11, DR28, DR47).
- Durable, atomically written, versioned run checkpoints in the user's state directory, with immutable per-attempt logs (DR9, DR26, DR27, DR35).
- Terminal-outcome parsing, pending-queue gating, per-stage Git boundary enforcement, and executor-owned stage-boundary commits (DR3, DR29, DR44, DR49, DR50).
- Durable pause with a closed waiting-reason taxonomy, explicit resume, graceful signal handling, curated live display, and distinct exit codes (DR2, DR22, DR40, DR41, DR43).
- Deterministic automated tests via an injected harness interface, plus a documented manual real-harness smoke checklist (DR34).

### Out of scope (v0 non-goals)

- Workspace isolation: no dedicated worktree, branch, sandbox, or automatic rollback of partial changes (DR1). The workspace-strategy boundary exists internally, but `current-checkout` is the only strategy and no settings field selects one (DR10, DR24).
- User-defined or file-based recipe formats; any recipe other than `standard` (DR4).
- Harnesses other than Codex and Claude Code (DR6).
- Agent-session capture or resumption; every invocation, including a resumed stage, starts a fresh agent conversation (DR7, DR39).
- Settings initialization or editing commands; automatic settings-file creation (DR14). Project-local settings and per-run harness/model flags (DR12). JSONC settings, comments, and trailing commas (DR32).
- `show`, `cancel`, `delete`, `prune`, or migration commands; checkpoint schema migration (DR15, DR26).
- Automatic stale-lock or heartbeat crash recovery (DR16). Automatic retry of failed or malformed stages, success inference from files, or a manual mark-success override (DR30).
- Preflight of credentials, model access, skill installation, subagent capability, or provider version semantics (DR23, DR48).
- Linux and Windows support claims (DR25). Public package publication and end-user install UX (DR17).
- `list` JSON output, filters, pagination, cleanup, or reconstruction of damaged rows (DR38). Aliases, shell completion, telemetry, update checks, interactive selection, hidden fallback commands (DR45).
- Reading or interpreting pending-bundle contents; the executor checks only queue emptiness (DR3, DR44).

## Expected behavior

### CLI surface and exit codes

The CLI exposes exactly (DR45):

- `antmay afk run <recipe> --thread <path> [--dangerously-skip-permissions]` — `standard` is the only recipe.
- `antmay afk resume <run-id>` — exactly one run ID; no execution overrides; the dangerous-permission flag belongs only to `run`.
- `antmay afk list` — read-only; accepts no option except help.
- Help and version forms at the top level, the `afk` namespace level, and each subcommand level. They exit `0` without loading configuration, state, Git, or harnesses. `-h` is the only short flag; all other options use documented long names.

Grammar is strict: unknown flags, missing values, and extra positionals are rejected; invalid grammar prints the nearest usage to stderr and exits `1` (DR37, DR45). `run` and `resume` never prompt (DR45).

Exit codes (DR22, DR36, DR38, DR40):

- `0` — `run`/`resume` completed the whole recipe; `list` succeeded; help/version.
- `2` — the checkpoint is durably `Waiting for user`: non-DONE outcomes, pending queues, harness failures, malformed output, idle timeouts, Git-boundary pauses.
- `1` — command or preflight failure before useful execution: invalid arguments or configuration, invalid thread selection, unknown run, resume of a completed run, lock contention; also `list` with partial checkpoint-read failures.
- `130`, `143`, `129` — after `SIGINT`, `SIGTERM`, `SIGHUP` respectively, with best-effort checkpointing and cleanup.

Final terminal output of `run`/`resume` names the run ID and its current condition; waiting output includes the reason and the exact resume command (DR22). The CLI itself never prints a line beginning with `Outcome:` (DR22, DR43).

### Configuration and state roots

Roots resolve from the first non-empty value, in order (DR42):

- Config root: `ANTMAY_CONFIG_HOME`; else `$XDG_CONFIG_HOME/antmay`; else `<home>/.config/antmay`.
- State root: `ANTMAY_STATE_HOME`; else `$XDG_STATE_HOME/antmay`; else `<home>/.local/state/antmay`.

A selected environment value must be an absolute path; a relative value is an error. Empty values count as unset. No tilde, nested-variable, or shell expansion is performed; paths are normalized without changing macOS case; a missing user home fails clearly (DR42).

Settings are read-only and never created by the executor (DR14, DR42). State directories are created lazily, only for new-run allocation; `list` treats absent state/runs directories as no runs without creating them; `resume` treats them as an unknown run (DR42). Missing-config diagnostics print the fully resolved expected `settings.json` path (DR42).

### Settings file and validation

V0 accepts only `<config-root>/settings.json`, parsed as strict JSON (DR32). Validation rules (DR32):

- The document root and `afk` must be objects; `afk.defaults` and `afk.stages` may be omitted or empty objects.
- Profiles may contain only `harness`, `model`, `prompt`, and `idleTimeoutSeconds`. `harness` is `codex` or `claude-code`; `model` is a non-empty string; `prompt` is a string; `idleTimeoutSeconds` is a positive finite integer.
- Unknown fields at every level are errors. Stage keys under `afk.stages` absent from every installed built-in recipe are errors.
- Syntax diagnostics name the file and parser location; schema validation reports all discovered errors together using property paths.
- Settings perform no environment interpolation and store no credentials.

When the file is missing or invalid, `run` fails preflight without creating a run, reports the exact accepted path and all validation problems, and points to documentation containing a complete copyable settings example (DR14).

### Execution-profile resolution

For each stage selected by the recipe, resolution starts from built-in `prompt: ""` and `idleTimeoutSeconds: 86400`, shallow-merges `afk.defaults`, then shallow-merges the matching `afk.stages.<stage-id>` override, and finally requires a resolved supported harness and non-empty model (DR12, DR20, DR32). Every field uses ordinary replacement — a supplied override value replaces the default; an omitted field inherits (DR13). Defaults may omit `harness` and `model` when every selected stage supplies them (DR32).

The resolved `prompt`, when non-empty, is trusted opaque user guidance appended after the executor-owned stage invocation; it may request subagent roles or models, but the executor claims no enforcement of those requests (DR12, DR18). Every fully resolved stage profile is snapshotted into the run at creation; resume uses the snapshot and never rereads settings (DR12, DR36). The checkpoint stores only resolved profiles, never the raw settings document (DR32).

### Thread-target resolution

`--thread` is always required and accepts three forms (DR11, DR47):

- a bare thread-folder name, resolved as `docs/threads/<thread>` beneath the Git worktree containing the current directory;
- a relative path (any value containing a path separator, resolved against the current directory) that lexically ends in exactly `docs/threads/<single-thread-folder>`;
- an absolute path with the same lexical suffix requirement.

The executor canonicalizes the existing target, obtains the worktree top level with Git run from the target, and requires the canonical Git root to equal the path portion preceding `docs/threads`, with the canonical target exactly one direct child of that root's active `docs/threads/` directory. Symlink escapes, nested thread suffixes, archived-thread paths, bare repositories, and mismatched worktree roots are preflight errors (DR47).

`seed.md` and `decisions.md` must both exist as files inside the thread and each must contain non-whitespace text after trimming; otherwise preflight fails before any run is created (DR11). Beyond this genesis validation, the runner does not duplicate the invoked skills' artifact preconditions — a missing or malformed `spec.md` or `plan.md` is for the invoked skill to refuse via its own terminal outcome (DR31).

The canonical Git worktree root becomes the Sandcastle working directory, the `current-checkout` workspace identity, the lock-identity input, and the absolute repository path persisted in the run; the thread is persisted as the normalized repository-relative path `docs/threads/<thread-folder>` (DR47) and is named explicitly in every stage prompt through the rendered target (DR11, DR31).

### Recipe model and the built-in `standard` recipe

A recipe is an ordered array of stage descriptors consumed by one generic runner that contains no branches tied to the Standard workflow, individual stages, or skill names (DR4, DR46, DR50). Each descriptor carries (DR31, DR50):

- a stable `id`;
- a `skill`;
- a declarative target: `thread-root`, or `thread-file` with a thread-relative path;
- a declarative Git policy (see "Per-stage Git policy" below).

Target resolution produces a normalized repository-relative path, adds a trailing slash for the thread root, and rejects any descriptor that escapes the selected thread (DR31).

The `standard` recipe targets: the thread root for `spec`; `spec.md` for `reconcile-spec`, `review-spec`, and `plan-strict`; `plan.md` for `reconcile-plan` and `implement-plan-with-subagents` (DR31).

At run creation the resolved ordered stage descriptors (including resolved profiles) are copied into the persisted checkpoint; every resume uses this immutable snapshot rather than re-resolving the built-in recipe (DR5).

### Prompt rendering

The harness adapter renders exactly `` <trigger> `<resolved-target>`. `` and appends a single space plus the resolved profile `prompt` only when that prompt is non-empty (DR31). Codex uses `$<skill>` as the trigger; Claude Code uses `/<skill>`; the trigger is the first prompt content. The executor adds no generic or Standard-specific instructions (DR31).

### Creating a run

`antmay afk run` performs complete preflight before allocating anything (DR37):

1. Strict argument validation (unknown flags, missing values, extra positionals rejected).
2. Exact built-in recipe resolution.
3. Thread resolution and validation per DR11/DR47, including the owning Git root, active location, seed, and decision log.
4. Settings load and validation; resolution of every stage target and profile (DR32).
5. Harness-executable preflight: collect the distinct harnesses referenced by resolved stage profiles and verify each; report all unavailable harnesses together (DR23, DR48).
6. Clean-worktree requirement: the Git worktree must be clean before the first checkpoint is created (DR49); cleanliness uses the same status set as Git-boundary inspection — staged, unstaged, deleted, and untracked paths, with ignored files excluded (DR50).
7. Confirmation that both `.pending-decisions/` and `.pending-reviews/` inside the thread contain no regular files directly inside them; an absent directory counts as empty; bundle contents are never interpreted (DR3, DR37, DR44).

Only after preflight does the executor generate the run ID and snapshot, resolve the canonical workspace, acquire its lock, and repeat the queue check under the lock; it then exclusively creates the run directory and the initial `ready` checkpoint before launching any harness (DR28, DR37). Failures before the checkpoint — including lock contention or a queue race — exit `1`, release any acquired lock, and create no run. A run-directory or initial-checkpoint creation failure releases the lock, identifies any partial path, exits `1`, and launches no harness. Once the initial checkpoint exists, later failures use durable pause or fatal-checkpoint behavior (DR27, DR37). The only optional new-run execution flag is `--dangerously-skip-permissions` (DR37).

Harness-executable preflight details (DR48): the fixed mapping is `codex` → `codex` and `claude-code` → `claude`. The mapped binary is executed with `--version` directly through the inherited `PATH`, without a shell, from the canonical repository root, with a fixed 10-second timeout; success requires exit code `0` and non-whitespace output. Diagnostics identify the affected stage or profile, the binary, and the spawn, timeout, signal, exit, or output failure. No version semantics are parsed, no minimum versions enforced, no authentication, model listing, skill loading, or paid inference occurs. Only profiles selected by the recipe require an installed binary, but structurally invalid settings still fail globally even when the invalid field belongs to an unused profile. The observed trimmed version line goes into the attempt-log header and never modifies the snapshot. Node ≥ 22 is enforced by package metadata and an early runtime guard; successful Git-backed thread resolution establishes Git availability (DR48).

Run identity (DR35): run IDs are `<YYYYMMDDTHHmmssSSSZ>-<8-lowercase-hex>`, the suffix generated from four cryptographically random bytes. The executor creates `<state-root>/afk-runs/<run-id>/` exclusively and regenerates on collision. Consumers treat directory names as opaque run IDs after allocation.

### Workspace strategy and locking

The runner obtains its execution directory, Sandcastle sandbox and branch settings, and mutable-workspace identity from a workspace-strategy abstraction (DR10). V0 provides only `current-checkout` — repository root, Sandcastle `noSandbox()`, head branch strategy — resolved internally with no user-facing settings field; the resolved workspace configuration is snapshotted into the checkpoint (DR24).

Locking (DR28): locks live at `<state-root>/afk-locks/<sha256>.lock`, the digest computed from the workspace path resolved through `realpath`. Acquisition exclusively creates the file with mode `0600`, then writes and flushes a versioned record containing the canonical workspace path, run ID, executor PID, UTC acquisition time, and a random owner token. The process holds the lock across the uninterrupted stage sequence and releases it on completion, durable pause, graceful interruption, or ordinary failure; release verifies the stored owner token still matches before unlinking. Retained or paused runs hold no lock (DR10).

An existing lock causes exit `1`; the executor prints its metadata and exact path and never deletes or reclaims it automatically — the user must verify the recorded process is gone before manually removing a stale file (DR16, DR28). Automatic stale-lock and heartbeat recovery are deferred beyond v0 (DR16).

### Executing a stage

Before spawning a harness, the executor atomically persists a new `executing` attempt (DR26). Every attempt calls Sandcastle `run` exactly once with (DR39):

- the resolved provider; `noSandbox()`; repository-root cwd; head branch strategy;
- the inline rendered prompt; one iteration;
- the three literal completion signals `Outcome: DONE`, `Outcome: BLOCKED`, `Outcome: REFUSED` and a 60-second post-signal grace period (DR21, DR29);
- the resolved idle timeout (default 86,400 seconds; no total wall-clock timeout — DR20);
- file logging with verbose raw events plus a normalized-event callback; and an attempt `AbortSignal`.

It sets no prompt file, hooks, environment overrides, copy rules, structured output, retries, session resume, or session fork; it inherits the user environment and ignores Sandcastle commit and branch fields (DR39).

Permissions (DR8, DR39): session capture is always disabled. The default safe policy is Codex `approvalsReviewer: "auto_review"` and Claude Code `permissionMode: "auto"`. For a run created with `--dangerously-skip-permissions`, both providers omit those safe options so Sandcastle selects its unrestricted AFK invocation. The flag applies to the whole run and is preserved in the checkpoint so resumed stages use the same policy (DR8).

The adapter forwards normalized text and tool-call events to the display, preserves raw events in the attempt log, normalizes thrown errors while retaining their class and message as diagnostics, and exposes no Sandcastle-specific types to the runner (DR39).

### Interpreting a stage result

**Outcome parsing (DR29, DR21, DR30).** Antmay independently normalizes line endings, locates the trimmed final non-empty line of the single captured iteration result, and matches it from the start against `^Outcome: (DONE|BLOCKED|REFUSED)\b`. A bare token or any trailing detail format is accepted; no em dash is required. The attempt stores the complete candidate line, the parsed token, and any remaining text as uninterpreted diagnostic detail. Signal detection, earlier outcome text, and which Sandcastle signal matched never determine advancement (DR21, DR29).

**Queue gate (DR3, DR44).** Both pending directories are scanned at initial preflight, after lock acquisition, immediately before each stage attempt, after every harness return or error, and during locked resume preflight. Scans collect direct regular files from both queues, normalize and lexically sort their paths, and never read bundle bodies. A queue found non-empty before a stage pauses without launching or allocating another attempt.

**Classification precedence after an attempt (DR41, DR44).** Any pending file selects `pending-queues` and takes precedence over parsed outcomes (including BLOCKED/REFUSED) and provider errors, because emptying the queues is the concrete resume requirement. Otherwise, classification proceeds in order: idle timeout (`idle-timeout`), other harness errors (`harness-error`), then final-outcome parsing — `outcome-blocked`, `outcome-refused`, `malformed-outcome` for a missing or unrecognizable token, or DONE.

**Malformed or missing outcome (DR30).** When Sandcastle resolves but no valid token parses, the executor finishes the attempt as `waiting`, persists `waiting-for-user` at the same stage with kind `malformed-outcome`, preserves all filesystem changes and the attempt log, releases the lock, and exits `2`. It prints the expected prefixes, the unrecognized candidate line when present, the log path, a warning that files may have changed, and the exact resume command. It never infers success from files, retries automatically, resumes the agent session, or offers a mark-success override.

**Gate errors (DR44).** When an existing run's advancement invariant cannot be evaluated — for example an unreadable pending directory — the run durably pauses at the same stage with kind `gate-error`, releases the lock, and exits `2`; a failure to write that pause follows the fatal-checkpoint path (DR27). A queue-read error during initial preflight exits `1` with no run.

### Git boundaries and executor commits

Git-boundary evaluation occurs only after a successful harness exit, an authoritatively parsed DONE terminal outcome, and empty pending queues; every other outcome or failure pauses without any executor commit (DR49, DR50).

Every stage descriptor carries a declarative Git policy with three independent parts (DR50): whether `HEAD` must remain unchanged or may change; whether the post-DONE worktree must be clean or may contain changes only beneath resolved path selectors, including whether at least one change is required; and whether a valid changed boundary receives an executor commit with a declared message or no executor action. The generic runner interprets this data without branching on recipe, stage, or skill names.

The `standard` recipe declares (DR50):

| Stage | `HEAD` | Allowed post-DONE changes | Change required | Executor commit |
|---|---|---|---|---|
| `spec` | must not change | only the thread's `spec.md` | yes | `docs(<full-thread-folder>): spec` |
| `reconcile-spec` | must not change | only `spec.md` | optional | `docs(<full-thread-folder>): reconcile spec`; advance without commit when unchanged |
| `review-spec` | must not change | none (worktree clean) | — | none |
| `plan-strict` | must not change | `plan.md` and descendants of `plan-tasks/` | at least one | `docs(<full-thread-folder>): plan` |
| `reconcile-plan` | must not change | `plan.md` and descendants of `plan-tasks/` | optional | `docs(<full-thread-folder>): reconcile plan`; advance without commit when unchanged |
| `implement-plan-with-subagents` | may change | none (final worktree clean) | — | none |

`<full-thread-folder>` is the complete canonical directory name including its UTC prefix — for this thread, `260723121015Z-afk-workflow-executor`. Commit subjects and scopes are exact (DR50).

The runner inspects all staged, unstaged, deleted, and untracked files with untracked files expanded, validates them against canonical repository-relative exact-file or subtree selectors, and stages only the validated observed paths; ignored operational queues and implementation workspaces do not enter the status set (DR50). A DONE stage with no remaining changes advances without an empty commit (DR49). Commits made by a skill remain untouched; `implement-plan-with-subagents` owns its reviewed task commits, and any residual implementation worktree change is a Git-policy violation (DR50). The executor never pushes, amends, rebases, rewrites history, bypasses hooks, or creates an empty commit (DR49).

A disallowed path, forbidden `HEAD` movement, missing required change, unexpectedly dirty clean boundary, staging discrepancy, or commit failure pauses without advancing, preserves the completed attempt, and enters boundary-finalization waiting with kind `git-policy-violation` or `commit-error` (DR50). Resume from that condition reacquires the lock, rechecks queues and the Git policy, then commits or advances **without another harness invocation** once the boundary is valid; pending queues found before boundary finalization retain precedence and require the normal same-stage rerun after they are resolved (DR50).

Explicit resume of any paused stage acknowledges that the paused worktree's current uncommitted changes belong to recovery of that stage and may enter its eventual successful boundary commit; the pause output states this consequence, and users must not mix unrelated edits into a paused workspace (DR49).

Beyond boundary enforcement, the executor never inspects, classifies, cleans, stashes, or authorizes dirty-worktree changes on a skill's behalf and never synthesizes a skill's dirty-worktree advance authorization; a skill's dirty-worktree `REFUSED` pauses the run, and the user may supply the required authorization through that stage's settings `prompt` (DR18).

The stage-entry Git baseline and observed `HEAD` are part of the durable run cursor so unexpected history movement can be diagnosed across pause and resume (DR50).

### Durable state

**Checkpoint schema (DR26, DR50).** `state.json` uses `schemaVersion: 1` and stores: the run and executor identities; UTC creation and update timestamps; the absolute repository root; the repository-relative thread path; the resolved workspace configuration; the dangerous-permission choice; the immutable recipe snapshot with every resolved stage profile; the current zero-based stage index; the run condition; an ordered attempt history; an optional waiting reason (`waiting: null` for ready, completed, and successful transitions — DR41); and the stage-entry Git baseline and observed `HEAD` (DR50). Run conditions are `ready`, `executing`, `waiting-for-user`, and `completed`; attempt results are `executing`, `done`, `waiting`, and `interrupted`. Each attempt records its number, stage index and ID, timestamps, result, parsed terminal outcome when present, pending-file paths, human- and machine-readable failure information when applicable, and a run-relative log path. Timestamps use ISO-8601 UTC; stored repository-internal and log paths use normalized relative POSIX form where applicable. An unknown schema version fails clearly; v0 performs no migration.

**Transitions (DR26).** Before spawning a harness, a new `executing` attempt is atomically persisted. A successful stage finishes that attempt, advances the stage index, and persists `ready` — or `completed` when the index reaches the recipe length. A paused stage finishes the attempt and persists `waiting-for-user` without advancing. After manual stale-lock recovery from an abandoned `executing` checkpoint, resume marks the abandoned attempt `interrupted` and creates a new attempt for the same stage.

**Atomic persistence (DR27).** Every checkpoint write serializes deterministic two-space JSON with a trailing newline, exclusively creates a uniquely named temporary file beside `state.json` with mode `0600`, writes the complete document, flushes and closes it, atomically renames it over `state.json`, and best-effort flushes the containing directory. Antmay state directories use mode `0700`; attempt logs use mode `0600`. Readers treat only `state.json` as authoritative and ignore leftover temporary files. The executor never truncates a checkpoint in place and keeps no automatic backup. If persistence fails before a stage launch, the stage does not launch; if it fails after a stage returns, the executor does not advance or launch another stage — it reports a fatal checkpoint error and leaves the previous valid checkpoint and attempt log for manual recovery.

**Waiting taxonomy (DR41, DR44, DR50).** A `waiting-for-user` checkpoint carries exactly one waiting object whose kind is one of: `outcome-blocked`, `outcome-refused`, `pending-queues`, `malformed-outcome`, `harness-error`, `idle-timeout`, `interrupted`, `gate-error`, `git-policy-violation`, `commit-error`. It always includes a complete human message and normalized repository-relative pending-file paths when applicable; it may include a candidate outcome line and structured error diagnostics. Harness diagnostics retain the provider-neutral category plus the Sandcastle class and message; idle timeout stays distinct; interruption records its signal or manual-recovery origin. Terminal rendering consumes the stored object and adds operational paths and the resume command rather than inferring a cause from logs.

**Attempt logs (DR35, DR48).** Logs live under the run's `logs/` directory as `<two-digit-stage-ordinal>-<stage-id>-attempt-<two-digit-attempt>.log`; each file is exclusively created and never appended to or overwritten by another attempt. Each log begins with an Antmay header naming the run, stage and ordinal, attempt, harness, model, repository, thread, and UTC start time — including the observed harness version line (DR48) — followed by Sandcastle's verbose stream. Completed and paused runs remain on disk until manually removed.

### Resuming a run

`antmay afk resume <run-id>` (DR36): loads and validates the checkpoint; rejects unknown, malformed, or completed runs (a completed run reports that fact and exits `1`); verifies the recorded repository is still the Git root containing the recorded active thread; revalidates non-empty `seed.md` and `decisions.md`; verifies the current stage's snapshotted harness executable (only that one — DR48); resolves the snapshotted workspace and requires its canonical path to match; acquires its lock; and rechecks both pending queues under that lock. Resume fails clearly when the recorded repository path no longer resolves; it never searches for a replacement (DR9).

Then:

- A waiting run with non-empty queues remains unchanged, prints the remaining files, releases the lock, and exits `2`.
- A waiting run with empty queues starts a new attempt at the same stage — or, for `git-policy-violation`/`commit-error`, performs boundary finalization without another harness invocation (DR50).
- A `ready` run starts its stored next stage.
- An `executing` run proceeds only after the user manually removes any stale lock; resume then atomically marks the abandoned attempt `interrupted` and starts a new attempt at the same stage (DR16, DR26).

Resume never rereads settings or current recipe definitions, accepts no execution overrides, resumes no agent session, and never skips directly to the following stage (DR2, DR36). After the retried stage succeeds, it continues through subsequent snapshotted stages until another pause or completion. Any resume preflight failure leaves the checkpoint unchanged (DR36).

### Listing runs

`antmay afk list` (DR38): reads immediate run directories independently, ignores unrelated non-directory entries, validates each `state.json`, sorts valid runs by `updatedAt` descending, and never acquires locks or mutates state. It shows updated time, friendly condition, run ID, recipe, one-based stage position and ID, current harness/model, absolute repository path, and repository-relative thread path. Conditions render as `Ready`, `Waiting for user`, `Completed`, and `Executing (unverified)`. Completed runs show the final stage count and no harness/model. Optional color applies only to TTY output and carries no meaning.

A missing or empty runs directory prints `No AFK runs found.` and exits `0`. Each malformed or unreadable checkpoint produces a stderr warning with its directory, path, and validation error while valid runs still print; any such partial failure makes the command exit `1`, otherwise `0`.

### Signals and interruption

V0 handles `SIGINT`, `SIGTERM`, and `SIGHUP` (DR40). On the first signal it stops scheduling stages, aborts the active Sandcastle call, and — when an attempt is executing — atomically finishes it as `interrupted` and persists `waiting-for-user`; when between stages in `ready` condition, it leaves that durable cursor unchanged. It preserves files and logs, releases its owned lock, and exits `130`, `143`, or `129` respectively. Before an initial checkpoint exists, it exits without creating a run.

A second signal during cleanup exits immediately with the corresponding conventional code and makes no further checkpoint or lock-cleanup guarantee; manual stale-lock recovery may then be required. A rejection caused by the first signal is classified as interruption, never as a harness failure, and no new attempt or stage may start afterward. Hard kills and power loss remain the manual-recovery case: the last atomic checkpoint and partial filesystem changes remain, and the user must verify no executor still owns the workspace and remove any stale lock before resuming (DR16, DR40).

### Terminal display

New runs print a compact summary of run ID, recipe, thread, workspace, permission mode, and stage count, with a prominent warning for unrestricted permissions (DR43). Every attempt prints its stage position and ID, harness/model, attempt number, and absolute log path. The live view renders normalized assistant text and concise tool-call lines, truncating only displayed arguments while preserving full raw data in the log; the terminal renderer consumes Sandcastle's normalized events, never provider-specific raw JSON (DR19, DR43). An Antmay-owned display heartbeat prints elapsed time every five minutes regardless of harness output and does not affect Sandcastle's idle timer (DR43).

TTY output may use color, must honor `NO_COLOR`, and avoids spinners that interfere with streams. Normal messages go to stdout; warnings and errors go to stderr. Stage success prints its position and duration. Durable pause prints the stored reason, pending paths, log path, run ID, and exact resume command (DR19, DR43). Recipe completion prints the run, recipe, total elapsed time, and absolute checkpoint path (DR43).

An actual idle timeout places the run in `Waiting for user` at the same stage with no automatic retry; Ctrl-C remains the normal way to stop a suspected hang (DR20).

## Constraints

- **Placement (DR17):** the executor is a self-contained private Node/TypeScript package under `cli/`, with its own `package.json`, lockfile, TypeScript configuration, source, tests, build output, dependencies, and the `antmay` binary mapping. The repository root does not become an npm workspace. Development commands run from `cli/` or via `npm --prefix cli …`; local install is `npm link` from `cli/`.
- **Toolchain (DR33):** Node.js ≥ 22, ESM, strict TypeScript, `tsup` for the executable entry (built shebang entry exposed as `antmay`), Vitest for tests, npm with a package-local lockfile. Command parsing uses Node's `util.parseArgs`; state, lock, hashing, signal, and path behavior use built-in Node APIs; settings and checkpoint schemas use manual typed validators. Sandcastle is pinned to exactly `0.12.0`. No CLI, logging, configuration, database, schema, or dependency-injection framework is added. Package scripts: `build`, `typecheck`, `test`, and `check` (typecheck + tests + build).
- **Git access:** thread resolution, boundary inspection, and commits are Git-backed via the user's `git` executable through built-in process APIs — successful thread resolution is what establishes Git availability (DR47, DR48); no Git library dependency is introduced (DR33).
- **Architecture (DR46):** binding dependency directions — command dispatch must not own workflow behavior; the runner must consume resolved recipe and stage data without branching on `standard` or individual skill names; Sandcastle-specific types and behavior must remain behind the harness adapter; persistent-state, queue-gate, and terminal-display concerns must not be conflated. Prefer plain typed functions; inject only unstable boundaries needed for deterministic tests; no DI framework, repository abstraction, or class hierarchy.
- **Platform (DR25):** support is claimed and tested on macOS only. Platform-neutral Node APIs may be used where convenient, but Linux and Windows behavior is incidental and undocumented.
- **Privacy (DR27):** state directories mode `0700`; checkpoints and attempt logs mode `0600`.
- **Safety:** the default permission policy is AI-mediated; unrestricted host access requires the explicit `--dangerously-skip-permissions` flag and a prominent warning (DR8, DR43). The executor runs unsandboxed in the user's checkout (DR1) and never pushes, amends, rebases, rewrites history, or bypasses hooks (DR49).
- **Skill suite:** invoked skills are the installed Antmay skills; the executor treats their availability and behavior as the harness's concern and captures their failures through the normal stage gate (DR23, DR31).

## Acceptance guidance

The required automated gate is `npm --prefix cli run check` passing (DR34). Automated Vitest suites use an injected harness interface, temporary directories, disposable Git repositories, fake harness processes, and fake version executables on `PATH` — never paid model calls or user credentials (DR34).

Each AC below is a checkable assertion; the cited DR(s) are the settled decisions it enforces. Reviewers verify ACs against the built CLI and its automated tests.

### FR-1 — CLI grammar and exit codes (DR22, DR37, DR45)

- **AC-1.1** `antmay afk run standard --thread <valid>` , `antmay afk resume <run-id>`, and `antmay afk list` are accepted; any unknown flag, missing value, extra positional, or unknown recipe prints the nearest usage to stderr and exits `1`.
- **AC-1.2** Help (`-h`/long form) and version forms succeed with exit `0` at top, `afk`, and subcommand levels without reading settings, state, Git, or probing harnesses (verifiable by running them with an invalid config/state environment).
- **AC-1.3** `run`/`resume` exit `0` only on whole-recipe completion; `2` on every durable `Waiting for user` result; `1` on preflight/command failures (including lock contention, unknown run, resume of a completed run); `130`/`143`/`129` after SIGINT/SIGTERM/SIGHUP.
- **AC-1.4** `resume` rejects execution overrides and `--dangerously-skip-permissions`; `list` accepts no option except help; `run`/`resume` never prompt on stdin.
- **AC-1.5** No CLI code path prints a line beginning with `Outcome:`.

### FR-2 — Config and state root resolution (DR42)

- **AC-2.1** Config and state roots resolve in the documented precedence order; empty environment values are treated as unset; a relative `ANTMAY_*`/`XDG_*` value produces a clear error.
- **AC-2.2** No tilde, nested-variable, or shell expansion occurs (a literal `~` or `$VAR` value is rejected as relative or used verbatim as absolute content, never expanded).
- **AC-2.3** Missing-settings diagnostics print the fully resolved expected `settings.json` path; the executor never creates a settings file.
- **AC-2.4** `list` with absent state/runs directories prints `No AFK runs found.`, exits `0`, and creates no directory; `resume` in that situation reports an unknown run and exits `1`.

### FR-3 — Settings validation (DR14, DR32)

- **AC-3.1** Only `<config-root>/settings.json` is read, as strict JSON; a syntax error names the file and parser location.
- **AC-3.2** Unknown fields at any level, a stage key not present in any built-in recipe, an unsupported harness, an empty model, a non-string prompt, and a non-positive or non-integer `idleTimeoutSeconds` are each rejected; all schema errors are reported together with property paths.
- **AC-3.3** A missing or invalid settings file fails `run` preflight with exit `1`, creates no run directory, and points to documentation containing a complete copyable settings example.

### FR-4 — Profile resolution and snapshotting (DR5, DR12, DR13, DR20, DR32)

- **AC-4.1** Per-stage resolution starts from `prompt: ""` and `idleTimeoutSeconds: 86400`, shallow-merges `afk.defaults`, then the stage override, with plain field replacement (no prompt concatenation), and fails when any selected stage lacks a resolved harness or model.
- **AC-4.2** The checkpoint stores fully resolved stage profiles and the resolved ordered stage descriptors; editing `settings.json` (or a hypothetical recipe change) after run creation does not alter a resumed run's harness, model, prompt, idle timeout, stage list, or targets.
- **AC-4.3** A non-empty resolved prompt appears in the rendered stage prompt exactly once, appended after the executor-owned invocation with a single separating space.

### FR-5 — Thread resolution (DR11, DR47)

- **AC-5.1** All three `--thread` forms (bare name, relative path, absolute path) resolve to the same canonical active thread; omission of `--thread` fails with exit `1`.
- **AC-5.2** Symlink escapes, nested `docs/threads` suffixes, archived-thread paths, bare repositories, non-child targets, and a canonical Git root that does not equal the path prefix before `docs/threads` each fail preflight before any state or lock is created.
- **AC-5.3** A missing, empty, or whitespace-only `seed.md` or `decisions.md` fails preflight with exit `1` and no run.
- **AC-5.4** The checkpoint records the absolute canonical repository root and the normalized repository-relative `docs/threads/<thread-folder>` path.

### FR-6 — Recipe and prompt rendering (DR4, DR31)

- **AC-6.1** The built-in `standard` recipe contains exactly the six stages in order with the declared targets (thread root; `spec.md` ×3; `plan.md` ×2); resolved targets are repository-relative, the thread-root target ends with a trailing slash, and a descriptor escaping the thread is rejected.
- **AC-6.2** For Codex the rendered prompt is exactly `` $<skill> `<resolved-target>`. `` and for Claude Code exactly `` /<skill> `<resolved-target>`. ``, with the profile prompt appended after a single space only when non-empty; no other executor-added instruction text exists.
- **AC-6.3** The runner code contains no branch on recipe name, stage ID, or skill name; runner tests exercise a non-`standard` synthetic recipe through the same code path.
- **AC-6.4** The runner performs no artifact precondition checks beyond seed/decision genesis validation — e.g. a missing `spec.md` before `plan-strict` still launches the stage and pauses only via the skill's own terminal outcome.

### FR-7 — Run-creation preflight and allocation (DR23, DR35, DR37, DR48, DR49)

- **AC-7.1** Every preflight failure (arguments, recipe, thread, settings, harness executables, dirty worktree, non-empty queues, queue-read error, lock contention) exits `1` and leaves no run directory, no checkpoint, and no held lock.
- **AC-7.2** Harness preflight probes each distinct selected harness's mapped binary (`codex`, `claude`) with `--version`, no shell, canonical-repo cwd, 10-second timeout; requires exit `0` plus non-whitespace output; reports all unavailable harnesses together; performs no auth, model, or skill probing.
- **AC-7.3** A dirty worktree (staged, unstaged, deleted, or untracked non-ignored paths) at new-run preflight fails with exit `1` and no run.
- **AC-7.4** The pending-queue check is repeated under the acquired workspace lock before the initial checkpoint is written; a file appearing between the first check and lock acquisition prevents run creation.
- **AC-7.5** Run IDs match `<YYYYMMDDTHHmmssSSSZ>-<8-lowercase-hex>`; the run directory is created exclusively with collision regeneration; the initial checkpoint has condition `ready` and is written before any harness launch.

### FR-8 — Workspace locking (DR10, DR16, DR24, DR28)

- **AC-8.1** The lock path is `<state-root>/afk-locks/<sha256(realpath(workspace))>.lock`, created exclusively with mode `0600`, containing a versioned record with canonical workspace path, run ID, PID, UTC time, and a random owner token.
- **AC-8.2** A second `run`/`resume` against the same canonical workspace while the lock exists exits `1`, printing the lock's metadata and exact path, without deleting or modifying it.
- **AC-8.3** The lock is released on completion, durable pause, graceful interruption, and ordinary failure; release unlinks only when the stored owner token matches; paused runs hold no lock.
- **AC-8.4** V0 settings expose no workspace field; the checkpoint contains the resolved `current-checkout` workspace configuration.

### FR-9 — Stage invocation and permissions (DR8, DR20, DR21, DR39)

- **AC-9.1** Each attempt issues exactly one Sandcastle `run` call with: the resolved provider, `noSandbox()`, repository-root cwd, head branch strategy, inline prompt, one iteration, the three literal completion signals, a 60-second completion grace, the resolved idle timeout, verbose file logging plus a normalized-event callback, and an abort signal — and sets no session resume/fork, hooks, prompt file, env overrides, copy rules, structured output, or retries.
- **AC-9.2** Session capture is disabled for both providers; default runs pass Codex `approvalsReviewer: "auto_review"` / Claude Code `permissionMode: "auto"`; a run created with `--dangerously-skip-permissions` omits those safe options for every stage, including resumed ones, per the persisted flag.
- **AC-9.3** The default idle timeout is 86,400 seconds, overridable per profile with the standard replacement rule; no total wall-clock timeout is applied.
- **AC-9.4** No Sandcastle-specific type appears in runner, checkpoint, or recipe modules (adapter boundary holds); adapter errors surface with a provider-neutral category plus original class and message.

### FR-10 — Outcome parsing (DR21, DR29, DR30)

- **AC-10.1** The parser matches the trimmed final non-empty line (after newline normalization) against `^Outcome: (DONE|BLOCKED|REFUSED)\b`; bare tokens, em-dash detail, and plain-text detail all parse; earlier `Outcome:` lines in the transcript are ignored.
- **AC-10.2** The attempt record stores the candidate line, the parsed token, and trailing detail; a Sandcastle completion-signal match without a valid final-line token never advances the stage.
- **AC-10.3** A missing or malformed token yields a durable pause at the same stage with kind `malformed-outcome`, exit `2`, and output containing the expected prefixes, the candidate line when present, the log path, a files-may-have-changed warning, and the exact resume command; no automatic retry or file-based success inference occurs.

### FR-11 — Queue gate and classification (DR3, DR41, DR44)

- **AC-11.1** Queue scans occur at initial preflight, after lock acquisition, immediately before each attempt, after every harness return or error, and during locked resume preflight; scans list direct regular files only, treat absent directories as empty, and never read file contents.
- **AC-11.2** A non-empty queue found before a stage pauses the run without allocating an attempt or launching a harness.
- **AC-11.3** After an attempt, pending files select `pending-queues` even when the outcome parsed as DONE, BLOCKED, or REFUSED or a provider error occurred; without pending files, classification order is idle-timeout, harness-error, then outcome token.
- **AC-11.4** The stored waiting object for `pending-queues` lists normalized, lexically sorted repository-relative pending-file paths, and those paths are printed on pause and on a blocked resume.
- **AC-11.5** An unreadable pending directory during an existing run pauses with kind `gate-error` and exit `2`; the same failure during initial preflight exits `1` with no run.

### FR-12 — Git boundaries and commits (DR49, DR50)

- **AC-12.1** Boundary evaluation runs only after successful harness exit + parsed DONE + empty queues; BLOCKED, REFUSED, malformed, harness-error, idle-timeout, interrupted, and pending-queue results produce no executor commit.
- **AC-12.2** Each `standard` stage enforces its declared policy: `HEAD` movement where forbidden, any path outside the stage's selectors, a missing required change, or a dirty worktree on a clean-boundary stage each pause with kind `git-policy-violation` without advancing and without a commit.
- **AC-12.3** Valid changed boundaries are committed with the exact declared subject (e.g. `docs(260723121015Z-afk-workflow-executor): spec` for this thread), staging only validated observed paths; optional-change stages advance without a commit when unchanged; no empty commit is ever created; hooks are not bypassed.
- **AC-12.4** A commit failure after a gated DONE pauses with kind `commit-error`, preserving the completed attempt and worktree; resume performs boundary finalization — recheck queues and policy, then commit or advance — without another harness invocation; pending files found at that point take precedence and force a same-stage rerun after resolution.
- **AC-12.5** `implement-plan-with-subagents` may move `HEAD` but must end clean; a residual change pauses as `git-policy-violation`; the executor never creates an implementation-stage commit.
- **AC-12.6** Pause output for a paused stage states that current uncommitted changes will belong to that stage's recovery and may enter its boundary commit.
- **AC-12.7** The checkpoint records the stage-entry Git baseline and observed `HEAD`.

### FR-13 — Checkpoint model and persistence (DR26, DR27, DR35)

- **AC-13.1** `state.json` carries `schemaVersion: 1` and all fields listed in "Checkpoint schema"; an unknown schema version fails clearly with no migration attempt.
- **AC-13.2** Every write is atomic: unique same-directory temp file, mode `0600`, full write + flush + close, rename over `state.json`, best-effort directory flush; a reader sees either the previous or the complete new document at any interruption point (tested by injected write/rename failures).
- **AC-13.3** An `executing` attempt is persisted before the harness spawns; success advances the index and persists `ready`/`completed`; pauses persist `waiting-for-user` without advancing; a persistence failure before launch prevents the launch, and one after a stage return halts with a fatal checkpoint error, never advancing.
- **AC-13.4** Attempt logs are exclusively created at `logs/<NN>-<stage-id>-attempt-<NN>.log`, never appended or overwritten across attempts, begin with the required Antmay header (including the observed harness version), and are referenced run-relative from the checkpoint.
- **AC-13.5** State directories are mode `0700`; checkpoints and logs are mode `0600`.

### FR-14 — Waiting taxonomy (DR41, DR44, DR50)

- **AC-14.1** Every `waiting-for-user` checkpoint carries exactly one waiting object with a kind from the closed ten-value set and a complete human message; `ready`/`completed` checkpoints and successful transitions carry `waiting: null`.
- **AC-14.2** Harness-error objects retain the provider-neutral category plus Sandcastle class and message; interrupted objects record signal or manual-recovery origin; malformed objects retain the candidate line when available.
- **AC-14.3** Pause rendering consumes the stored object (adding operational paths and the resume command) rather than re-deriving a cause from logs.

### FR-15 — Resume (DR2, DR9, DR16, DR36, DR48)

- **AC-15.1** Resume validates the checkpoint, repository/thread relationship, seed and decision files, the current stage's snapshotted harness executable only, and canonical workspace identity, then acquires the lock and rechecks queues beneath it; any preflight failure leaves the checkpoint unchanged.
- **AC-15.2** Unknown and malformed runs exit `1`; completed runs report completion and exit `1`; a recorded repository path that no longer resolves fails clearly with no search for a replacement.
- **AC-15.3** Waiting + non-empty queues: checkpoint unchanged, remaining files printed, lock released, exit `2`. Waiting + empty queues: new attempt at the same stage (boundary finalization for Git kinds, with no harness call). Ready: the stored next stage runs. Executing: refused until the stale lock is manually removed, then the abandoned attempt is marked `interrupted` and a new attempt starts at the same stage.
- **AC-15.4** Resume never rereads settings or built-in recipe definitions, never accepts execution overrides, never resumes an agent session, never skips a stage, and continues through subsequent snapshotted stages after success until pause or completion; completed stages are never rerun.

### FR-16 — List (DR38)

- **AC-16.1** `list` reads run directories independently, sorts valid checkpoints by `updatedAt` descending, acquires no lock, and writes nothing.
- **AC-16.2** Rows show the documented columns; conditions render `Ready`/`Waiting for user`/`Completed`/`Executing (unverified)`; completed rows show final stage count and no harness/model.
- **AC-16.3** One corrupt checkpoint yields a stderr warning (directory, path, error) while other rows still print, and the command exits `1`; with no corruption it exits `0`; color appears only on a TTY and honors `NO_COLOR`.

### FR-17 — Signals (DR40)

- **AC-17.1** The first SIGINT/SIGTERM/SIGHUP during an executing attempt aborts the Sandcastle call, persists the attempt as `interrupted` and the run as `waiting-for-user`, preserves files and logs, releases the lock, and exits `130`/`143`/`129`; in `ready` condition between stages the cursor is left unchanged.
- **AC-17.2** A signal before the initial checkpoint exits without creating a run; a second signal during cleanup exits immediately with the conventional code.
- **AC-17.3** A rejection caused by the abort is classified as interruption (never `harness-error`), and no new attempt or stage starts after the first signal.

### FR-18 — Display (DR19, DR43)

- **AC-18.1** New-run output includes run ID, recipe, thread, workspace, permission mode, and stage count, with a prominent warning when permissions are unrestricted; each attempt announces stage position and ID, harness/model, attempt number, and absolute log path.
- **AC-18.2** The live view shows normalized assistant text and concise tool-call lines (arguments truncated in display only, full data in the log) and prints an elapsed-time heartbeat at five-minute intervals independent of harness output.
- **AC-18.3** Stage success prints position and duration; pause prints stored reason, pending paths, log path, run ID, and exact resume command; completion prints run, recipe, total elapsed time, and absolute checkpoint path; raw provider JSON never reaches the terminal; stdout/stderr separation holds.

### FR-19 — Packaging and toolchain (DR17, DR25, DR33, DR46)

- **AC-19.1** `cli/` is a self-contained private package (own `package.json`, lockfile, tsconfig, tests, build) exposing the `antmay` bin via a tsup-built shebang entry; the repository root gains no workspace configuration.
- **AC-19.2** The package declares Node ≥ 22 (with an early runtime guard), uses ESM + strict TypeScript, pins `sandcastle` to exactly `0.12.0`, uses `util.parseArgs`, and adds no CLI/logging/config/database/schema/DI framework.
- **AC-19.3** `npm --prefix cli run check` runs typecheck, tests, and build, and passes.
- **AC-19.4** The binding architectural boundaries of DR46 hold under review: dispatch owns no workflow behavior; the runner is recipe/skill-name agnostic; Sandcastle types stay inside the adapter; state, gating, and display are separate concerns.

### FR-20 — Verification strategy (DR34)

- **AC-20.1** Automated suites, using the injected harness interface and disposable fixtures, cover: settings validation/resolution; all thread-path forms and genesis validation; target and prompt rendering for both harnesses; outcome parsing and queue gates; every checkpoint transition and atomic-write failure; lock acquire/release with owner tokens; complete, paused, interrupted, malformed, timed-out, and resumed runs; Sandcastle option mapping; exit codes, diagnostics, and list behavior.
- **AC-20.2** Tests specifically prove: completed stages do not rerun; settings edits do not alter snapshots; preflight failures create no run; queue checks repeat under the lock.
- **AC-20.3** A documented manual checklist exists covering: build and `npm link`; at least one installed skill invoked through Codex and one through Claude Code in disposable Standard runs; curated streaming and verbose logs verified; recognized outcomes confirmed; one real pause and resume exercised. It is documentation, not an automated credentialed gate.

### Coverage and traceability

Every behavior in "Expected behavior" is covered by at least one AC in the FR whose title names its area; each AC cites the DR record(s) it enforces via its FR heading, so a reviewer can trace any check back through this spec to `decisions.md`. The Git-boundary behaviors trace to DR49/DR50, gating to DR3/DR44, persistence to DR26/DR27, and so on per the headings above.

## Degrees of freedom

The following *hows* are deliberately left to the implementer. Every admissible choice within them satisfies all acceptance criteria unchanged and is reversible without revising this spec:

1. **Module layout under `cli/src/`** — DR46's layout (thin `main.ts`; areas for parsing/dispatch, configuration, recipes, thread + queues, harness + prompts, state + locking, orchestration, display) is a recommended baseline; merge, split, or rename modules freely as long as the binding boundaries in Constraints hold. Test file organization should broadly mirror responsibilities but is otherwise free.
2. **Exact wording and formatting of human-readable output** — help text, diagnostics, warnings, pause messages, and list layout may be phrased and formatted freely provided every content element the DRs require (paths, IDs, reasons, resume command, warnings, columns) is present.
3. **Checkpoint and lock-record field names and JSON shape** — beyond `schemaVersion: 1`, the required content, deterministic two-space serialization, and trailing newline, the concrete JSON field names and nesting of `state.json` and the lock record are free.
4. **Atomic-write temp-file naming scheme** — any uniquely named same-directory temporary file satisfying the exclusive-create, mode, flush, and rename requirements.
5. **Attempt-log header layout** — free, provided the required header facts (run, stage + ordinal, attempt, harness, model, repository, thread, UTC start, observed harness version) appear before the Sandcastle stream.
6. **Display details** — tool-call argument truncation lengths, elapsed-time formatting, color palette and styling (within TTY-only, `NO_COLOR`, no meaning-carrying color, no stream-breaking spinners).
7. **Git invocation details** — which `git` porcelain/plumbing commands and flags implement status inspection, `HEAD` observation, staging, and committing, provided the observed-path validation, exact commit subjects, and never-push/amend/rebase/hook-bypass rules hold.
8. **Position of the clean-worktree check within new-run preflight** — anywhere before run allocation, failing with exit `1` and no run.
9. **Location and filename of the documentation artifacts** — the copyable settings example and the manual smoke checklist may live where the implementer finds natural (e.g. `cli/README.md`), provided the missing-settings diagnostic points at the example accurately.
10. **Internal error representation** — plain typed functions with manual validators are the required posture (DR33, DR46); the concrete error types/discriminated unions used internally are free.

Anything not listed here and not explicitly settled by a cited DR should be treated as pinned by the nearest governing DR text; if a genuinely new decision surfaces during implementation, it must be routed back as a pending decision rather than silently chosen.

## Risks and accepted trade-offs

- **Partial changes in the user's checkout.** V0 runs unsandboxed in the active checkout with no rollback; a failed, interrupted, or blocked stage can leave partial changes (DR1). Mitigated by the clean-worktree start requirement, per-stage boundary commits, and pause-time warnings (DR30, DR43, DR49).
- **Unattended agents on the host.** Default AI-mediated approvals reduce but do not eliminate risk; the unrestricted mode is explicitly dangerous and loudly flagged (DR8, DR43).
- **Hard-kill recovery is manual.** After a crash or power loss, the user must verify no executor owns the workspace and remove a stale lock by hand before resuming (DR16).
- **Skill-level pauses are correct behavior.** A dirty-worktree `REFUSED` from `implement-plan-with-subagents`, or any skill refusal, pauses the recipe; that is the executor accurately relaying the skill's contract, not an executor defect (DR18).

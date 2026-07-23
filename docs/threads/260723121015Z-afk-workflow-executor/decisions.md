# AFK Workflow Executor CLI Decision Log

## DR1: Execute v0 in the current checkout

Context: The executor needs a workspace in which sequential skill invocations can observe artifacts and code changes produced by earlier stages. Sandcastle can provide isolated worktrees and sandboxes, but v0 is intended to remain an MVP with a small implementation surface and usable core behavior.

Decision: The v0 executor will run directly in the current repository checkout. It will not create or manage a dedicated worktree, branch, or sandbox for the workflow run, and it will not promise automatic rollback of partial changes left by a failed, interrupted, or blocked stage. Workspace isolation may be added later without changing the workflow-stage model.

Rationale: Direct execution minimizes setup, lifecycle management, and merge behavior while preserving the core ability to run sequential completion-oriented skills unattended. This accepts that the user's active checkout can contain partial changes after an unsuccessful run; the trade-off is considered appropriate for the MVP, while keeping isolation as a later extension.

## DR2: Persist paused runs for explicit resumption

Context: A workflow stage can require human intervention after producing partial but valid work, and resolving that intervention may outlive the CLI process or terminal session. Workflow continuation therefore cannot depend on keeping an agent process or coding-harness session alive.

Decision: When a stage cannot safely advance without human action, the v0 executor will persist a workflow checkpoint, present the run as `Waiting for user`, and exit. The checkpoint will identify the workflow run, its ordered stages, the current stage, and the reason it paused. The user will resume the run explicitly by run identifier after addressing the cause. Resumption will re-run the paused stage and will advance only after that stage completes successfully; it will never skip directly to the following stage. Workflow resumption will not require resuming the original coding-agent conversation.

Rationale: A durable checkpoint survives terminal closure, process failure, and long decision delays while preserving deterministic stage progression. It adds a small run-state model and resume command, but that complexity is necessary to deliver reliable unattended execution rather than forcing users to rediscover progress or restart completed work.

## DR3: Gate execution on empty pending queues

Context: A stage is safe to advance only when its harness invocation succeeds, reports completion, and leaves no unresolved human decisions or review findings in the active thread. Tracking only bundles newly created by the latest invocation would require attribution logic and could allow older unresolved attention to be ignored.

Decision: Before starting a run, before resuming a paused run, and after every stage invocation, the executor will require both the thread's `.pending-decisions/` and `.pending-reviews/` directories to contain no files; an absent directory counts as empty. A stage advances only when the harness process exits successfully, its final non-empty output line is a valid `Outcome: DONE — …` terminal outcome, and both pending queues are empty. Any non-DONE or malformed terminal outcome, harness failure or timeout, or non-empty pending queue prevents advancement. A new run will not start when a queue is non-empty; an existing run will remain `Waiting for user` until both queues are cleared.

Rationale: A queue-wide emptiness invariant is simpler and safer than attributing files to individual invocations. It prevents unresolved decisions or findings of any severity from being bypassed, while avoiding bundle-diff tracking and severity parsing in v0.

## DR4: Represent the v0 workflow as a built-in recipe

Context: V0 needs to execute the six-stage Standard-oriented sequence while keeping the execution engine reusable for other compositions of independently invokable skills. A user-authored recipe format would add configuration and validation work beyond the MVP.

Decision: V0 will ship one built-in recipe named `standard`, represented as an ordered array of stage descriptors for `spec`, `reconcile-spec`, `review-spec`, `plan-strict`, `reconcile-plan`, and `implement-plan-with-subagents`. One generic runner will execute any such ordered recipe and apply the same invocation, checkpoint, and advancement rules to every stage. The runner will contain no branches tied to the Standard workflow or to individual stages. V0 will not expose user-defined recipe files.

Rationale: A built-in data declaration provides the requested workflow immediately while preserving the independence and composability of the skills. New built-in recipes can be added as data later, and an external recipe format can be layered over the same runner if actual use justifies its validation and compatibility surface.

## DR5: Snapshot the resolved recipe in each run

Context: A paused run may be resumed after the installed executor has changed. If its checkpoint stored only a recipe name and stage index, an updated built-in recipe could make that index refer to a different sequence or stage.

Decision: When a run is created, the executor will copy the recipe's resolved ordered stage descriptors into the persisted checkpoint. Every resume of that run will use this immutable snapshot rather than resolving the built-in recipe again. Newly created runs will use the recipe definition shipped by their installed executor version.

Rationale: Snapshotting the small stage array makes workflow resumption deterministic across executor upgrades and recipe edits without requiring recipe version migration machinery.

## DR6: Support Codex and Claude Code in v0

Context: The executor needs a coding harness capable of invoking the installed Antmay skills, including the real subagent topology required by `implement-plan-with-subagents`. Designing and validating v0 against only Codex would risk coupling the generic runner to Codex-specific invocation, output, session, or permission behavior.

Decision: V0 will support both Codex and Claude Code as first-class coding harnesses. Harness-specific command construction, configuration, streamed-output interpretation, and capability preflight will remain behind a common adapter boundary; recipes, checkpoints, stage advancement, and pending-queue gates will not depend on which of the two harnesses is selected. Other harnesses are outside the v0 support contract.

Rationale: Two independent harness implementations force the executor's core contracts to remain provider-neutral while keeping the compatibility and testing matrix bounded. This costs more than a Codex-only MVP but avoids an architecture shaped accidentally around one provider.

## DR7: Use Sandcastle behind an Antmay harness adapter

Context: Supporting both Codex and Claude Code requires provider-specific command construction, JSON-stream parsing, timeout and cancellation behavior, output logging, and process cleanup. Under DR1, v0 does not need Sandcastle's worktree, merge, container, or isolated-sandbox facilities.

Decision: V0 will depend on Sandcastle and use its public `run`, `codex`, `claudeCode`, and `noSandbox` APIs with the current checkout and head branch strategy. Antmay will wrap those APIs behind its own narrow harness adapter. Recipes, workflow checkpoints, terminal-outcome parsing, pending-queue gates, pause semantics, and resume behavior will use Antmay-owned types and logic rather than Sandcastle-specific types. Agent-session capture and agent-session resumption will be disabled; every workflow-stage invocation, including a resumed stage, will start a fresh agent conversation.

Rationale: Sandcastle removes substantial duplicated integration work for the two v0 harnesses while the adapter boundary limits dependency coupling. Keeping workflow state and interpretation outside Sandcastle preserves the option to replace it later and prevents its broader sandbox-orchestration model from defining the executor.

## DR8: Default to AI-mediated approvals

Context: V0 runs agents unattended on the host in the user's current checkout. Sandcastle can invoke both supported harnesses either with unrestricted permissions or with their AI-mediated approval modes; interactive human approval prompts would defeat AFK execution.

Decision: The default permission policy will use Codex `approvalsReviewer: "auto_review"` and Claude Code `permissionMode: "auto"`. The Antmay CLI will expose the provider-neutral flag `--dangerously-skip-permissions`; when explicitly supplied, the harness adapter will select the corresponding unrestricted permission mode for the chosen provider. The flag applies to the run and must be preserved in its checkpoint so resumed stages use the same permission policy.

Rationale: AI-mediated approval provides a safer unattended default for direct host execution. An explicitly dangerous override preserves full-autonomy use cases without making unrestricted host access an implicit consequence of running the executor.

## DR9: Store run state in the user's state directory

Context: AFK checkpoints and logs are local executor-owned operational state rather than durable repository artifacts. Keeping them outside the repository avoids extending the canonical thread layout and provides one place to discover runs across repositories.

Decision: The executor will resolve its state root in this order: `ANTMAY_STATE_HOME` when set; `$XDG_STATE_HOME/antmay` when `XDG_STATE_HOME` is set; otherwise `$HOME/.local/state/antmay`. Each run will live under `<state-root>/afk-runs/<run-id>/`, with an atomically updated `state.json` and an attempt-specific log file for every stage invocation. The checkpoint will store the absolute repository root and the repository-relative thread path. Resume will fail clearly when the recorded repository path no longer resolves rather than searching for or guessing a replacement.

Rationale: XDG-style user state is appropriate for resumable local process state and logs, requires no repository ignore rules, and supports cross-repository run discovery. The Antmay-specific override allows relocating this tool's state without changing the user's XDG configuration globally.

## DR10: Resolve execution through a workspace strategy

Context: V0 executes directly in the current checkout under DR1, but workspace isolation is expected to become configurable later. Concurrency safety depends on whether two runs mutate the same physical workspace, not on the selected recipe or on a permanent rule that all runs in one repository must serialize.

Decision: The runner will obtain its execution directory, Sandcastle sandbox and branch settings, and mutable-workspace identity from a workspace-strategy abstraction. V0 will provide one strategy, `current-checkout`, which resolves to the repository root, Sandcastle `noSandbox()`, and the head branch strategy. Before executing, a run will acquire an atomic lock keyed by the canonical path of the resolved mutable workspace. The lock will identify the owning run and process, reject concurrent execution against the same workspace, be released when execution stops, and be recoverable when its recorded process is no longer alive. Retained or paused runs hold no lock. Future isolated-worktree strategies may execute concurrently when they resolve to distinct worktree paths, while still reusing the same lock mechanism to prevent two processes from targeting one worktree.

Rationale: Treating the current checkout as one workspace configuration keeps v0 simple without baking non-isolated execution into the generic runner. Resource-keyed locking expresses the actual race boundary and remains valid when additional workspace strategies are introduced.

## DR11: Require an explicit valid thread target

Context: Repositories can contain several active threads, and the invoked skills must never guess which one is current. The executor also needs a validated thread path from which it can derive and persist the owning repository.

Decision: `antmay afk run` will always require `--thread`. The value may be an absolute path ending in `docs/threads/<thread>`, a path relative to the command's current directory ending in `docs/threads/<thread>`, or a bare `<thread>` folder name resolved as `docs/threads/<thread>` beneath the current repository root. The resolved target must be an active thread directly beneath `docs/threads/`, not an archived thread. Both `seed.md` and `decisions.md` must exist as files and each must contain non-whitespace text after trimming; otherwise preflight will fail before creating or invoking a run. The normalized repository-relative thread path will be stored in the checkpoint and named explicitly in every stage prompt.

Rationale: Mandatory explicit selection removes recency and current-directory ambiguity while retaining convenient absolute, relative, and short-name forms. Validating the two eager thread artifacts prevents the executor from starting against an arbitrary or malformed directory.

## DR12: Configure execution profiles globally per stage

Context: A recipe is a multi-stage composition whose skills may benefit from different harnesses, models, and user guidance. Restricting one run to one model would couple all stages to a choice that users already vary by task, while layered project configuration would add unnecessary discovery and precedence rules to v0.

Decision: V0 will load one global settings document and resolve an execution profile for every stage from `afk.defaults` plus an optional `afk.stages.<stage-id>` override. A profile can contain `harness`, `model`, and `prompt`. The supported harness values remain `codex` and `claude-code`, and every resolved profile must contain a supported harness and a non-empty model. The optional `prompt` supplies trusted user guidance appended to the executor-owned invocation prompt; it may request subagent roles or models, but the executor will not claim that the selected harness can enforce those requests. The executor will snapshot every fully resolved stage profile into the run at creation, and resume will use the snapshot rather than rereading changed settings. V0 will expose neither project-local settings nor per-run harness and model flags.

The config root will resolve as `ANTMAY_CONFIG_HOME` when set, then `$XDG_CONFIG_HOME/antmay`, then `$HOME/.config/antmay`. The executor will accept either `<config-root>/settings.jsonc` or `<config-root>/settings.json`, parsing JSONC syntax for the former and standard JSON for the latter. If both files exist, preflight will fail with an ambiguity error rather than silently assigning precedence.

Rationale: Global defaults with stable stage-ID overrides support heterogeneous model use without contaminating recipe definitions or creating a multi-layer configuration system. JSONC makes the settings comfortable to maintain by hand, while accepting standard JSON supports generated configuration and stricter tooling.

## DR13: Replace profile fields uniformly

Context: A stage profile can override the global execution defaults. Concatenating default and stage prompts would introduce field-specific merge behavior and make the final prompt less obvious from the settings document.

Decision: Stage profile resolution in v0 will use ordinary field replacement for `harness`, `model`, and `prompt`. When a stage override supplies a field, its value replaces the corresponding value from `afk.defaults`; when it omits a field, the default is inherited. The resolved `prompt`, when non-empty, will be appended after the executor-owned stage invocation and stored in the run snapshot.

Rationale: Applying one merge rule to every profile field keeps configuration resolution predictable and small. Users who need both shared and stage-specific prompt text can include the shared guidance explicitly in that stage's replacement prompt.

## DR14: Keep settings creation manual in v0

Context: V0 is a single-user proof of concept intended to validate the executor idea before investing in broader onboarding. An initializer or interactive settings editor would add commands and mutation behavior without improving the core execution experiment.

Decision: V0 will not provide a settings initialization or editing command and will never create a settings file automatically. The user will manually create either `settings.jsonc` or `settings.json` at the config location defined by DR12. When the file is missing or invalid, `run` will fail preflight without creating a run, report the exact accepted paths and validation problems, and point to documentation containing a complete copyable settings example.

Rationale: Manual configuration is acceptable for the sole v0 user and keeps implementation focused on proving multi-stage AFK execution. Precise diagnostics and a concrete example provide sufficient usability without building configuration management that would be more appropriate for v1.

## DR15: Provide run, resume, and list commands

Context: Run checkpoints live in a global user-state directory and resumption addresses them by run ID. Terminal output containing an ID may be unavailable later, but v0 does not need lifecycle administration for its single user.

Decision: V0 will expose `antmay afk run`, `antmay afk resume <run-id>`, and the read-only `antmay afk list`. The list command will read checkpoint files and show each run's ID, recipe, repository, thread, current stage, current execution condition, and last-update time. V0 will not provide show, cancel, delete, prune, or migration commands; the user may inspect or remove run directories manually.

Rationale: A read-only list makes globally stored runs discoverable and keeps resume usable after terminal history is lost. Omitting mutation commands keeps the CLI surface focused on the execution experiment.

## DR16: Use atomic checkpoints and defer automatic crash recovery

Context: A stage can be interrupted gracefully by a signal or terminated without cleanup by a hard kill, process crash, or power loss. Checkpoint integrity is essential for identifying the stage that was in progress, while a heartbeat-based crash-recoverable workspace lease would add machinery beyond the v0 proof of concept.

Decision: Every checkpoint transition will be written atomically by writing and flushing a complete temporary file and renaming it over `state.json`. Before launching a stage, the executor will persist its stage and attempt as executing. On a graceful interrupt, it will ask Sandcastle to abort, record the attempt as interrupted and the run as `Waiting for user`, release the workspace lock, and preserve the attempt log. After an ungraceful termination, the last atomic checkpoint and partial filesystem changes remain; the user must verify that no executor still owns the workspace and manually remove any stale lock before resuming. Resume then re-runs the recorded stage as a new attempt.

This decision supersedes only DR10's requirement that v0 automatically detect and recover a stale workspace lock when its recorded process is no longer alive. Automatic stale-lock or heartbeat recovery is deferred beyond v0.

Rationale: Atomic replacement protects the durable stage cursor from torn JSON during abrupt shutdown. Manual stale-lock recovery is acceptable for the single v0 user and avoids implementing and testing leases, heartbeats, process-identity validation, and reboot recovery before the core workflow idea is proven.

## DR17: Isolate the CLI in a root-level cli package

Context: The repository remains primarily a distributable skill suite, while the AFK executor is a secondary executable with runtime dependencies, a build, and automated tests. A repository-root package would make the secondary tool define the root, while a `packages/` workspace convention would add monorepo structure for only one package.

Decision: The executor will live in a self-contained private Node/TypeScript package under `cli/`, with its own `package.json`, lockfile, TypeScript configuration, source, tests, build output, dependencies, and `antmay` binary mapping. The repository root will not become an npm workspace. Development commands will run from `cli/` or through `npm --prefix cli ...`, and the sole v0 user may install the binary locally with `npm link` from that directory. Public package publication and end-user installation UX are deferred.

Rationale: A root-level `cli/` directory makes the secondary executable visible and independent without changing the package identity of the skill repository or introducing unnecessary workspace machinery.

## DR18: Delegate dirty-worktree policy to invoked skills

Context: `implement-plan-with-subagents` has its own non-skippable dirty-worktree preflight and reports `Outcome: REFUSED` unless its invocation already contains the explicit authorization that existing changes may enter its commits. Earlier recipe stages normally leave specification and plan artifacts uncommitted, but adding executor-specific Git checks or authorization would couple the generic runner to one stage.

Decision: The executor will not inspect, classify, clean, stash, commit, or authorize dirty-worktree changes. It will invoke each stage with its snapshotted profile and apply the common terminal-outcome gate. A dirty-worktree refusal from an invoked skill will therefore place the run in `Waiting for user` at that stage. The user may clean or commit the changes and resume, or may place the skill's required advance authorization in that stage's global settings `prompt` before creating a future run. The executor will treat such prompt text as opaque trusted user guidance and will not synthesize it.

Rationale: Silence keeps workspace safety and Git policy inside the skill that owns them and preserves a stage-independent executor. This accepts that the built-in recipe can pause before implementation unless the user prepared the required authorization or cleans the checkout; that pause is accurate behavior rather than an executor failure.

## DR19: Stream curated progress and retain verbose attempt logs

Context: AFK stages can run long enough that stage-boundary-only output appears stalled, while raw Codex and Claude Code event streams are noisy and provider-specific. Sandcastle exposes normalized text and tool-call events and can retain verbose output.

Decision: During execution, the CLI will print the run and recipe identity, stage position and name, parsed agent text, concise tool-call activity, elapsed time, and the final advancement or pause result. Every stage attempt will simultaneously write a verbose provider log in the run's logs directory. When a run pauses, the CLI will print the reason, any relevant pending-bundle paths, the run ID, the attempt-log path, and the exact resume command. The terminal renderer will consume Sandcastle's normalized events rather than provider-specific raw JSON.

Rationale: Curated live progress keeps long runs observable and consistent across both harnesses, while verbose per-attempt logs retain the evidence needed to diagnose malformed output, provider errors, and interrupted execution.

## DR20: Use a 24-hour default idle timeout

Context: A completion-oriented skill can delegate a long-running subagent while its parent harness emits no output. Observed implementation work has included more than one hour of legitimate silence and total runs around eleven hours, so Sandcastle's ten-minute output-idle default would terminate healthy stages. Sandcastle 0.12.0 accepts only a numeric idle timeout and exposes no disabled value.

Decision: Antmay will pass a default `idleTimeoutSeconds` of 86,400 seconds to Sandcastle and will apply no total wall-clock timeout. Execution profiles may optionally set `idleTimeoutSeconds` in `afk.defaults` or a stage override; stage resolution and run snapshotting will treat it with the same replacement rule as `harness`, `model`, and `prompt`. The value must be a positive finite number. An actual idle timeout will place the run in `Waiting for user` at the same stage with no automatic retry. Ctrl-C remains the normal way to stop a suspected hang.

Rationale: A 24-hour idle threshold is effectively disabled for observed legitimate runs while remaining compatible with Sandcastle's public API. Optional profile replacement avoids special-casing the implementation stage and allows real usage to tune the threshold later.

## DR21: Use terminal outcomes as process completion signals

Context: With the 24-hour idle threshold from DR20, an agent that has logically finished can remain attached for hours when a spawned child keeps its output pipe open. Sandcastle can begin a short completion grace period after recognizing a configured assistant-output substring, but that mechanism does not validate the stage result.

Decision: The harness adapter will configure `Outcome: DONE —`, `Outcome: BLOCKED —`, and `Outcome: REFUSED —` as Sandcastle completion signals and retain its 60-second post-signal grace period. Whether the process exits normally or Sandcastle force-completes it after that grace period, the executor will still parse the captured final non-empty result line and apply the pending-queue gate from DR3. Signal detection alone will never advance a stage; incomplete, malformed, BLOCKED, and REFUSED results will pause it.

Rationale: Terminal-prefix signals bound the wait after logical completion without weakening the executor's stricter result contract. Separating process completion from stage advancement protects against early or incidental signal text.

## DR22: Use distinct CLI exit codes without emitting Outcome

Context: `Outcome:` is the terminal protocol of each completion-oriented skill invocation. The executor needs separate shell-level signaling for complete recipes, durable pauses, preflight failures, and user interruption without presenting itself as another skill outcome.

Decision: `run` and `resume` will exit `0` only when the whole recipe is complete; `2` when the checkpoint is durably `Waiting for user`, including non-DONE outcomes, pending queues, harness failures, malformed output, and idle timeouts; `1` for command or preflight failures before useful execution, including invalid arguments or configuration, invalid thread selection, an unknown run, ambiguous settings files, or lock contention; and `130` after Ctrl-C with best-effort checkpointing and cleanup. Final terminal output will name the run ID and its current condition. Waiting output will include the reason and exact resume command. The CLI itself will never print a line beginning with `Outcome:`.

Rationale: Distinct exit codes make the CLI useful interactively and from shell automation while preserving `Outcome:` as evidence produced and consumed only at the skill-stage boundary.

## DR23: Preflight required harness executables only

Context: A resolved recipe can use Codex and Claude Code across its stages. Executable availability is deterministic local setup, while authentication, model access, installed-skill discovery, and subagent capability are dynamic or provider-specific and cannot be proven reliably without attempting real work.

Decision: Before creating a new run, the executor will collect the distinct harnesses referenced by its resolved stage profiles and verify that each corresponding executable is available on `PATH` and responds successfully to its version command. It will report all unavailable harnesses together and create no run on failure. It will not preflight credentials, model access, skill installation, or subagent support; failures in those areas will be captured through the normal stage invocation and `Waiting for user` behavior.

Rationale: Executable checks catch cheap, deterministic setup errors without building brittle provider-specific probes or consuming model calls. Dynamic failures remain observable and resumable through the executor's existing gate.

## DR24: Keep the sole workspace strategy internal in v0

Context: The runner has a workspace-strategy boundary under DR10, but v0 exposes only `current-checkout`. A user-facing selector with one legal value would add settings ceremony without enabling a choice.

Decision: V0 settings will contain no workspace field. The run builder will internally resolve the sole `current-checkout` strategy and snapshot its resolved workspace configuration into the checkpoint. When a second workspace strategy is implemented, that change may introduce a user-facing selector using the existing internal strategy boundary.

Rationale: The architecture remains extensible without requiring users to configure a value they cannot vary. Introducing the settings surface alongside the first real alternative keeps v0 smaller and avoids premature schema commitments.

## DR25: Support macOS only in v0

Context: V0 is a single-user proof of concept whose actual execution environment is macOS. Cross-platform support would broaden the validation surface for configuration paths, executable discovery, signals, atomic checkpoint replacement, process exit behavior, workspace locking, and path normalization.

Decision: V0 will claim and test support only on macOS. The implementation may use platform-neutral Node APIs where convenient, but Linux and Windows behavior will be incidental and undocumented rather than part of the acceptance contract.

Rationale: Confining the support claim to the environment that will actually exercise v0 keeps effort focused on validating the AFK workflow concept. Cross-platform guarantees can be added when additional users and environments justify their test and maintenance cost.

## DR26: Persist a versioned checkpoint with explicit transitions

Context: A resumable run must distinguish a stage that is merely next from an attempt whose harness process actually began. It also needs enough structured attempt history to explain pauses and preserve deterministic resumption without copying verbose provider output into the checkpoint.

Decision: V0 `state.json` will use `schemaVersion: 1` and store the run and executor identities; UTC creation and update timestamps; absolute repository root; repository-relative thread path; resolved workspace configuration; the dangerous-permission choice; the immutable recipe snapshot with every resolved stage profile; the current zero-based stage index; the run condition; an ordered attempt history; and an optional waiting reason. Run conditions are `ready`, `executing`, `waiting-for-user`, and `completed`. Attempt results are `executing`, `done`, `waiting`, and `interrupted`. Each attempt records its number, stage index and ID, timestamps, result, parsed terminal outcome when present, pending-file paths, human- and machine-readable failure information when applicable, and a run-relative log path.

Before spawning a harness, the executor will atomically persist a new executing attempt. A successful stage finishes that attempt, advances the stage index, and persists `ready`, or `completed` when the index reaches the recipe length. A paused stage finishes the attempt and persists `waiting-for-user` without advancing. After manual stale-lock recovery from an abandoned executing checkpoint, resume will mark the abandoned attempt interrupted and create a new attempt for the same stage. Timestamps use ISO-8601 UTC; stored repository-internal and log paths use normalized relative POSIX form where applicable. An unknown schema version fails clearly, and v0 performs no checkpoint migration.

Rationale: Explicit ready and executing conditions close the crash window between stage advancement and process launch. A small versioned state model supports deterministic retries, useful listing, and future schema evolution while keeping full diagnostics in per-attempt logs.

## DR27: Replace checkpoints with a flushed same-directory temporary file

Context: Checkpoint readers must never observe partial JSON, and abrupt power loss should leave either the preceding valid checkpoint or its complete replacement. Run state and logs can contain local paths and trusted prompt guidance that should remain private to the user.

Decision: Every checkpoint creation and update will serialize deterministic two-space JSON with a trailing newline, exclusively create a uniquely named temporary file beside `state.json` with mode `0600`, write the complete document, flush and close the file, atomically rename it over `state.json`, and best-effort flush the containing directory. Antmay state directories will use mode `0700`, and attempt logs will use mode `0600`. Readers will treat only `state.json` as authoritative and ignore leftover temporary files. The executor will never truncate a checkpoint in place and will keep no automatic backup copy in v0.

If persistence fails before a stage launch, the stage will not launch. If it fails after a stage returns, the executor will not advance or launch another stage; it will report a fatal checkpoint error and leave the previous valid checkpoint and attempt log for manual recovery. `list` will report malformed or unreadable checkpoints individually while continuing to process other run directories.

Rationale: Same-directory atomic rename plus file flushing provides the strongest practical macOS durability without a journal or database. Private modes protect local operational details, and stopping on persistence failure prevents execution from outrunning its recoverable cursor.

## DR28: Lock the canonical mutable workspace with an exclusive file

Context: Separate run directories can target the same physical checkout, while future workspace strategies may target distinct worktrees. V0 defers automatic stale-lock recovery, so ownership must be globally coordinated and manually diagnosable.

Decision: Workspace locks will live at `<state-root>/afk-locks/<sha256>.lock`, where the digest is computed from the workspace path resolved through `realpath`. Acquisition will exclusively create the file with mode `0600`, then write and flush a versioned record containing the canonical workspace path, run ID, executor PID, UTC acquisition time, and a random owner token. The process will hold the lock across the uninterrupted stage sequence and release it on completion, durable pause, graceful interruption, or ordinary failure. Release will verify that the stored owner token still matches before unlinking.

An existing lock will cause exit `1`; the executor will print its metadata and exact path and will never delete or reclaim it automatically. Documentation will instruct the user to verify the recorded process is gone before manually removing a stale file. New-run preflight will validate arguments, settings, thread, and harness executables before generating a run ID and acquiring the lock; it will then recheck pending queues under the lock before creating the checkpoint. Resume will load its checkpoint, acquire the recorded workspace lock, revalidate the thread and queues, and only then transition or execute.

Rationale: Hashing a canonical physical path makes the lock follow the actual mutation boundary rather than a recipe or repository label. Exclusive creation provides a small atomic mutex, while ownership metadata and tokens make ordinary release and manual stale recovery safer.

## DR29: Parse an outcome token from the final result line

Context: Sandcastle completion signals are literal substring matches rather than regular expressions, and it accepts either one string or an array of strings. Process-lifecycle detection must remain separate from Antmay's authoritative interpretation of the stage result.

Decision: The harness adapter will give Sandcastle the three literal completion signals `Outcome: DONE`, `Outcome: BLOCKED`, and `Outcome: REFUSED`. Antmay will independently normalize line endings, locate the trimmed final non-empty line of the single captured iteration result, and match it from the start against `^Outcome: (DONE|BLOCKED|REFUSED)\b`. It will accept a bare token or any trailing detail format and will not require an em dash. The attempt will store the complete candidate line, the parsed token, and any remaining text as uninterpreted optional diagnostic detail. Earlier outcome text and the particular Sandcastle signal matched will not determine advancement.

Rationale: Literal alternatives fit Sandcastle's actual API and bound hanging processes after a likely terminal response. Antmay's anchored final-line parser remains the authoritative gate while avoiding unnecessary coupling to the punctuation used after the outcome token.

## DR30: Pause durably on a missing or malformed outcome

Context: Sandcastle returns normally when a harness process exits successfully even if no configured completion signal appeared; the signals are optional assistance for a process that remains open after logical completion. Filesystem changes alone cannot establish that a completion-oriented skill fulfilled its contract when its final result line carries no recognizable outcome token.

Decision: When Sandcastle resolves but Antmay cannot parse a valid outcome token from the final non-empty result line, the executor will finish the attempt as waiting, persist the run as `waiting-for-user` at the same stage with reason kind `malformed-outcome`, preserve all filesystem changes and the attempt log, release the workspace lock, and exit `2`. It will print the expected prefixes, the unrecognized candidate line when present, the log path, a warning that files may have changed, and the exact resume command. V0 will not infer success from files, retry automatically, resume the agent session, or offer a manual mark-success override. Explicit resume starts a fresh attempt of the same stage against the existing filesystem.

Rationale: Pausing preserves possibly valid work without converting ambiguous output into success or repeating side effects automatically. Re-running only after human inspection keeps advancement evidence-based and consistent with the strict stage contract.

## DR31: Render simple harness invocations from declarative stage targets

Context: Sandcastle has no skill-loading or skill-invocation abstraction; it passes a plain prompt to the selected coding harness, which owns skill discovery and invocation. The six built-in stages do not all take the thread root as their most useful explicit argument, and duplicating their full artifact preflight in the executor would create a second source of truth.

Decision: Every recipe stage descriptor will contain a stable `id`, a `skill`, and a declarative target of either `thread-root` or `thread-file` with a thread-relative path. The built-in `standard` recipe will target the thread root for `spec`; `spec.md` for `reconcile-spec`, `review-spec`, and `plan-strict`; and `plan.md` for `reconcile-plan` and `implement-plan-with-subagents`. Target resolution will produce a normalized repository-relative path, add a trailing slash for the thread root, and reject any descriptor that escapes the selected thread.

The harness adapter will render exactly `<trigger> \`<resolved-target>\`.` and append a space plus the resolved profile `prompt` only when that prompt is non-empty. Codex uses `$<skill>` as the trigger and Claude Code uses `/<skill>`; the trigger is the first prompt content. The executor will add no generic or Standard-specific instructions. Beyond DR11's seed and decision-log validation, the runner will not duplicate skill artifact preconditions: missing, empty, or malformed specifications and plans remain for the invoked skill to refuse through its own terminal outcome, which the common gate will pause.

Rationale: Declarative targets make the recipe precise while keeping execution generic. A minimal familiar invocation shape preserves harness-native skill behavior, and delegating prerequisite semantics prevents executor checks from drifting away from independently maintained skills.

## DR32: Validate one strict JSON settings schema

Context: V0 needs deterministic per-stage profile resolution, but JSONC support would add a parser dependency and dual-file discovery behavior without contributing to the execution proof of concept.

Decision: V0 will accept only `<config-root>/settings.json`, parsed as strict JSON; `settings.jsonc`, comments, and trailing commas are deferred. This supersedes DR12's JSONC filename, parser, and two-file ambiguity rules while retaining its config-root resolution.

The document root and `afk` must be objects; `afk.defaults` and `afk.stages` may be omitted or empty objects. Profiles may contain only `harness`, `model`, `prompt`, and `idleTimeoutSeconds`. Harness is `codex` or `claude-code`; model is a non-empty string; prompt is a string; idle timeout is a positive finite integer. Unknown fields at every level and stage keys absent from every installed built-in recipe are errors. Syntax diagnostics will name the file and parser location, and schema validation will report all discovered errors together using property paths. Settings perform no environment interpolation and store no credentials.

For each selected stage, resolution starts with built-in `prompt: ""` and `idleTimeoutSeconds: 86400`, shallow-merges `afk.defaults`, then shallow-merges the matching stage override, and finally requires a resolved harness and model. Defaults may omit harness and model when every selected stage supplies them. The checkpoint stores only fully resolved profiles, not the raw settings document.

Rationale: Strict JSON uses the platform parser and leaves one unambiguous config path. Strict schema validation catches configuration mistakes early, while shallow replacement remains consistent with DR13 and the snapshotted execution model.

## DR33: Use a small strict TypeScript ESM toolchain

Context: The isolated `cli/` package needs durable-state safety and provider integration without introducing a framework-heavy secondary application. The repository currently has no executable build, so its commands and dependency boundary must be explicit.

Decision: The CLI will target Node.js `>=22`, use ESM and strict TypeScript, build its executable entry with `tsup`, test with Vitest, and use npm with a package-local lockfile. It will expose the built shebang entry as the `antmay` binary. Command and flag parsing will use Node's `util.parseArgs`; state, lock, hashing, signal, and path behavior will use built-in Node APIs; and the small settings and checkpoint schemas will use manual typed validators. Sandcastle will be pinned initially to the exact public version validated during design, `0.12.0`. No CLI, logging, configuration, database, schema, or dependency-injection framework will be added.

The package will provide `build`, `typecheck`, `test`, and `check` scripts, with `check` running typecheck, tests, and build. Runtime code will be separated by responsibility across CLI parsing, settings, recipes, checkpoints, locking, harness adaptation, execution, and display rather than accumulated in one large entry file.

Rationale: This toolchain supplies strong typing, focused tests, and a distributable local binary with few moving parts. Built-in Node facilities cover the v0 surface, while exact dependency pinning protects the adapter from unreviewed Sandcastle API drift.

## DR34: Verify the runner deterministically and smoke-test real harnesses

Context: The executor's durable state and advancement rules require broad automated coverage, but automated tests must not consume paid model calls or depend on user credentials. Real harness invocation syntax still needs limited validation outside fakes.

Decision: The generic runner will depend on an injected harness interface so automated Vitest suites can deterministically cover settings validation and resolution; all thread-path forms and genesis validation; recipe targets and Codex/Claude prompt rendering; outcome parsing and pending-queue gates; every checkpoint transition and atomic-write failure behavior; canonical-path workspace locks and owner-token release; complete, paused, interrupted, malformed, timed-out, and resumed runs; Sandcastle option mapping and provider-neutral errors; CLI exit codes, diagnostics, and list behavior. Tests will use temporary directories, disposable Git repositories, fake harness processes, and fake version executables on `PATH`. They will specifically prove that completed stages do not rerun, config edits do not alter snapshots, preflight failures create no run, and queue checks repeat under the lock.

Before v0 is declared usable, a documented manual checklist will build and locally link the CLI, invoke at least one installed skill through Codex and one through Claude Code in disposable Standard runs, verify curated streaming and verbose logs, confirm recognized outcomes, and exercise one real pause and resume. This checklist is not an automated credentialed gate. The required automated gate is `npm --prefix cli run check`.

Rationale: Fakes make failure paths and crash-sensitive transitions repeatable without external cost, while two small real-provider smokes validate the one boundary mocks cannot prove: installed-skill invocation through each harness.

## DR35: Use opaque UTC-plus-random run IDs and immutable attempt logs

Context: Global state needs collision-resistant human-readable run directories and unambiguous logs across repeated attempts of the same stage. Checkpoint content, rather than lexical folder ordering, remains authoritative.

Decision: Run IDs will use `<YYYYMMDDTHHmmssSSSZ>-<8-lowercase-hex>`, with the suffix generated from four cryptographically random bytes. The executor will create `<state-root>/afk-runs/<run-id>/` exclusively and regenerate on collision. Attempt logs will live under its `logs/` directory and use `<two-digit-stage-ordinal>-<stage-id>-attempt-<two-digit-attempt>.log`; each file is exclusively created and never appended to or overwritten by another attempt. `state.json` stores run-relative log paths.

Each verbose text log will begin with an Antmay header naming the run, stage and ordinal, attempt, harness, model, repository, thread, and UTC start time, followed by Sandcastle's verbose stream. Completed and paused runs remain until manually removed. `list` will sort valid checkpoints by `updatedAt` descending rather than folder name, and consumers will treat directory names as opaque run IDs after allocation.

Rationale: The timestamp aids manual discovery, random bytes make collisions negligible, and immutable attempt files preserve retry evidence. Sorting and interpretation from checkpoint fields prevents filename conventions from becoming a second state model.

## DR36: Resume only from a valid immutable run snapshot

Context: Resume must continue the exact recipe and execution choices originally accepted, while revalidating external facts that can change between attempts. It must also distinguish a durable pause, a between-stage ready cursor, and an abandoned executing attempt.

Decision: `antmay afk resume <run-id>` will load and validate the checkpoint; reject unknown, malformed, or completed runs; verify that the recorded repository remains the Git root containing the recorded active thread; revalidate non-empty seed and decision files; verify the current stage's snapshotted harness executable; resolve the snapshotted workspace and require its canonical path to match; acquire its lock; and recheck both pending queues under that lock.

A waiting run with non-empty queues remains unchanged, prints the remaining files, releases the lock, and exits `2`. A waiting run with empty queues starts a new attempt at the same stage. A ready run starts its stored next stage. An executing run can proceed only after the user manually removes any stale lock; resume then atomically marks the abandoned attempt interrupted and starts a new attempt at the same stage. Completed runs report that fact and exit `1`. Resume never rereads settings or current recipe definitions, accepts no execution overrides, and resumes no agent session. After the retried stage succeeds, it continues through subsequent snapshotted stages until another pause or completion. Any resume preflight failure leaves the checkpoint unchanged.

Rationale: Snapshot-only resumption prevents configuration drift and accidental stage skipping, while revalidating mutable filesystem and executable facts catches environment changes before another agent starts.

## DR37: Create a run only after complete preflight and locked queue recheck

Context: Invalid commands and environments should leave no run residue, while pending queues can change between an initial check and workspace ownership. The initial checkpoint is the boundary after which durable run semantics apply.

Decision: `antmay afk run <recipe> --thread <target>` will strictly reject unknown flags, missing values, and extra positionals; resolve an exact built-in recipe; resolve the mandatory thread in one of DR11's three forms and validate its owning Git root, active location, seed, and decision log; load and validate settings; resolve every stage target and profile; verify every distinct harness executable; and confirm both pending queues contain no regular files directly inside them. An absent queue directory is empty, and v0 will not interpret bundle contents.

Only after that preflight will it generate the run ID and snapshot, resolve the canonical workspace, acquire its lock, and repeat the queue check under the lock. It will then exclusively create the run directory and initial ready checkpoint before launching any harness. Failures before the checkpoint, including lock contention or a queue race, exit `1`, release any acquired lock, and create no run. A run-directory or initial-checkpoint creation failure releases the lock, identifies any partial path, exits `1`, and launches no harness. Once the initial checkpoint exists, later failures use durable pause or fatal-checkpoint behavior as already defined. The only optional new-run execution flag is `--dangerously-skip-permissions`.

Rationale: Delaying allocation keeps preflight failures clean, and repeating the queue invariant after exclusive workspace acquisition closes the only meaningful start-time race before agents mutate the checkout.

## DR38: List checkpoints read-only and surface partial corruption

Context: Global run discovery must remain useful when one checkpoint is damaged, and v0 has no crash-recoverable lease with which to verify an executing record's owner.

Decision: `antmay afk list` will read immediate run directories independently, ignore unrelated non-directory entries, validate each `state.json`, sort valid runs by `updatedAt` descending, and never acquire locks or mutate state. It will show updated time, friendly condition, run ID, recipe, one-based stage position and ID, current harness/model, absolute repository path, and repository-relative thread path. Ready, waiting, and completed conditions render as `Ready`, `Waiting for user`, and `Completed`; executing renders `Executing (unverified)`. Completed runs show the final stage count and no harness/model. Optional color applies only to TTY output and does not carry meaning.

A missing or empty runs directory prints `No AFK runs found.` and exits `0`. Each malformed or unreadable checkpoint produces an stderr warning with its directory, path, and validation error while valid runs still print. Any such partial failure makes the command exit `1`; otherwise it exits `0`. V0 provides no JSON output, filters, pagination, cleanup, or reconstruction of damaged rows from directory names.

Rationale: Independent reads prevent one corrupt run from hiding healthy state, while a nonzero partial-failure result remains script-visible. Labeling execution unverified avoids claiming liveness that v0 does not measure.

## DR39: Invoke Sandcastle once per stage through a narrow fixed adapter

Context: The executor uses only a small subset of Sandcastle and must keep provider and library behavior from leaking into recipes or checkpoints.

Decision: Every attempt will call Sandcastle `run` once with the resolved provider, `noSandbox()`, repository-root cwd, head branch strategy, inline rendered prompt, one iteration, the three literal outcome completion signals, a 60-second completion grace, the resolved idle timeout, file logging with verbose raw events and a normalized-event callback, and an attempt AbortSignal. It will set no prompt file, hooks, environment overrides, copy rules, structured output, retries, session resume, or session fork. It will inherit user environment, ignore Sandcastle commit and branch fields, and parse only the single captured result through Antmay's outcome gate.

Safe Codex profiles use session capture disabled and `approvalsReviewer: "auto_review"`; safe Claude Code profiles use session capture disabled and `permissionMode: "auto"`. For a run created with `--dangerously-skip-permissions`, both providers disable session capture and omit those safe options so Sandcastle selects its unrestricted AFK invocation. The adapter will forward normalized text and tool-call events to Antmay's display, preserve raw events in the attempt log, normalize thrown errors while retaining their class and message as diagnostics, and expose no Sandcastle-specific types to the runner.

Rationale: One fixed invocation shape makes stage behavior predictable and testable, while the adapter isolates permission mapping, event formats, and library errors from the durable workflow model.

## DR40: Abort and checkpoint on the first graceful signal

Context: An active stage may receive an interrupt, termination, or terminal-hangup signal, while a second signal commonly expresses an intent to stop immediately. Signal-triggered adapter rejection must not be mistaken for a provider defect.

Decision: V0 will handle `SIGINT`, `SIGTERM`, and `SIGHUP`. On the first signal it will stop scheduling stages, abort the active Sandcastle call, and, when an attempt is executing, atomically finish it as interrupted and persist the run as `waiting-for-user`; when between stages in ready condition, it will leave that durable cursor unchanged. It will preserve files and logs, release its owned lock, and exit `130`, `143`, or `129` respectively. Before an initial checkpoint exists, it will exit without creating a run.

A second signal during cleanup will exit immediately with the corresponding conventional code and make no further checkpoint or lock-cleanup guarantee; manual stale-lock recovery may then be required. A rejection caused by the first signal is classified as interruption, never as a harness failure, and no new attempt or stage may start afterward. Hard kills and power loss remain DR16's manual recovery case.

Rationale: One graceful cancellation attempt protects the durable cursor and shared workspace, while honoring a second signal avoids making the CLI feel unkillable when a provider does not shut down promptly.

## DR41: Persist a closed waiting-reason taxonomy

Context: Paused runs need stable machine-readable causes for listing and resumption together with complete human diagnostics, without reconstructing meaning from provider logs.

Decision: A `waiting-for-user` checkpoint will carry one waiting object whose kind is exactly one of `outcome-blocked`, `outcome-refused`, `pending-queues`, `malformed-outcome`, `harness-error`, `idle-timeout`, or `interrupted`. It will always include a complete human message and normalized repository-relative pending-file paths when applicable; it may include a candidate outcome line and structured error diagnostics. Harness diagnostics retain the provider-neutral category plus Sandcastle class and message, idle timeout stays distinct, and interruption records its signal or manual-recovery origin.

Pending files take precedence over a recognized BLOCKED or REFUSED token and select `pending-queues`, because emptying the queues is the concrete resume requirement. Without pending files, parsed tokens select their matching reason. Malformed results retain their final candidate when available. Ready and completed runs, and successful stage transitions, store `waiting: null`. Terminal rendering consumes the stored object and adds operational paths and the resume command rather than inferring a cause from logs.

Rationale: A small closed vocabulary makes pause behavior testable and listable, while persisted explanatory text and evidence preserve useful diagnostics across terminal loss and software restarts.

## DR42: Resolve config and state homes from absolute environment paths

Context: Global configuration and run state must resolve consistently across working directories, and implicit shell expansion would make persisted run discovery dependent on invocation context.

Decision: The config root will use the first non-empty value among `ANTMAY_CONFIG_HOME`, `$XDG_CONFIG_HOME/antmay`, and the resolved user home plus `.config/antmay`. The state root will likewise use `ANTMAY_STATE_HOME`, `$XDG_STATE_HOME/antmay`, and the user home plus `.local/state/antmay`. Any selected environment value must be absolute; relative values are errors. The executor will not expand tildes, nested environment references, or shell syntax, and empty values count as unset. It will normalize paths without changing their actual macOS case and fail clearly if no user home is available.

Settings remain read-only and are never created. State directories are created lazily only for new-run allocation. `list` treats absent state and runs directories as no runs without creating them; `resume` treats them as an unknown run. Missing-config diagnostics print the fully resolved expected `settings.json` path.

Rationale: Absolute non-expanding resolution makes global state stable and predictable, while XDG-compatible fallbacks and app-specific overrides cover both conventional and custom layouts without a project-local layer.

## DR43: Show curated stage progress with a local elapsed heartbeat

Context: Long-running and potentially silent subagents need visible liveness without exposing provider-specific JSON, while every attempt already has a verbose durable log.

Decision: New runs will print a compact summary of run ID, recipe, thread, workspace, permission mode, and stage count, with a prominent warning for unrestricted permissions. Every attempt will print its stage position and ID, harness/model, attempt number, and absolute log path. The live view will render normalized assistant text and concise tool-call lines, truncating only displayed arguments while preserving full raw data in the log. An Antmay-owned display heartbeat will print elapsed time every five minutes regardless of harness output and will not affect Sandcastle's idle timer.

TTY output may use color, must honor `NO_COLOR`, and will avoid spinners that interfere with streams. Normal messages go to stdout and warnings or errors to stderr. Stage success prints its position and duration. Durable pause prints the stored reason, pending paths, log, run ID, and exact resume command. Recipe completion prints the run, recipe, total elapsed time, and absolute checkpoint path. The terminal never prints raw provider JSON or an executor-owned `Outcome:` line.

Rationale: A periodic local heartbeat makes multi-hour silent delegation visibly alive, while curated normalized events and clear handoff messages provide useful observation without sacrificing provider neutrality or log completeness.

## DR44: Recheck queues around every attempt and prioritize actionable pending files

Context: Pending files can appear between stages or alongside a provider failure, and advancing is unsafe whenever the executor cannot establish the queue invariant. A concrete pending bundle is more actionable than a simultaneous generic outcome or harness error.

Decision: The executor will scan both pending directories during initial preflight, after lock acquisition, immediately before each stage attempt, after every harness return or error, and during locked resume preflight. It will collect direct regular files from both queues, normalize and lexically sort their paths, and never read bundle bodies. A queue present before a stage pauses without launching or allocating another attempt. After an attempt, any pending file selects `pending-queues` and takes precedence over parsed outcomes and provider errors; otherwise idle timeouts, other harness errors, and final-outcome parsing are classified in that order.

DR41's waiting vocabulary gains `gate-error` for an existing run whose advancement invariant cannot be evaluated, such as an unreadable pending directory. A queue-read error during initial preflight exits `1` with no run. During an existing run it durably pauses the same stage with `gate-error`, releases the lock, and exits `2`; a failure to write that pause follows DR27's fatal checkpoint path.

Rationale: Bracketing every invocation closes human and external races not prevented by the executor lock. Prioritizing pending paths tells the user exactly what to resolve, while a dedicated gate error prevents filesystem uncertainty from being mislabeled as an agent defect.

## DR45: Expose a strict non-interactive afk command namespace

Context: The executor is a secondary Antmay tool whose v0 surface should remain scriptable and leave room for unrelated future commands.

Decision: V0 will support `antmay afk run <recipe> --thread <path> [--dangerously-skip-permissions]`, `antmay afk resume <run-id>`, `antmay afk list`, and help/version forms at the top level, namespace, and subcommand levels. `standard` is the only recipe. `-h` is the only short flag; all other options use documented long names. Help and version exit `0` without loading config, state, Git, or harnesses. Invalid grammar prints the nearest usage to stderr and exits `1`.

Run and resume never prompt. List accepts no option except help. Resume requires exactly one run ID and accepts no execution override; the dangerous-permission flag belongs only to run. V0 provides no aliases, completion, telemetry, update checks, interactive selection, or hidden fallback commands, and keeps the `afk` namespace explicit.

Rationale: A small strict grammar is straightforward to test and automate, while namespacing prevents this secondary executor's options and lifecycle from defining the shape of every future Antmay CLI capability.

## DR46: Use a modular source layout as a baseline recommendation

Context: A junior implementer needs enough architectural guidance to preserve recipe independence and testable boundaries, but an exact file tree chosen before implementation could force awkward splits or needless indirection.

Decision: The specification will recommend, rather than require, a modular `cli/src/` layout with a thin `main.ts` and focused areas for CLI parsing and dispatch, configuration, recipes, thread resolution and pending queues, harness integration and prompt construction, durable state and locking, runner orchestration, and terminal display. Tests should broadly mirror those responsibilities. The implementer may merge, split, or rename modules when that improves cohesion.

The architectural boundaries remain requirements: command dispatch must not own workflow behavior; the runner must consume resolved recipe and stage data without branching on `standard` or individual skill names; Sandcastle-specific types and behavior must remain behind the harness adapter; and persistent-state, queue-gate, and terminal-display concerns must not be conflated. Prefer plain typed functions and inject only unstable boundaries needed for deterministic tests. V0 does not need a dependency-injection framework, repository abstraction, or class hierarchy.

Rationale: A suggested layout gives a junior developer a safe starting point without treating speculative filenames as product behavior. Binding the important dependency directions instead preserves extensibility even when implementation details evolve.

## DR47: Derive the workspace from the canonical active-thread path

Context: `--thread` accepts bare, relative, and absolute forms, including paths into another checkout. The executor needs one unambiguous repository root for harness execution, persistence, and locking without trusting lexical paths or assuming the invocation directory is always the target workspace.

Decision: A bare thread-folder value will be resolved beneath `docs/threads/` of the Git worktree containing the current directory. A value containing a path separator will be resolved as an absolute path or relative to the current directory and must lexically end in exactly `docs/threads/<single-thread-folder>`. Antmay will canonicalize the existing target and use Git from that target to obtain the worktree top level. The canonical Git root must equal the path portion preceding `docs/threads`, and the canonical target must be exactly one direct child of that root's active `docs/threads/` directory. Symlink escapes, nested thread suffixes, archived paths, bare repositories, and mismatched worktree roots are preflight errors.

The canonical Git worktree root will be the Sandcastle working directory, current-checkout workspace identity, lock identity input, and absolute repository path persisted in the run. The thread will be persisted as the normalized repository-relative path `docs/threads/<thread-folder>`. Failure to execute Git, locate a worktree, canonicalize the target, or establish this exact relationship will fail before state or lock creation.

Rationale: Deriving execution context from the selected thread supports cross-checkout absolute paths while ensuring every accepted target is an active thread belonging to the same canonical worktree the harness will mutate.

## DR48: Probe only selected harness executables and record their reported versions

Context: Preflight should catch a missing or broken harness installation without turning v0 into a compatibility database or making authentication and model calls before the run begins.

Decision: The fixed executable mapping will be `codex` to `codex` and `claude-code` to `claude`. A new run will probe every distinct harness selected by its resolved recipe, while resume will probe only the snapshotted harness of the current stage. Antmay will execute the mapped binary with `--version` directly through the inherited `PATH`, without a shell, from the canonical repository root and with a fixed 10-second timeout. Success requires exit code `0` and non-whitespace version output. Diagnostics will identify the affected stage or profile, binary, and spawn, timeout, signal, exit, or output failure.

V0 will neither parse version semantics nor enforce provider minimum versions, authenticate, list models, load skills, or make a paid inference call during preflight. The observed trimmed version line will be included in the attempt-log header but will not modify the immutable settings snapshot or determine resume compatibility. Only profiles selected by the recipe require an installed binary; structurally invalid settings still fail globally even when the invalid field belongs to an unused profile. Node 22 or newer is enforced by package metadata and an early runtime guard, while successful Git-backed thread resolution establishes Git availability.

Rationale: A direct version probe catches the common local-installation failure cheaply and deterministically, while avoiding claims about provider compatibility that Antmay cannot establish without maintaining additional policy.

## DR49: Commit only a positively completed stage

Context: The Standard recipe's authoring and reconciliation skills deliberately leave their tracked artifacts uncommitted, while `implement-plan-with-subagents` owns reviewed per-task commits itself. Advancing through all stages unattended therefore needs executor-owned Git boundaries, but a missing, malformed, blocked, refused, or failed result may leave partial or unreviewed work that must not be committed as if it were complete.

Decision: A new AFK run will require a clean Git worktree before its first checkpoint, superseding DR18's executor-silence policy where commit ownership makes that silence unsafe. After a stage attempt, Antmay may create an executor-owned commit only when it has authoritatively parsed `Outcome: DONE` and every other advancement condition in DR3 holds. A parsed `BLOCKED` or `REFUSED`, pending queues, a Sandcastle or harness failure, idle timeout, interruption, missing or malformed terminal outcome, gate error, or any other non-DONE result will pause without an executor-owned commit. A DONE stage with no remaining tracked, untracked, staged, or deleted paths advances without an empty commit.

Explicit resume acknowledges that the paused worktree's current uncommitted changes belong to recovery of that stage and may enter its eventual successful boundary commit; the pause output will state this consequence. The same stage reruns against those changes. Only a later authoritative DONE with all gates clear permits Antmay to commit the accumulated changes and advance. Users must not mix unrelated edits into a paused workspace.

Commits made by a skill remain untouched. In particular, `implement-plan-with-subagents` normally leaves no residual diff because it owns its reviewed task commits; Antmay will make no additional implementation-stage commit in that common case. Antmay checks the actual post-DONE worktree without assuming which artifact a residual diff represents and creates a boundary commit only if something remains. It never pushes, amends, rebases, rewrites history, bypasses hooks, or creates an empty commit.

If the Git commit fails after a gated DONE, Antmay will preserve the completed attempt and staged/worktree state, durably pause in a commit-pending condition, release the lock, and avoid rerunning the skill. Resume retries that pending commit after the user fixes the cause; only a successful commit, or confirmation that the intended diff has become empty, advances the stage.

Rationale: Requiring positive completion prevents partial or unreviewed output from being blessed in history, while successful stage-boundary commits keep the checkout clean for downstream skills. Deferring to skill-owned commits avoids duplicate or assumed implementation commits.

## DR50: Declare and enforce each stage's Git boundary

Context: Commit behavior is observable executor policy, not a useful classification of whether a skill happens to commit internally. Standard stages have different valid Git effects: authoring stages own bounded workflow artifacts, reconciliation may be a no-op, review is read-only, and implementation owns its commits and must return a clean worktree.

Decision: Every recipe stage descriptor will carry a declarative Git policy with three independent parts: whether `HEAD` must remain unchanged or may change during the stage; whether the post-DONE worktree must be clean or may contain changes only beneath resolved path selectors, including whether at least one such change is required; and whether a valid changed boundary receives an executor commit with a declared message or no executor action. The generic runner will interpret this data without branching on recipe, stage, or skill names.

The Standard recipe will declare:

- `spec`: `HEAD` must not change; only the thread's `spec.md` may differ; a change is required; commit it as `docs(<full-thread-folder>): spec`.
- `reconcile-spec`: `HEAD` must not change; only `spec.md` may differ; a change is optional; when changed, commit it as `docs(<full-thread-folder>): reconcile spec`; when unchanged, advance without a commit.
- `review-spec`: `HEAD` must not change and the worktree must be clean; make no commit.
- `plan-strict`: `HEAD` must not change; only the thread's `plan.md` and descendants of `plan-tasks/` may differ; at least one change is required; commit them as `docs(<full-thread-folder>): plan`.
- `reconcile-plan`: `HEAD` must not change; only `plan.md` and descendants of `plan-tasks/` may differ; changes are optional; when changed, commit them as `docs(<full-thread-folder>): reconcile plan`; when unchanged, advance without a commit.
- `implement-plan-with-subagents`: `HEAD` may change and the final worktree must be clean; make no executor commit.

`<full-thread-folder>` is the complete canonical directory name including its UTC prefix, for example `260723121015Z-afk-workflow-executor`. Commit subjects and scopes are exact. The runner will inspect all staged, unstaged, deleted, and untracked files with untracked files expanded, validate them against canonical repository-relative exact-file or subtree selectors, and stage only the validated observed paths. Ignored operational queues and implementation workspaces do not enter the status set.

Git-boundary evaluation occurs only after a successful harness exit, an authoritatively parsed DONE terminal outcome, and empty pending queues. Every other outcome or failure retains DR49's pause-without-commit behavior. A disallowed path, forbidden `HEAD` movement, missing required change, unexpectedly dirty clean boundary, staging discrepancy, or commit failure pauses without advancing. These post-DONE cases preserve the completed attempt and enter boundary-finalization waiting rather than rerunning the skill. Resume reacquires the lock, rechecks queues and the Git policy, then commits or advances without another harness invocation once the boundary is valid. Pending queues found before boundary finalization retain precedence and require the normal same-stage rerun after they are resolved.

This decision supersedes DR49's provision for an executor-owned residual commit after `implement-plan-with-subagents`: any residual implementation worktree change is now a Git-policy violation. It also makes the stage-entry Git baseline and observed `HEAD` part of the durable run cursor so unexpected history movement can be diagnosed across pause and resume. DR41's waiting taxonomy gains `git-policy-violation` and `commit-error`.

Rationale: Explicit per-stage invariants match the workflow's actual artifact ownership, prevent unrelated or incomplete paths from entering a commit, and keep the generic runner extensible. Using the full thread folder makes generated commit scopes deterministic and unambiguous.

## DR51: Anchor HEAD-boundary enforcement to the current attempt

Context: DR50's per-stage Git policy says `HEAD` "must not change" on non-implementation stages and stores a stage-entry Git baseline in the durable run cursor, but does not state whether boundary evaluation compares `HEAD` against that stage-entry baseline or against the current attempt's start, nor whether the stored baseline is enforced or diagnostic. A stage may span several attempts separated by pauses during which the user legitimately acts on the checkout — DR49 explicitly allows resolving a commit-error pause by committing manually until the intended diff is empty.

Decision: The `HEAD`-unchanged rule is enforced within a single harness attempt: `HEAD` observed at attempt start must equal `HEAD` at that attempt's boundary evaluation. `HEAD` movement that occurs while a run is paused belongs to the user and is accepted; the stored stage-entry baseline is diagnostic-only — pause and resume output warn when history moved across a pause, and no violation is raised for it. Boundary finalization on resume after `git-policy-violation` or `commit-error` rechecks pending queues and the path policy but does not re-enforce `HEAD` across the pause. This clarifies DR50; the stage-entry baseline and observed `HEAD` remain part of the durable run cursor.

Rationale: The rule targets an agent moving history during a harness run on stages that own no commits, and that hazard is bounded by the attempt. Anchoring to stage entry would make DR49's sanctioned commit-error recovery permanently unsatisfiable, wedging the run until the user rewrites history — something the executor itself is forbidden to do. The trade-off is that a user commit made during a pause enters history with only a diagnostic warning, acceptable because such commits were never executor-owned.

## DR52: Evaluate the Git boundary on DONE before pausing for queues

Context: DR44 gave pending queue files precedence over every parsed outcome and DR50 permitted Git-boundary evaluation only after empty queues, so a stage ending DONE while pending bundles existed paused with its deliverable uncommitted and required a dirty same-stage rerun. The queue directories are ignored operational paths that never enter the boundary status set, and a parsed DONE is the stage's positive completion evidence. Supersedes DR44 and DR50 for the DONE case only.

Decision: When an attempt yields an authoritatively parsed DONE, the executor evaluates the stage's Git boundary immediately, regardless of queue state. A valid changed boundary receives the stage's declared executor commit before any pause; a valid clean boundary requires no action. Only after boundary finalization are non-empty queues classified: the run then pauses as `pending-queues` over a clean, finalized boundary. An invalid boundary pauses as `git-policy-violation` with the pending queue files also listed; resuming that run requires both boundary finalization and empty queues. Non-DONE outcomes remain ineligible for boundary evaluation and executor commits per DR49.

Rationale: DONE is the positive completion evidence DR49 gates commits on; pending bundles record questions for a human and do not make the deliverable incomplete. Committing before pausing leaves every queue pause on a clean tree, aligns the executor with the manual workflow it automates — commit first, resolve decisions second — and is the prerequisite for clean-worktree resume semantics without dirty-recovery machinery.

## DR53: Declare per-stage resume behavior after queue-resolved DONE pauses

Context: Under DR52 a `pending-queues` pause on a stage that parsed DONE sits on a clean, committed boundary, so the open question at resume is whether the stage's work must still reflect the resolved queues. That differs by stage kind: the Standard recipe's reconcile stages exist to fold newly settled decisions into the artifact of the preceding authoring stage, reruns of reconcile and review stages are idempotent verification, and authoring skills create artifacts from scratch. DR36 and DR44 prescribed an unconditional same-stage rerun once queues empty; this supersedes that rule for DONE-finalized pauses only.

Decision: Every recipe stage descriptor carries a declarative resume behavior for a `pending-queues` pause that followed DONE finalization: `advance` (the stage is complete; resume continues with the next stage) or `rerun` (resume starts a fresh attempt of the same stage). The `standard` recipe declares `advance` for `spec` and `plan-strict`, and `rerun` for `reconcile-spec`, `review-spec`, `reconcile-plan`, and `implement-plan-with-subagents`. Every non-DONE pause keeps the unconditional same-stage retry: the stage has produced no accepted deliverable, and resume never skips it. The generic runner interprets the field as descriptor data without branching on recipe, stage, or skill names, per DR46.

Rationale: Re-running a create-from-scratch authoring skill duplicates the recipe's own following reconcile stage, which is the designated folder of resolved decisions; re-running reconcile and review stages is exactly how their own surfaced queues get folded and verified. `implement-plan-with-subagents` declares `rerun` because its committed per-task state makes a rerun resume remaining work, and as the final stage an `advance` would complete the recipe over unverified resolutions.

## DR54: Require a clean worktree at resume outside boundary finalization

Context: Under DR52 every DONE outcome is committed before its run pauses, and under DR51 a user may freely commit their own work while a run is paused. The only dirt resume can then encounter is either unvalidated partial output left by a failed attempt or the user's own uncommitted edits — neither owned by any stage — except at the boundary-finalization pauses (`git-policy-violation`, `commit-error`), where the preserved dirt is the completed stage's deliverable awaiting its commit and DR50's finalization already defines the correct handling. DR49 had instead allowed dirty resume by assigning a paused worktree's uncommitted changes to the paused stage's recovery; this supersedes that acknowledgment, which has no remaining case.

Decision: Resume requires a clean Git worktree — the same status set as boundary inspection: staged, unstaged, deleted, and untracked paths, ignored files excluded — for every pause kind and for `ready` and abandoned-`executing` runs, except `git-policy-violation` and `commit-error`, which keep DR50's finalization semantics over their preserved dirt. A dirty worktree is a resume preflight failure: exit `1`, checkpoint unchanged, with a message telling the user to commit what they want to keep or revert the rest. Pause output for non-DONE pauses states that the attempt failed, its file changes are unvalidated, and the user must revert or deliberately commit them before resuming. New-run preflight keeps its existing clean-worktree requirement from DR49.

Rationale: A uniform clean baseline restores the invariant that every stage attempt starts from committed state, keeps boundary attribution exact, and fails a bad resume in seconds instead of after a burned harness run or a polluted stage commit. The accepted trade-off is that a failed attempt's partial output defaults to being discarded; `implement-plan-with-subagents` bounds that loss through its committed per-task state, and a user who values partial output can commit it deliberately.

## DR55: Refuse a new run while a same-thread run is unfinished

Context: Paused runs hold no lock under DR10, so the workspace lock prevents only simultaneous execution, not overlapping run records. Once a paused run's queues are empty and its tree is clean, nothing in DR37's preflight would stop a fresh run against the same thread, leaving two non-completed checkpoints with independent stage cursors over the same artifacts; resuming the stale one later replays a stage against artifacts that have moved on. Checkpoints record the canonical workspace path and repository-relative thread path, so detection needs only a scan of the runs directory. Extends DR37's preflight.

Decision: New-run preflight refuses to create a run when any non-completed run exists for the same canonical workspace and the same repository-relative thread path: exit `1`, no run created, with output naming the existing run's ID and condition, its exact resume command, and the manual remedy of deleting that run's directory if it is abandoned. Runs for different threads in the same workspace remain allowed; the workspace lock continues to serialize their actual execution. Corrupt or unreadable checkpoints encountered during the scan produce warnings and do not block run creation.

Rationale: The guard targets exactly the overlap that corrupts state — two live cursors over one thread — while leaving the legitimate pattern of one paused thread and another executing thread in the same repository untouched. Hand-deleting a dead run directory is already v0's documented disposal path (DR15, DR35), so the guard adds no new lifecycle machinery.

## DR56: Repeat the unrestricted-permissions warning at resume

Context: The `--dangerously-skip-permissions` choice is made once at run creation, persists in the checkpoint, and applies to every resumed stage per DR8, but DR43 required the prominent warning only in new-run output. Pauses can last days, and at resume time nothing in the command line or on screen otherwise reveals that the run is unrestricted. Extends DR43.

Decision: Whenever `resume` proceeds with a run whose persisted permission choice is unrestricted, its startup summary re-prints the same prominent unrestricted-permissions warning required at run creation.

Rationale: Without the reminder, a days-old decision silently escalates into a fresh unattended session; the warning costs one line and consumes only checkpoint data the executor already reads.

## DR57: Preserve the Git-boundary waiting kind when a queue scan also fails

Context: A parsed-DONE stage can already be paused in a boundary-finalization condition (`git-policy-violation` or `commit-error`) when a subsequent queue scan fails, and the same collision can arise when the post-attempt queue scan fails simultaneously with DONE boundary evaluation. DR44 requires every queue-read failure on an existing run to persist waiting kind `gate-error`, but DR50 and DR52 require a parsed-DONE Git-boundary pause to resume by finalizing the preserved boundary without another harness invocation, and DR54 exempts only `git-policy-violation` and `commit-error` from the clean-worktree resume preflight. Stamping plain `gate-error` on this compound state would therefore either strand the preserved dirty boundary at the clean-worktree check or force a harness rerun of a stage whose DONE attempt must be finalized without one. This conditions DR44 for the boundary-finalization case.

Decision: When a queue scan fails while a parsed-DONE stage's boundary still requires finalization, the executor preserves the Git-boundary waiting kind (`git-policy-violation` or `commit-error`) rather than replacing it with `gate-error`. It retains the original pending-path evidence for that boundary condition and records the queue-scan failure as additional message/diagnostic detail on that same pause. Resume stays eligible for the DR50/DR54 dirty-boundary finalization path — clean-worktree preflight remains exempt — and repeats the queue scan before finalizing the boundary. DR44's plain `gate-error` classification continues to govern every queue-read failure that is not concurrent with a pending parsed-DONE boundary finalization.

Rationale: Preserving the boundary kind keeps the safety-critical no-rerun and dirty-finalization guarantee that DR50 and DR52 exist to provide, with the least additional durable machinery — no new finalization cursor and no expansion of the closed resume contract. The waiting kind names the resumable primary condition rather than the most recent failing check; the accepted trade-off is that the simultaneous queue-scan failure is carried in diagnostics instead of in the single waiting-kind token. Persisting `gate-error` instead was rejected because it would strand the preserved boundary or wedge the run into a forbidden harness rerun.

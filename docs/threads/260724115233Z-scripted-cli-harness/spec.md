# Spec: Scripted harness for manual CLI testing

Decision citations refer to records in `decisions.md`. DR7 supersedes the
scenario-path portions of DR1 and DR5; this spec states only the surviving
contract.

## Intended outcome

Add a developer-only scripted harness mode to the existing Antmay CLI. With the
mode explicitly enabled, the real built `antmay afk run` and `antmay afk
resume` command paths must execute the normal recipe runner, checkpoints, queue
gates, Git boundaries, commits, logs, display, and exit-code handling while
substituting deterministic local behavior for both the Sandcastle invocation
and real harness-executable probing (per `decisions.md` DR1 and DR7).

A developer must be able to hand-author one strict scenario file that assigns a
named built-in case to each durable stage attempt. The happy-path cases must
create and reconcile fake specification and plan artifacts so the complete
Standard recipe can advance through its real Git policies. Generic DONE,
BLOCKED, and REFUSED cases must make terminal behavior programmable without
allowing the scenario to execute arbitrary code (per `decisions.md` DR2–DR4).

This is an MVP for manual development use. It must be small, deterministic at
the case level, and safe against accidentally falling through to Codex or
Claude Code when a scripted run is resumed incorrectly.

## Context

The CLI already owns a provider-neutral `HarnessInvoker` boundary. The runner
passes an `AttemptRequest` to that boundary, and command tests inject
`createFakeHarness` from `cli/src/test-helpers/fake-harness.ts`. Production
dispatch is the missing link: `cli/src/program.ts` always constructs the
Sandcastle invoker and the real executable probe, while the settings schema and
persisted stage profiles intentionally recognize only `codex` and
`claude-code`.

The existing test fake is callback-driven and useful inside Vitest, but it
cannot be selected by a developer invoking the installed CLI. It also cannot be
configured from a deterministic data file or safely carry behavior across a
pause and a new `resume` process.

The implementation must expose a production-reachable test override without
turning the fake into a third supported provider. The configured harness and
model remain the logical stage profile, continue to determine prompt rendering,
and remain visible in checkpoints and attempt display. Scripted mode replaces
only the external execution and executable-probe edges.

## Scope

### In scope

- Exact interpretation of the test-only
  `ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS` environment toggle.
- Loading and strict validation of
  `<resolved-config-root>/scripted-harness.json`.
- A code-owned registry of the seven cases settled in DR4.
- Explicit stage identity, durable per-stage attempt number, and resolved
  target metadata at the internal `AttemptRequest` boundary.
- A scripted `HarnessInvoker` that performs bounded deterministic effects,
  emits normalized events, appends deterministic attempt-log content, and
  returns ordinary provider-neutral outcomes.
- A scripted executable probe that never spawns Codex or Claude Code.
- A minimal optional checkpoint marker that fixes a run's real-versus-scripted
  mode at creation and preserves fail-closed resume behavior.
- Integration with both `run` and `resume`, including live scenario rereading
  and durable attempt selection.
- Vitest coverage at the existing unit and command-integration levels and the
  existing `npm --prefix cli run check` gate (per `decisions.md` DR9).
- Updating `cli/AGENTS.md` to preserve the new test-mode architecture and
  safety rules across sessions, as required by the repository instructions.

### Out of scope

- Adding `scripted` to `HarnessId`, `settings.json`, stage profiles, CLI flags,
  help text, or the public command grammar.
- User-authored file operations, output bodies, paths, callbacks, shell
  commands, JavaScript, or any other executable scenario content.
- Scenario snapshots, hashes, immutable run inputs, migration, merging,
  defaults, aliases, interpolation, or multiple scenario files.
- A scenario generator, setup command, npm script, committed example scenario,
  or dedicated manual smoke-test walkthrough (per `decisions.md` DR8).
- A subprocess CLI test framework, automated disposable-repository fixture,
  new E2E directory, CI change, or credentialed provider test (per
  `decisions.md` DR9).
- New terminal-outcome kinds, waiting kinds, recipes, provider types, retry
  rules, workspace strategies, or changes to Git-boundary semantics.
- Automatic reuse of this adapter for E2E testing. That remains a possible
  follow-up after the manual MVP demonstrates a need.

## Expected behavior

### Activation and runtime selection

Only `run` and `resume` interpret
`ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS` (per `decisions.md` DR7):

- Unset or empty means ordinary production behavior.
- The exact string `1` enables scripted mode.
- Any other non-empty value is a configuration error. The command exits `1`
  before any real executable probe or harness invocation and must not silently
  treat the value as disabled.

Help, version, grammar errors, and `list` retain their current lazy,
side-effect-free behavior and do not read or validate the toggle or scenario.

When enabled, the command resolves the config root with the existing
`ANTMAY_CONFIG_HOME` → `XDG_CONFIG_HOME/antmay` →
`<home>/.config/antmay` precedence and reads exactly
`<config-root>/scripted-harness.json`. The CLI never creates this file. A
missing, unreadable, syntactically invalid, or schema-invalid file is an
actionable command failure. `run` must fail before run allocation; `resume`
must fail without changing the checkpoint.

The production runtime selection must replace both seams as one mode:

1. every requested executable probe returns a deterministic, non-empty
   scripted version observation without spawning a process; and
2. every harness invocation goes through the scripted invoker without calling
   Sandcastle.

The ordinary settings file is still loaded and validated by `run`. Each stage
must still resolve a supported logical harness and non-empty model. The
scripted override must not alter the resolved profile, rendered `$skill` or
`/skill` prompt, permission snapshot, or stage descriptor. The logical
harness/model remain visible in checkpoints, list output, attempt summaries,
and log headers. A conspicuous startup message must identify scripted test mode
and the resolved scenario path before the first possible harness invocation
(per `decisions.md` DR1).

### Scenario file contract

The scenario is strict JSON with this sole shape (per `decisions.md` DR6):

```json
{
  "schemaVersion": 1,
  "stages": {
    "spec": ["spec-correct"],
    "reconcile-spec": ["reconcile-spec-correct"],
    "review-spec": ["outcome-done"],
    "plan-strict": ["plan-strict-correct"],
    "reconcile-plan": ["reconcile-plan-correct"],
    "implement-plan-with-subagents": ["outcome-done"]
  }
}
```

Validation is exhaustive and strict:

- The root must be a plain object containing exactly `schemaVersion` and
  `stages`.
- `schemaVersion` must equal numeric `1`.
- `stages` must be a plain object whose keys are exactly all stage IDs in the
  selected recipe for `run`, or all stage IDs in the checkpoint snapshot for
  `resume`. Unknown and missing stage keys are errors.
- Every stage value must be a non-empty array of non-empty case-name strings.
- Every name must exist in the built-in registry.
- `spec-correct`, `reconcile-spec-correct`, `plan-strict-correct`, and
  `reconcile-plan-correct` may appear only under their identically corresponding
  stage IDs. The three `outcome-*` cases may appear under any stage.
- Unknown fields at any defined object level are errors. No value is defaulted,
  coerced, expanded, merged, or ignored.

The file is loaded and validated once per `run` or `resume` command invocation.
The in-memory validated scenario is used for every attempt launched by that
command. A later command rereads the live file, so edits between pause and
resume are accepted intentionally. No scenario path, content, normalized copy,
or digest is stored in the checkpoint (per `decisions.md` DR5).

### Attempt context and case dispatch

Extend the Antmay-owned `AttemptRequest` boundary with, at minimum:

- the current stage ID;
- the durable positive attempt number for that stage; and
- the stage's resolved repository-relative target.

The generic runner supplies these values from the current snapshotted stage and
the same `attemptNumber` it persists in the `AttemptRecord`. Sandcastle may
ignore this metadata; no Sandcastle-specific type may cross the existing
adapter boundary.

The scripted invoker selects
`scenario.stages[stageId][attemptNumber - 1]` (per `decisions.md` DR3). It must
not infer stage identity or select a case by parsing prompt text. If the durable
attempt number exceeds the configured array, invocation returns a clear
scripted-harness provider failure; it never repeats the final entry or wraps
around.

Before effects, every case validates that:

- the configured case is compatible with the explicit stage ID;
- the resolved target is the target expected for that snapshotted stage;
- the generated prompt exactly represents the request's logical harness,
  stage skill, resolved target, and optional profile prompt; and
- every filesystem path the case will touch resolves within the current
  workspace and selected thread without following an escaping symlink.

Prompt validation is an assertion over independently supplied stage context,
not the dispatch mechanism. A mismatch returns a scripted-harness provider
failure instead of guessing the caller's intent.

### Built-in cases

The registry contains exactly these initial names (per `decisions.md` DR4):

| Case | Compatible stage | Deterministic behavior |
| --- | --- | --- |
| `outcome-done` | Any | No workspace change; complete with a final line parsed as `Outcome: DONE`. |
| `outcome-blocked` | Any | No workspace change; complete with a final line parsed as `Outcome: BLOCKED`. |
| `outcome-refused` | Any | No workspace change; complete with a final line parsed as `Outcome: REFUSED`. |
| `spec-correct` | `spec` | Write `spec.md` under the resolved thread root with the exact fixed content below, then complete with DONE. |
| `reconcile-spec-correct` | `reconcile-spec` | Require a regular `spec.md`, append one fixed reconciliation line, then complete with DONE. |
| `plan-strict-correct` | `plan-strict` | Write fixed non-empty `plan.md` content and a fixed non-empty set of Markdown task files under `plan-tasks/`, then complete with DONE. |
| `reconcile-plan-correct` | `reconcile-plan` | Require a regular `plan.md` and at least one regular task file under `plan-tasks/`; append one fixed line to the plan and one fixed line to every task file in normalized lexical path order, then complete with DONE. |

`spec-correct` writes exactly, including one trailing newline:

```markdown
# Spec: Fake

Placeholder
```

The effectful write cases replace the content of the fixed files they own with
their fixed bodies when those destinations already exist as ordinary files.
They do not delete unrelated files. Reconcile cases append exactly one
newline-terminated fixed line per invocation. A required input that is absent,
not an ordinary file/directory, symlinked outside the thread, or otherwise
unsafe causes a scripted-harness provider failure. No case executes a process
or interprets scenario data as an operation (per `decisions.md` DR2).

Each case must also:

- emit deterministic provider-neutral live events through `onEvent`, with at
  least one text event that identifies the selected case;
- append deterministic verbose content identifying the stage, attempt, case,
  effects, and returned outcome to the already-created attempt log without
  truncating its Antmay header;
- keep terminal `Outcome:` text in `finalText` rather than emitting a live text
  line beginning with `Outcome:`; and
- check an already-aborted request before performing workspace effects.

If request validation, prerequisite validation, a filesystem effect, event/log
handling, or case lookup fails, the adapter returns an `AttemptOutcome` with
`kind: "failed"`, category `provider-error`, and an identifiable scripted
harness class/message. Existing runner classification then persists an ordinary
`harness-error` pause. The adapter does not throw through the runner boundary.

### Run behavior

With the exact toggle enabled, `run` must validate the scenario against the
selected built-in recipe before allocating a run. All existing preflight
requirements still apply, except real executable probing is replaced by the
scripted probe.

The initial checkpoint records a minimal optional marker that the run's harness
execution mode is scripted (per `decisions.md` DR5). The marker does not replace
or alter `observedHarnessVersions`, logical stage profiles, or the checkpoint's
existing `schemaVersion: 1`. Checkpoints written before this feature, which lack
the optional marker, remain valid real-mode checkpoints.

Once allocated, the unchanged runner invokes cases and applies its normal
semantics:

- generic BLOCKED and REFUSED cases durably pause at the same stage and exit
  `2`;
- DONE advances only when the existing queue and Git-boundary rules accept the
  case's resulting worktree;
- `spec-correct` and `plan-strict-correct` therefore exercise the existing
  required-change boundary commits;
- reconcile cases exercise the existing optional-change boundary commits;
- `outcome-done` on review and implementation exercises their existing clean
  boundary behavior; and
- deliberately assigning `outcome-done` to a required-change stage produces
  the existing Git-policy pause rather than special fake behavior.

The scripted adapter owns no stage advancement, queue scan, commit, checkpoint
transition, display rendering, or exit-code logic.

### Resume behavior

Harness mode is fixed when a run is created:

- A resumable checkpoint carrying the scripted marker requires the exact
  `ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS=1` toggle. With it, `resume` resolves the
  config root, rereads the live scenario, validates it against the snapshotted
  stages, substitutes both scripted seams, and proceeds normally.
- Without the toggle, a scripted run exits `1` before any executable probe,
  harness invocation, lock acquisition, or checkpoint mutation and prints an
  actionable instruction to repeat the command with the toggle.
- A real-mode checkpoint without the marker continues to use the real harness
  path. Supplying the scripted toggle for such a checkpoint is a mode mismatch
  and exits `1`; this MVP does not switch an existing run between real and
  scripted execution.

The next case remains derived from the runner's durable per-stage attempt
number. For example, `spec: ["outcome-blocked", "spec-correct"]` pauses attempt
1, then selects `spec-correct` on a correctly toggled resume at attempt 2.
Scenario edits between commands may intentionally change the name found at that
array position (per `decisions.md` DR5).

Normal resume paths that finalize a DONE boundary or resolve a queue without a
new harness call retain their existing semantics. A scripted checkpoint still
requires the toggle and a valid scenario for every resume command, even when
that particular resume path does not invoke a case (per `decisions.md` DR7).
Ordinary real-mode resume remains state-root-only and does not begin reading the
config root or settings.

### Probe, logs, and display

The scripted probe accepts the requested logical `HarnessId` values, de-
duplicates them consistently with the real probe, and returns a deterministic
non-empty version line for every requested harness. It never calls
`child_process.execFile`, performs authentication, or accesses a provider.

Attempt headers and normal stage summaries continue to name the logical
Codex/Claude Code harness and configured model. The scripted version line and
prominent test-mode message must make the override unambiguous. Exact wording
and styling are free, but the message must appear on both new-run and resume
startup and must include the resolved scenario path.

The scripted invoker appends to the same immutable per-attempt log created by
the runner and emits only existing `HarnessEvent` variants. Raw provider JSON
does not exist in this path. The terminal renderer, outcome parser, pause
renderer, and log header format remain shared with real execution.

## Constraints

- Preserve Node `>=22`, strict TypeScript, ESM, the existing tsup/Vitest
  toolchain, and the dynamic-import discipline documented in `cli/AGENTS.md`.
  Help, version, grammar errors, and `list` must not gain config, state, Git, or
  harness side effects.
- Add no runtime or development dependency for environment parsing, JSON
  schema validation, fake behavior, or filesystem effects.
- Keep `HarnessId` equal to `"codex" | "claude-code"` and keep
  `settings.json` validation unchanged. Scripted mode is out-of-band test
  instrumentation, not a provider.
- Keep the existing provider-neutral `HarnessInvoker`, `AttemptOutcome`,
  `HarnessEvent`, runner classification, waiting taxonomy, exit codes, queue
  gates, Git boundaries, checkpoint atomicity, and signal handling intact.
- Scenario configuration is read-only. The CLI never creates, rewrites,
  normalizes, snapshots, or annotates `scripted-harness.json`.
- Built-in cases may touch only their fixed thread-local artifacts. They must
  validate confinement and must never execute arbitrary commands or user data.
- Preserve old real-mode checkpoints and ordinary `run`, `resume`, and `list`
  behavior. The optional scripted marker must be validated when present and
  preserved by all subsequent checkpoint writes.
- Do not add the conveniences or automated E2E scope excluded by DR8 and DR9.
- Do not stage, commit, push, publish, or alter package-release state as part of
  implementing this spec unless separately requested.

## Acceptance criteria

### FR-1 — Test-mode activation and isolation

- **AC-1.1** With the toggle unset or empty, all existing real-mode tests pass
  unchanged and `run`/`resume` use the Sandcastle invoker plus real executable
  probe.
- **AC-1.2** With the toggle exactly `1`, `run` and eligible scripted `resume`
  use the scripted invoker and scripted probe; spies prove neither Sandcastle
  `run` nor `child_process.execFile` is called (DR1, DR7, DR9).
- **AC-1.3** Every other non-empty toggle value makes `run` and `resume` exit
  `1` without a provider probe/invocation; the diagnostic identifies the
  variable, accepted value, and refusal to fall through (DR7).
- **AC-1.4** Help, version, grammar-error, and `list` paths remain independent
  of the toggle and scenario and retain their current lazy behavior.
- **AC-1.5** Scripted startup output for both `run` and `resume` prominently
  identifies test mode and the resolved `scripted-harness.json` path before
  any possible harness invocation (DR1, DR7).

### FR-2 — Scenario loading and validation

- **AC-2.1** Exact-toggle commands read only
  `<resolved-config-root>/scripted-harness.json`; a missing, unreadable, or
  malformed file exits `1`, naming the resolved path, with no run allocation
  on `run` and no checkpoint mutation on `resume` (DR6, DR7).
- **AC-2.2** Tests accept the exact strict schema and reject every class listed
  under “Scenario file contract”: wrong root type, unknown/missing root fields,
  non-`1` version, wrong `stages` type, missing/unknown stages, non-array or
  empty stage values, non-string/empty/unknown cases, and incompatible
  stage-specific cases (DR6).
- **AC-2.3** `run` validates against the selected recipe; `resume` validates
  against the checkpoint's snapshotted stage IDs without rereading settings or
  built-in recipe definitions (DR6).
- **AC-2.4** One command loads the file once and shares the validated object
  across all attempts it launches; a later resume observes valid edits to the
  live file; no scenario path, content, or digest appears in `state.json`
  (DR5).

### FR-3 — Durable case selection

- **AC-3.1** `AttemptRequest` carries explicit current stage ID, durable
  positive per-stage attempt number, and resolved target; runner tests prove
  they equal the values persisted for that attempt (DR3).
- **AC-3.2** Dispatch selects array index `attemptNumber - 1`; a BLOCKED first
  attempt followed by resume selects the second configured case, including
  across a new process-level command invocation (DR3, DR5).
- **AC-3.3** An exhausted array returns an identifiable scripted
  `provider-error` and never repeats or wraps a case (DR6).
- **AC-3.4** Tests prove dispatch uses explicit context, while every case
  independently rejects a mismatched stage, target, logical-harness prompt, or
  profile-prompt suffix as a scripted provider failure (DR3).

### FR-4 — Built-in case registry and effects

- **AC-4.1** The registry exposes exactly the seven DR4 names; generic outcome
  cases are accepted for every stage and the four effectful names are rejected
  outside their matching stages (DR4, DR6).
- **AC-4.2** Each generic outcome case leaves the worktree unchanged and
  returns completed final text whose final non-empty line parses to its named
  DONE, BLOCKED, or REFUSED token (DR4).
- **AC-4.3** `spec-correct` leaves the selected thread's `spec.md` byte-equal to
  `# Spec: Fake\n\nPlaceholder\n`, touches no unrelated path, and returns DONE
  (DR2, DR4).
- **AC-4.4** `reconcile-spec-correct` requires a safe regular `spec.md`, appends
  one fixed newline-terminated reconciliation line per invocation, touches no
  other artifact, and returns DONE (DR2, DR4).
- **AC-4.5** `plan-strict-correct` leaves fixed non-empty `plan.md` content and
  the implementation's fixed non-empty task-file set under `plan-tasks/`,
  touches no unrelated path, and returns DONE (DR2, DR4).
- **AC-4.6** `reconcile-plan-correct` requires a safe regular plan and at least
  one safe regular task, appends one fixed line to the plan and every task
  exactly once in lexical path order, and returns DONE (DR2, DR4).
- **AC-4.7** Missing or unsafe prerequisites, escaping/symlink paths, effect
  failures, and pre-aborted requests produce an identifiable provider-neutral
  scripted failure and never execute a process or scenario-supplied operation
  (DR2, DR3).
- **AC-4.8** Every successful case appends deterministic identifying content to
  the pre-existing attempt log, emits at least one normalized text event, and
  keeps its terminal outcome out of live event lines beginning with
  `Outcome:` (DR3, DR9).

### FR-5 — Checkpoint and resume safety

- **AC-5.1** A scripted `run` writes a minimal optional scripted-mode marker in
  the initial checkpoint before launch; real checkpoints omit it; the
  checkpoint remains schema version `1`; old marker-less checkpoints validate
  and behave as real runs (DR5).
- **AC-5.2** Every checkpoint transition preserves and validates the marker,
  including ready, executing, waiting, interrupted, and completed writes.
- **AC-5.3** A resumable scripted checkpoint without exact toggle `1` exits `1`
  before probe, lock acquisition, or mutation and tells the developer how to
  enable the mode; an exact-toggle resume of a marker-less real checkpoint
  exits `1` as a mode mismatch (DR5, DR7).
- **AC-5.4** A correctly toggled scripted resume validates the live scenario
  against the snapshot, uses the next durable attempt, and otherwise follows
  existing queue, recovery, boundary-finalization, pause, and continuation
  behavior (DR3, DR5–DR7).
- **AC-5.5** A correctly configured `outcome-blocked` attempt exits `2` with an
  outcome-blocked checkpoint; after changing no state except invoking resume
  with the same scenario and toggle, a configured second `spec-correct` attempt
  executes and can advance through the ordinary boundary commit.

### FR-6 — Preservation of real runner semantics

- **AC-6.1** Logical harness/model settings remain required, prompt rendering
  remains byte-identical for Codex and Claude Code profiles, stage snapshots
  retain their original profiles, and no `scripted` `HarnessId` is introduced
  (DR1).
- **AC-6.2** The scripted probe returns deterministic non-empty observations for
  every distinct requested logical harness without a subprocess; attempt
  headers keep the logical harness/model and expose an unambiguous scripted
  version observation (DR1).
- **AC-6.3** DONE cases pass through the existing outcome parser, queue scans,
  Git-policy evaluation, boundary commits, stage advancement, and completion;
  BLOCKED/REFUSED and scripted provider failures pass through the existing
  waiting taxonomy and exit-code mapping with no scripted special cases in the
  runner.
- **AC-6.4** A complete Standard happy scenario creates the required spec and
  plan boundary commits, optional reconcile commits when changed, no review or
  implementation commit when clean, and a completed checkpoint using the
  unchanged recipe policies.

### FR-7 — MVP scope and repository conformance

- **AC-7.1** The diff adds no CLI flag/help entry, settings field, provider ID,
  runtime/development dependency, scenario snapshot, generator, setup command,
  npm script, example scenario, dedicated smoke walkthrough, E2E directory, or
  CI configuration (DR7–DR9).
- **AC-7.2** `cli/AGENTS.md` documents the fixed toggle/file, the fact that
  profiles remain logical Codex/Claude Code values, the fail-closed resume
  marker, and the built-in-case-only/no-arbitrary-code boundary.
- **AC-7.3** Existing exit codes, dynamic imports, real Sandcastle adapter,
  executable probe, settings validation, list behavior, queue gates, Git
  policies, locks, signals, and checkpoint atomic-write behavior remain
  regression-tested and unchanged outside the scripted-mode selection seam.

### FR-8 — Verification

- **AC-8.1** Vitest covers toggle parsing, fixed-path resolution, scenario
  parsing/validation, case compatibility, all seven case outcomes/effects,
  prerequisite and request mismatches, events/logging, and failure
  normalization (DR9).
- **AC-8.2** Command-level tests cover scripted new-run marking, complete happy
  execution, BLOCKED then resumed second-attempt selection, live scenario
  rereading, invalid/exhausted scenarios, fail-closed marker/toggle mismatch,
  and preservation of real-mode behavior (DR9).
- **AC-8.3** Runtime-selection tests use spies/fakes to prove scripted mode
  replaces both real seams and that no test starts Codex, Claude Code, or a
  provider executable (DR9).
- **AC-8.4** `npm --prefix cli run check` completes successfully with
  typecheck, all Vitest tests, and the production build (DR9).

### Coverage and traceability

Activation and provider isolation are covered by FR-1; the live strict file
contract by FR-2; explicit stage/attempt dispatch by FR-3; every built-in
behavior and filesystem effect by FR-4; persisted mode and resume safety by
FR-5; unchanged runner behavior by FR-6; the MVP exclusions by FR-7; and the
verification boundary by FR-8. Each FR/AC cites the operative record from
`decisions.md`, so every observable behavior above has a pass/fail check and a
durable decision source.

## Degrees of freedom

The following implementation-level choices are deliberately open. Any choice
must satisfy all acceptance criteria without changing observable semantics:

1. **Module layout and factories.** The scripted loader, registry, cases,
   invoker, probe, and runtime selector may be split or grouped under
   `cli/src/` as long as `program.ts` remains a thin lazy dispatcher and the
   runner stays recipe- and case-agnostic.
2. **Additional internal request metadata.** `AttemptRequest` must carry the
   three DR3 fields. The implementer may pass additional Antmay-owned stage
   metadata or close over the validated stage snapshot to reconstruct the
   expected prompt, provided prompt parsing never becomes dispatch.
3. **Checkpoint marker representation.** The optional schema-version-1 field
   name and nesting are free provided absence means real mode, the value is
   strictly validated, and all transitions preserve it.
4. **Plan fixture details.** The exact placeholder `plan.md` body, task count,
   task filenames, task bodies, and fixed reconciliation-line text are free.
   They must be non-empty constants, remain within the selected thread, and
   support all FR-4 assertions. The exact `spec.md` body is not free.
5. **Scripted stream and log wording.** Event count beyond the required text
   event, optional tool-call events, verbose-log formatting, and the
   deterministic fake version string are free, provided case/stage/attempt,
   effects, and outcome remain inspectable and terminal safety holds.
6. **Diagnostics and styling.** Exact error wording, aggregation format, and
   prominent test-mode styling are free provided required facts and fail-closed
   behavior are present.
7. **Validation and path-confinement mechanics.** Plain manual guards, typed
   result helpers, filesystem APIs, and lexical/canonical containment
   techniques are free; no schema library or new dependency may be added.
8. **Test organization.** New tests may live beside their modules or extend
   existing command/runner suites. The required coverage and prohibition on
   provider processes are binding.

## Risks and accepted trade-offs

- The scenario is live configuration. Editing it between pause and resume may
  intentionally change the later case selected at the same durable array
  position; whole-run reproducibility is not promised (per `decisions.md`
  DR5).
- Effectful cases write directly into the current checkout, just as the real
  harness does. The explicit test toggle, prominent warning, normal clean-tree
  preflight, thread confinement, and ordinary Git boundaries mitigate but do
  not eliminate the risk of overwriting fake target artifacts.
- A real logical harness and model remain required in ordinary settings even
  though the provider is not contacted. This keeps prompts and persisted
  profiles honest but requires manual configuration.
- No subprocess E2E test proves the installed binary boundary in this MVP.
  Focused runtime-selection and command integration tests protect the seam; the
  scripted adapter may support broader E2E coverage later if actual use
  justifies it (per `decisions.md` DR9).

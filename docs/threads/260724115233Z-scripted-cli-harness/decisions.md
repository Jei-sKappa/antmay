# Scripted harness for manual CLI end-to-end testing decision log

## DR1: Environment-gated scripted harness override

Context: The real CLI must be executable end to end with deterministic harness responses without adding a scripted provider to the normal command or settings contract. Production bootstrap currently supplies both the concrete harness invoker and executable probe, while run checkpoints persist the configured stage profiles for Codex or Claude Code.

Decision: A single test-only environment variable, `ANTMAY_TEST_HARNESS_SCRIPT`, set to an absolute scenario-file path, activates scripted harness mode for the real `antmay afk run` and `antmay afk resume` commands. In this mode the production harness invoker and executable probe are both replaced by deterministic scripted implementations, ordinary settings and persisted stage profiles remain unchanged, and the CLI prominently identifies the active test override. The scenario path must be absolute, readable, and structurally valid before a run is allocated or resumed. Resume requires the same environment variable and must refuse rather than invoke the configured real provider when a scripted run is resumed without the override. Additional environment variables are not introduced without a demonstrated need.

Rationale: An explicit `ANTMAY_TEST_` hook exercises the installed CLI bootstrap, command handling, state management, Git boundaries, and display without presenting the fake as a supported agentic provider. Keeping the configured logical harness in stage profiles preserves the normal settings contract, while replacing both invocation and probing prevents accidental real-provider access. Requiring the environment variable again on resume makes the run environment-dependent, but failing closed avoids a much more serious accidental provider invocation.

## DR2: Deterministic workspace effects

Context: Returning harness text alone cannot drive successful stages whose Git policies require artifact changes, and it cannot exercise boundary violations or pending-queue behavior. The scripted harness therefore needs a controlled way to reproduce the workspace effects that a real skill invocation would cause.

Decision: Scripted harness behavior may perform deterministic, declarative workspace effects in addition to emitting harness events and a final outcome. The supported effects must be bounded to behavior implemented by the scripted harness; scenario configuration must not execute arbitrary shell commands or user-supplied code. Paths and operation outcomes must be validated so the same repository state and selected behavior produce the same result.

Rationale: Controlled workspace effects allow the real runner, Git-boundary engine, queue gates, commits, and display to be exercised together. Excluding arbitrary execution keeps scenarios reviewable, portable, and reproducible while still allowing built-in cases to model the file changes needed by the workflow.

## DR3: Built-in cases selected by stage and attempt

Context: Scenario configuration needs to select deterministic fake behavior for different recipe stages and for repeated attempts that may span process restarts. Dispatching by parsing the rendered skill prompt would turn presentation text into a brittle control protocol, while the runner already owns the durable stage identity, attempt number, and resolved target.

Decision: The scripted harness implementation owns a registry of named, pre-built cases; scenario files may only select those names and cannot define file content, paths, commands, or operations. `AttemptRequest` is extended with explicit stage context containing the stage ID, its durable per-stage attempt number, and resolved target. A versioned scenario maps each stage ID to an ordered array of case names, where array position selects the corresponding attempt. Each case validates the expected generated prompt and target, performs its fixed workspace effects, emits its fixed stream and verbose-log content, and returns its fixed outcome. Unknown cases, absent stage or attempt entries, and request mismatches fail loudly as scripted-harness errors.

Rationale: A code-owned case library makes every behavior unit-testable and prevents configuration from becoming executable logic. Selecting with explicit durable runner context remains deterministic across resume and avoids coupling dispatch to prompt formatting, while case-level prompt validation still verifies that the real CLI assembled the expected harness request.

## DR4: Initial happy-path and terminal-outcome case catalog

Context: The initial case library must support a complete deterministic Standard run and deliberate terminal-outcome pauses without creating redundant stage-specific names for stages whose successful behavior has no workspace effect.

Decision: The initial library includes three stage-agnostic cases, `outcome-done`, `outcome-blocked`, and `outcome-refused`, which make no workspace changes and return their corresponding fixed terminal outcome. Stages with meaningful happy-path effects use dedicated cases: `spec-correct` creates `spec.md` with fixed placeholder specification content; `reconcile-spec-correct` requires that file and appends a fixed reconciliation line; `plan-strict-correct` creates a fixed placeholder `plan.md` and a fixed set of placeholder task files under `plan-tasks/`; and `reconcile-plan-correct` requires those artifacts, appends a fixed reconciliation line to `plan.md`, and appends a fixed line to every task file in deterministic sorted-path order. Review-spec and implement-plan-with-subagents happy paths use `outcome-done`. A stage-specific case fails loudly when its expected prerequisite artifact or request shape is absent rather than improvising a different result.

Rationale: Generic outcome cases avoid aliases whose only behavior is returning the same token, while stage-specific cases remain reserved for deterministic filesystem effects that exercise the relevant Git policies. Reconcile cases modify existing artifacts instead of replacing them, more closely modeling their real skills and proving that the boundary engine accepts the resulting changes.

## DR5: Live scenario configuration across resume

Context: A scripted run may span multiple CLI processes. Snapshotting and fingerprinting the scenario would make the entire run immutable, but this facility is a developer-only manual testing tool whose implementation should remain deliberately small.

Decision: `ANTMAY_TEST_HARNESS_SCRIPT` is read and validated from its live absolute path on each `run` and `resume`; scenario content is neither copied nor fingerprinted. The durable stage attempt number still selects the configured case deterministically for the content present at invocation time. The checkpoint records only the minimum optional marker that the run was started in scripted mode, allowing resume to refuse when the environment override is absent. It stores no scenario path, content, or digest.

Rationale: Live rereading avoids scenario snapshot lifecycle and comparison logic while allowing a developer to edit cases between manual invocations when useful. This permits later behavior to change if the file changes, which is an accepted trade-off for the explicitly developer-only tool; each built-in case itself remains deterministic for the request and repository state it receives.

## DR6: Strict versioned scenario schema

Context: Scenario mistakes discovered after a run begins can leave a partially executed manual run with durable state and boundary commits. The selected recipe and built-in case registry provide enough information to reject structural mistakes before allocation or resume.

Decision: A scenario is strict JSON with exactly `schemaVersion` and `stages` at its root. `schemaVersion` must be `1`; `stages` maps every stage ID of the selected or snapshotted recipe to a non-empty ordered array of known case-name strings. Unknown or missing stages, unknown fields, empty arrays, non-string entries, unknown case names, and stage-specific cases assigned to another stage are rejected. `run` validates against the selected recipe before allocating run state, and `resume` validates against the snapshotted recipe before invoking a harness. If a durable attempt number exceeds its configured array, the invocation fails explicitly and never repeats a case implicitly.

Rationale: Exhaustive validation is a small, deterministic parser rather than a flexible configuration subsystem. Failing before allocation catches ordinary authoring mistakes without defaults, aliases, merging, or recovery behavior that would complicate this developer-only tool.

## DR7: Fixed scenario path with an explicit boolean toggle

Context: This supersedes the scenario-path selection in DR1 and DR5. The CLI already resolves a single config root for `settings.json`, so requiring a scenario path on every invocation adds unnecessary developer ceremony and makes resume configuration easier to mistype.

Decision: Scripted mode is enabled only when `ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS` has the exact value `1`. When enabled, `run` and `resume` read the live scenario from `<resolved-config-root>/scripted-harness.json`. An unset or empty variable selects ordinary real-harness behavior; any other non-empty value is a configuration error and must not fall through to a real harness. A checkpoint marked as having started in scripted mode may resume only with the exact toggle enabled, before any real executable probe or harness invocation. The fixed scenario is reread and revalidated on every command as otherwise established by DR5.

Rationale: A conspicuous test-only boolean keeps ordinary CLI and settings syntax unchanged while reusing established config-root precedence. A fixed filename makes manual run and resume commands copyable, and rejecting mistyped non-empty values prevents an attempted fake run from silently reaching a paid or privileged real provider.

## DR8: No packaged manual-testing conveniences in the MVP

Context: Copy-ready scenario fixtures, a dedicated README walkthrough, setup commands, or generators would reduce manual preparation, but the scripted harness is currently an MVP used by one developer who accepts hand-authoring the strict scenario and preparing the test repository.

Decision: The initial implementation includes no committed example scenarios, scenario generator, setup command, additional npm script, or dedicated manual smoke-test walkthrough. The scenario contract and activation behavior remain implementation requirements and receive normal code-level test coverage.

Rationale: Omitting convenience packaging keeps the first slice focused on the production-reachable scripted adapter and its deterministic cases. Manual plumbing is acceptable at the current usage scale, and reusable examples or automation can be added later if repeated use demonstrates their value.

## DR9: Existing Vitest suite only

Context: The environment-gated adapter and its cases need automated regression coverage, while a subprocess-based end-to-end framework or CI workflow would expand the thread into the separate reuse topic identified at genesis.

Decision: The MVP is verified within the existing Vitest suite. Tests cover strict scenario parsing, every built-in case and its fixed effects, prerequisite and request-shape failures, normalized events, verbose-log content, terminal outcomes, toggle interpretation, production runtime selection, replacement of both real invocation and executable probing, checkpoint marking, live scenario rereading, durable attempt selection, and fail-closed resume. Tests must not spawn Codex or Claude Code. The existing `npm --prefix cli run check` command remains the complete gate. No subprocess CLI suite, new E2E directory, CI change, or automated disposable-repository fixture is added.

Rationale: Focused unit and command-level integration tests protect the dangerous provider-selection boundary and deterministic case behavior without creating the broader E2E infrastructure deferred by the thread. The scripted harness remains available as a building block if later use demonstrates that automated end-to-end coverage is worthwhile.

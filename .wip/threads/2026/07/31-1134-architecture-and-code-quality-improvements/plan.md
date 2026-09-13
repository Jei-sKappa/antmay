# Strict plan: CLI architecture and code quality improvements

Refactor the Antmay CLI so one execution engine owns every durable transition after allocation, supported by explicit checkpoint recovery evidence and focused Git, recovery-policy, harness-runtime, thread-artifact, and display modules. The work is sequenced so each new domain boundary is established and mechanically verified before command-owned transition code is retired, while preserving observable behavior outside the specification's explicit safety changes.

Source: spec.md

## Global Constraints

- Preserve Node `>=22`, ESM, strict TypeScript, tsup, Vitest, the sole runtime dependency, existing exit codes, and the command surface documented in `cli/AGENTS.md`.
- Add no runtime or development dependency for state modeling, validation, policy evaluation, module loading, or display splitting.
- Preserve the dynamic-import discipline: bootstrap and command dispatch remain light, and non-execution commands do not load configuration, state, Git, or harness subsystems.
- Preserve atomic checkpoint writes, workspace-lock exclusivity, manual stale-lock recovery, and command ownership of lock release.
- Keep the real and scripted implementations behind the existing provider-neutral harness request, event, and outcome boundary.
- Keep runtime and recovery data at `schemaVersion: 0`. Reject incompatible old documents; do not add optional fields, fallbacks, migrations, or shims to make them validate (per DR1, DR5, DR11, and DR12).
- Keep diagnostic reasons self-contained for checkpoint inspection and terminal rendering even though they no longer control resume.
- Keep domain modules structured: the execution engine may coordinate policy, Git, artifact, harness, state, and display collaborators but may not duplicate their internal rules. Likewise, the Git, policy, artifact, harness, and display modules may not persist or advance checkpoints.
- Establish the typed recovery model and its policy and Git collaborators before deleting the old resume-transition paths. Replace runtime adapter selection as one paired invoker/probe change. Move artifact types and their serialized validators together so there is never a second canonical dimension list. These are planning dependencies, not a prescribed task list (per DR9).
- Preserve the repository's concurrent-test teardown conventions and cached Git fixture strategy in `run.test.ts`, `resume.test.ts`, and runner/engine tests.
- Every intentionally distinct terminal rendering requires a demo scenario. Existing renderings are exercised by their current scenarios; the new runtime mismatch adds one scenario.
- Update `cli/AGENTS.md` to describe the resulting durable architecture and remove descriptions of `startedScripted`, `gitCursor`, reason-driven recovery, duplicated command transitions, or monolithic display structure. Do not turn it into an inventory of obvious implementation details.
- The CLI stage catalog, artifact prerequisites and transitions, and skill invocation posture do not change, so the root rule does not require an edit to the published stage-support table.
- Implementation must leave no half-migrated alternate engine, compatibility path, unused adapter injection, copied artifact validator, or obsolete terminal implementation.

## Tasks

1. **Centralize thread-artifact contracts** — make the thread domain the sole owner of artifact vocabulary, validation, inspection, evaluation, and descriptions. → `plan-tasks/01-centralize-thread-artifact-contracts.md`
2. **Encode runtime and recovery state** — replace optional checkpoint hints with required runtime identity, four validated recoveries, and attempt-local Git evidence. → `plan-tasks/02-encode-runtime-and-recovery-state.md`
3. **Extract pure recovery policy** — express queue, contract-recheck, finalized-DONE, and Git-retry decisions as exhaustively tested domain directives. → `plan-tasks/03-extract-pure-recovery-policy.md`
4. **Deepen Git-boundary finalization** — expose one semantic operation that owns observation, evaluation, staging, commit, and final-HEAD reporting in every context. → `plan-tasks/04-deepen-git-boundary-finalization.md`
5. **Split terminal rendering by phase** — replace the terminal god module with focused renderers and a narrow execution-display interface without changing existing output. → `plan-tasks/05-split-terminal-rendering-by-phase.md`
6. **Separate scripted cases from the provider adapter** — move the fixed case/effect catalog behind a small scripted invoker while preserving every developer-harness behavior. → `plan-tasks/06-separate-scripted-cases-from-adapter.md`
7. **Resolve harness runtimes lazily** — share immutable real-versus-scripted selection and probing across commands while loading exactly one adapter family. → `plan-tasks/07-resolve-harness-runtimes-lazily.md`
8. **Add runtime and recovery scenarios** — exercise the immutable-runtime refusal and saved-DONE recovery as ordered executable-UI states. → `plan-tasks/08-add-runtime-and-recovery-scenarios.md`
9. **Establish the execution engine** — move the runnable stage loop and its persistence boundary into the execution domain behind typed command entries. → `plan-tasks/09-establish-the-execution-engine.md`
10. **Move resume transitions into the engine** — make resume preflight read-only and let the engine own every recovery, gate, mutation, advancement, and completion under the lock. → `plan-tasks/10-move-resume-transitions-into-engine.md`
11. **Enforce and verify the resulting architecture** — add dependency guards, update durable CLI guidance, and run the complete automated and executable-UI regression surface. → `plan-tasks/11-enforce-and-verify-architecture.md`

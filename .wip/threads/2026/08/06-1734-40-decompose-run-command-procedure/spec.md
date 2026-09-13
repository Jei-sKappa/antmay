# Decompose the CLI command procedures

## Intended outcome

Refactor the CLI's `runCommand` and `resumeCommand` into thin, readable command orchestrators whose source states each safety-sensitive operation in execution order. Move preflight responsibilities into named command-specific modules, move new-run allocation into its own transaction, and give resume lock acquisition its own boundary. Extend the architecture tests so these relationships fail the build when a command step becomes undeclared, gains another caller, calls another step, or leaks its leaf collaborators back into the orchestrator.

The delivered CLI must behave exactly as it does before this refactor. The command surface, terminal text and destinations, exit codes, signal behavior, durable state, lock behavior, queue behavior, engine entries, and terminal-outcome protocol remain unchanged. The result is an architectural change that makes ordering reviewable and guarded without changing what users observe.

## Context

GitHub ticket #40 identifies `cli/src/commands/run.ts` as the CLI's largest remaining undecomposed procedure. `runCommand` currently combines document resolution, thread and artifact validation, pipeline composition, runtime resolution, Git and queue gates, unfinished-run detection, new-run allocation, signal handling, startup display, engine handoff, result mapping, and cleanup. Several orderings are safety properties rather than stylistic preferences. In particular, temporary-workspace Git safety must be checked before clean-worktree advice is emitted, and pending queues must be rescanned after the workspace lock is acquired.

`resumeCommand` has the same architectural shape at a smaller scale: it combines a distinct ordered preflight with signal checkpoints, lock acquisition, display, engine handoff, result mapping, and cleanup. Both commands are in scope so the command layer ends with one coherent structure (per `decisions.md` DR1).

The execution engine already demonstrates the intended form: its loop states order while named phases own the work, and `cli/src/architecture.test.ts` holds each phase to its permitted caller. The scenario-output assertions and checkpoint ownership split requested by tickets #38 and #39 are present in the implementation baseline, so this refactor can rely on those verification and dependency surfaces.

## Scope

The implementation includes:

- decomposing both `runCommand` and `resumeCommand` while keeping their entry modules as the only complete statements of command order (per `decisions.md` DR1 and DR2);
- command-specific preflight modules under the respective `commands/run/` and `commands/resume/` areas;
- semantic module boundaries based on coherent responsibilities rather than a mechanical copy of the current section comments (per `decisions.md` DR3);
- `commands/run/allocate.ts` as the transactional owner of new-run allocation (per `decisions.md` DR6);
- a distinct resume-owned collaborator for acquisition of the existing run's recorded workspace lock (per `decisions.md` DR7);
- a neutral command-owned `CommandDeps` type for dependencies shared by both commands, with run-only injection seams held by a run-specific extension (per `decisions.md` DR5);
- structured success and refusal values between command steps and their orchestrators;
- architecture-test coverage for the new command-step topology; and
- preservation and, where a safety-sensitive gap exists, strengthening of command-level behavioral tests and process-level demo coverage (per `decisions.md` DR4).

## Non-scope

The implementation does not:

- add, remove, rename, or change CLI commands or flags;
- change pipeline documents, execution profiles, settings, the stage catalog, artifact prerequisites or promises, queue resolution, Git policies, or target resolution;
- change the checkpoint schema, run-directory layout, lock format, run identifier format, or compatibility posture;
- change the terminal-outcome tokens `DONE`, `BLOCKED`, and `REFUSED`, the `Outcome: ` prefix, or any suite/CLI contract;
- change preflight refusal wording, startup output, output streams, exit-code mapping, or when a durable checkpoint is left behind;
- split or redesign `cli/src/execution/`;
- introduce a generic command lifecycle coordinator or a generic pipeline of callbacks;
- migrate command behavior tests onto extracted modules merely to mirror the new file structure;
- modify the CLI stage-support table, because no stage support or prerequisite changes; or
- add migrations or compatibility shims.

## Required architecture

### Command orchestration boundary

`cli/src/commands/run.ts` and `cli/src/commands/resume.ts` remain the only modules that state their commands' full order. They directly sequence named command steps and retain the command-owned lifecycle work: refusal presentation, signal-handler installation and removal, signal checkpoints, startup presentation, `executeEngine` handoff, engine-result-to-exit-code mapping, and successful-lock cleanup (per `decisions.md` DR2 and DR5).

Each extracted preflight step:

- owns one coherent, named responsibility;
- accepts only the typed facts available at its place in the sequence;
- returns a typed success value or a structured, inert refusal value carrying everything the command needs to reproduce the existing presentation;
- does not render output, select an exit code, install or inspect signal handlers, invoke `executeEngine`, or release a successfully handed-off lock;
- does not invoke another command preflight step; and
- does not reach back into its command orchestrator.

Structured refusals are data, not rendering callbacks. Plain-message failures and the existing rich composition, harness-runtime, and temporary-workspace refusals may use different variants, but the command remains responsible for selecting the existing renderer and stream.

Module boundaries follow responsibility, not the thirteen legacy `Preflight N` comments. A boundary must remain explicit in the orchestrator whenever it establishes an independently meaningful fact, reaches a distinct collaborator, or protects a safety-sensitive ordering. Short local operations may stay together only when their ordering has no independent safety meaning (per `decisions.md` DR3).

### Run order

The refactored `runCommand` must preserve this order and dataflow:

1. Establish command-local display, failure, clock, abort-controller, and signal-handler ownership.
2. Resolve configuration and state roots.
3. Resolve, load, and strictly validate the required pipeline document.
4. When selected, resolve, load, and validate the execution profile.
5. Load and validate settings, preserving the missing-settings behavior.
6. Resolve and validate the active thread and its owning repository.
7. Inspect the thread's concrete artifact state.
8. Compose the selected pipeline suffix and resolve its concrete targets.
9. Resolve one complete binding per selected stage and build the immutable stage snapshots, profile selection, and optional `fromStage` value.
10. Resolve the selected harness runtime and observed versions, preserving scripted-prompt presentation.
11. Check temporary-workspace Git safety.
12. Only after temporary workspaces are known safe, require a clean worktree.
13. Scan both pending queues and refuse on pending files or a scan error.
14. Scan sibling run directories, warn and continue for unreadable checkpoints, and refuse an unfinished run for the same repository workspace and thread.
15. Observe the existing pre-allocation signal checkpoint. A signal here creates no run.
16. Allocate the new run through the transaction described below.
17. Observe the existing post-allocation signal checkpoint. A signal here releases the lock and leaves the initial `ready` checkpoint for resume.
18. Render scripted-mode startup when applicable, render the run summary, call `executeEngine` once with an `allocated` entry, map its structured result, release the held lock unconditionally, and uninstall signal handlers unconditionally.

Refusal at any read-only run-preflight step returns the existing failure code and presentation and leaves no new run directory, checkpoint, or held lock. Existing warnings for unreadable sibling checkpoints remain warnings and do not become refusals.

### Run allocation transaction

`commands/run/allocate.ts` owns new-run allocation as one transaction (per `decisions.md` DR6). Given the fully prepared run facts, it:

1. resolves the canonical current-checkout workspace;
2. generates a candidate run identifier;
3. acquires the workspace lock for that candidate;
4. rescans both pending queues while holding the lock;
5. creates the candidate run directory;
6. on collision, releases the lock and restarts with a fresh candidate, including lock acquisition and the under-lock queue rescan;
7. constructs and writes the initial `ready` checkpoint only after the directory is created; and
8. returns the run directory, checkpoint, and still-held lock together on success.

A lock refusal, locked queue scan error, pending file, or checkpoint-write error returns structured refusal data. Every failure after lock acquisition releases the lock. A queue failure creates no run directory. A checkpoint-write failure retains the current durable run-directory behavior but leaves no held lock. Allocation does not render output, choose an exit code, inspect command signals, print startup information, or invoke the engine. Ownership of the lock transfers to `runCommand` only in the successful result.

### Resume order

The refactored `resumeCommand` must preserve this order and dataflow:

1. Establish command-local display, failure, clock, abort-controller, signal-handler, and signal-code ownership.
2. Resolve only the state root; a config-root problem must not block an otherwise state-only resume.
3. Resolve and validate the requested run directory without searching for a replacement.
4. Observe the existing signal checkpoint after locating the directory.
5. Read and validate the checkpoint.
6. Observe the existing signal checkpoint after reading the checkpoint, then refuse a completed run.
7. Revalidate the recorded active thread and require its resolved repository and thread identities to equal the checkpoint.
8. Observe the existing signal checkpoint after thread revalidation.
9. Resolve the immutable runtime recorded by the run, probe only the current stage's harness, preserve scripted-mode config-root behavior, and produce the merged process-local harness-version map without mutating the checkpoint.
10. Observe the existing signal checkpoint after runtime resolution.
11. Resolve the canonical current-checkout workspace and require it to match the recorded workspace.
12. Observe the existing signal checkpoint after workspace validation.
13. Check temporary-workspace Git safety before lock acquisition.
14. Observe the existing signal checkpoint immediately before lock acquisition.
15. Acquire the recorded workspace lock through the distinct resume collaborator described below.
16. Observe the existing signal checkpoint immediately after acquisition; release the lock and leave the checkpoint unchanged if signaled.
17. Render scripted-mode startup when applicable, render the snapshotted run summary, call `executeEngine` once with a `resume` entry, map its structured result, release the lock unconditionally, and uninstall signal handlers unconditionally.

Resume preparation remains read-only with respect to the checkpoint and acquires no workspace lock. Every pre-lock refusal leaves the checkpoint byte-for-byte unchanged and leaves no newly held lock. The command continues to derive resume behavior only from the checkpoint, not from current pipeline, profile, settings, or catalog documents.

### Resume lock acquisition

The resume-specific acquisition collaborator accepts the fully prepared resume facts, attempts to acquire the existing run's recorded workspace lock, and returns either structured lock-contention data or the still-held lock (per `decisions.md` DR7). It does not allocate an identifier, create a run directory, write or modify a checkpoint, render the refusal, inspect signals, or share an orchestration path with new-run allocation. On success, lock-release ownership transfers immediately to `resumeCommand`.

### Shared command mechanics

Move dependencies genuinely shared by both commands to a neutral command-layer `CommandDeps` type. Keep the candidate-ID generator in a run-specific extension rather than exposing it to resume. `resume.ts` must not import its dependency contract from `run.ts` (per `decisions.md` DR5).

Preflight phases remain command-specific even when they call the same existing lower-level operation. Context-neutral and order-independent logic may be shared below that boundary when it forms a coherent abstraction. A shared helper may not encode command sequence, call command phases, render output, choose exit codes, manage the signal lifecycle, hand off to the engine, or own successful-lock cleanup. No shared helper is required merely to remove a few similar lines.

## Behavioral and repository constraints

- This is a zero-behavior-change refactor. Existing command tests are the behavioral oracle and must keep their behavioral expectations (per `decisions.md` DR4).
- Preserve all current signal observation points and their before/after-allocation or before/after-lock consequences. Do not add, remove, or reorder signal checkpoints as part of the decomposition.
- Preserve the temporary-workspace-before-clean-worktree ordering in `run`; a dirty temporary workspace must continue to receive the dedicated safety refusal rather than advice to commit or revert it.
- Preserve the under-lock pending-queue rescan on every run allocation candidate, including after an identifier collision.
- Preserve the resume rule that temporary-workspace safety is checked before lock acquisition and every checkpoint mutation.
- Preserve the exact `allocated` versus `resume` entry passed to the engine, one engine call per successful command entry, existing version-map semantics, and all engine-result mappings.
- Preserve lock-release behavior on refusals, collisions, signals, engine results, and thrown engine failures.
- Keep catalog entries plain data and keep the terminal-outcome protocol unchanged.
- Keep architecture guards at least as strict. A failing guard indicates a boundary violation to fix, not a test to relax.
- Update `cli/AGENTS.md` so its durable module map and command-architecture description match the delivered structure. Do not add implementation inventories or maintenance commentary that belongs only in code or tests.
- Do not update `cli/README.md`'s stage-support table: neither supported stages nor their artifact requirements change.

## Functional requirements and acceptance criteria

### FR-1 — Both commands expose explicit orchestration without behavior change

Both long command procedures are replaced by command-level sequences over named collaborators, while their public behavior remains identical (per `decisions.md` DR1, DR2, and DR4).

- **AC-1.1:** Source inspection shows both `run.ts` and `resume.ts` directly state their full ordered sequence from initial setup through engine-result mapping and cleanup; neither delegates that sequence to a generic lifecycle coordinator.
- **AC-1.2:** The existing `runCommand` and `resumeCommand` behavioral suites pass without weakening, deleting, or moving behavioral assertions to extracted modules; changes needed solely for renamed dependency-type imports are allowed.
- **AC-1.3:** No CLI argument, help text, exit code, terminal message, output stream, checkpoint field, run-directory or lock format, pipeline behavior, or terminal-outcome token changes as a result of the refactor.
- **AC-1.4:** Command handoff tests prove `runCommand` calls the engine once with the freshly allocated `allocated` cursor and `resumeCommand` calls it once with the validated `resume` cursor, with every engine result mapped to the same exit code and fatal diagnostic as before.

### FR-2 — Run preflight preserves its safety-sensitive order

Run preparation is decomposed into coherent command-specific steps whose call order remains visible in `run.ts` (per `decisions.md` DR2 and DR3).

- **AC-2.1:** A run with unsafe temporary workspaces and a dirty tree still emits the temporary-workspace refusal, does not emit clean-worktree commit-or-revert advice, creates no run, and invokes no harness.
- **AC-2.2:** Dirty-worktree, pending-queue, queue-scan, invalid-document, composition, binding, runtime, thread, and unfinished-same-thread-run refusals retain their existing exit code, diagnostics, and no-allocation effects.
- **AC-2.3:** An unreadable sibling checkpoint still produces its warning and does not block a run unless a readable non-completed checkpoint identifies the same workspace and thread.
- **AC-2.4:** A signal observed before allocation returns the conventional signal exit code with no run directory, checkpoint, or held lock.
- **AC-2.5:** Static inspection shows temporary-workspace safety, clean-worktree validation, the initial queue scan, and unfinished-run detection as distinct ordered calls in `run.ts`.

### FR-3 — New-run allocation remains one race-safe transaction

Allocation owns the coupled candidate, lock, queue, directory, and initial-checkpoint operations and transfers one complete allocation to the command (per `decisions.md` DR6).

- **AC-3.1:** The existing queue-race test proves a queue that fills after read-only preflight but before the under-lock rescan causes exit `1`, no created run checkpoint, no harness call, and no retained lock.
- **AC-3.2:** The existing identifier-collision test proves the first candidate's lock is released, a fresh identifier is generated, the lock and queue checks are repeated, and only the fresh candidate receives the initial checkpoint.
- **AC-3.3:** Lock contention and checkpoint-write failure retain their current diagnostics and release semantics; no allocation failure leaves a held lock.
- **AC-3.4:** Allocation's success type contains the run directory, initial checkpoint, and held lock together; its refusal type contains no exit code or executable renderer.
- **AC-3.5:** A signal observed after successful allocation but before launch releases the lock, returns the conventional signal exit code, and leaves the `ready` checkpoint available to resume.

### FR-4 — Resume separates read-only preparation from lock ownership

Resume validates all durable and live identities before acquiring the recorded workspace lock, then transfers successful lock ownership to the command (per `decisions.md` DR7).

- **AC-4.1:** Tests prove every pre-lock resume refusal leaves the checkpoint byte-for-byte unchanged and leaves no newly held lock.
- **AC-4.2:** A config-root error does not block a real-runtime state-only resume; scripted-runtime behavior continues to consult the config root only through its existing lazy path.
- **AC-4.3:** Tests continue to reject an unknown run, malformed checkpoint, completed run, mismatched recorded thread or repository, mismatched canonical workspace, runtime mismatch or probe failure, unsafe temporary workspace, and lock contention at the same observable boundary as before.
- **AC-4.4:** The signal checkpoints after run-directory lookup, checkpoint load, thread revalidation, runtime resolution, workspace validation, immediately before lock acquisition, and immediately after acquisition retain their current exit and mutation behavior.
- **AC-4.5:** The resume lock collaborator neither writes a checkpoint nor creates a run directory, and its success type returns the still-held lock to `resume.ts`.

### FR-5 — Command steps have typed, effect-bounded contracts

Extracted preflight modules return facts or refusals without hiding command control flow (per `decisions.md` DR2 and DR3).

- **AC-5.1:** Every discovered command preflight module has exactly one permitted production caller, and no preflight module calls another preflight module or imports its command orchestrator.
- **AC-5.2:** Architecture assertions prove preflight modules do not import exit codes, concrete display renderers, signal handling, or the execution engine.
- **AC-5.3:** Each safety-sensitive ordering relationship named in this spec is represented by separate calls in the appropriate command orchestrator rather than internal section comments in one extracted procedure.
- **AC-5.4:** Each refusal result is inert structured data sufficient for the command to reproduce the existing plain or rich refusal; no refusal contains a rendering callback or selected process exit code.

### FR-6 — Reuse stays below command-specific phases

Shared code represents neutral mechanics rather than a hidden shared command sequence (per `decisions.md` DR5).

- **AC-6.1:** A neutral command-layer module owns `CommandDeps`; run-only identifier generation is absent from the common type and present in a run-specific dependency extension.
- **AC-6.2:** `resume.ts` and resume-owned modules do not import their dependency contract from `run.ts`.
- **AC-6.3:** Any new helper imported by both run and resume phases is order-independent, contains meaningful logic beyond forwarding one existing call, and does not perform presentation, exit mapping, signal lifecycle, engine handoff, or successful-lock cleanup.
- **AC-6.4:** Run allocation and resume lock acquisition remain separate command-specific collaborators over the existing shared lock primitive.

### FR-7 — Architecture tests make the command topology enforceable

The static import-graph guard covers the command steps with the same fail-closed posture used for execution phases (per `decisions.md` DR1, DR2, and DR4).

- **AC-7.1:** An exhaustive architecture-test registry equals the production modules discovered in both command preflight trees; adding an undeclared step fails the test.
- **AC-7.2:** The registry asserts the exact permitted caller of every preflight step and the run-allocation and resume-lock collaborators; adding a second production caller fails the test.
- **AC-7.3:** Architecture tests reject step-to-step invocation, step-to-orchestrator imports, and direct orchestrator imports of leaf collaborators assigned to an extracted step.
- **AC-7.4:** The guard continues to permit command-owned imports needed for signal lifecycle, refusal and startup presentation, engine handoff, exit mapping, shared command types, and successful-lock cleanup.
- **AC-7.5:** Existing execution-phase architecture guards remain unchanged in force and continue to pass.

### FR-8 — Verification and durable documentation close the refactor

Verification covers observable behavior, process-level rendering, and the new source topology (per `decisions.md` DR4).

- **AC-8.1:** `npm --prefix cli run check` exits successfully.
- **AC-8.2:** `npm --prefix cli run demo:all` exits successfully with every scenario's output-marker assertions satisfied.
- **AC-8.3:** New command-level regression tests are added for any safety-sensitive behavior in this spec that lacked coverage; no unit test is added solely because a block moved into a new file.
- **AC-8.4:** Focused unit tests cover any new shared helper that contains meaningful branching or transformation not already exercised at the command boundary.
- **AC-8.5:** `cli/AGENTS.md` describes the resulting command-module architecture and its non-obvious ownership and ordering constraints without duplicating a routine file inventory.

## Degrees of freedom

The implementer may choose:

- the exact filenames and number of modules inside the required run and resume command areas, except that new-run allocation remains `commands/run/allocate.ts`; every choice must preserve the semantic boundaries, visible safety order, and exhaustive architecture registry above;
- whether typed step success values are represented as progressively widened command contexts or as narrower result values assembled by the orchestrator, provided a step cannot require facts unavailable at its position;
- the exact discriminated-union or generic-result representation for structured refusals and successes, provided refusals remain inert data and presentation stays in the command;
- the path and internal organization of the neutral command dependency owner and any run-specific extension, while retaining the `CommandDeps` ownership and dependency separation required above;
- whether to introduce a genuinely useful order-independent helper shared beneath command-specific phases; no shared helper is required; and
- the organization and naming of new architecture-test cases and any justified focused unit tests.

These freedoms do not permit changes to observable behavior, command order, lock ownership, signal checkpoints, durable formats, the suite/CLI contract, or the acceptance criteria.

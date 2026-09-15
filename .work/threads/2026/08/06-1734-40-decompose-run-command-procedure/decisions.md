# Decompose runCommand’s safety-critical procedure Decision Log

## DR1: Decompose both command procedures

Context: Both `runCommand` and `resumeCommand` coordinate ordered, safety-sensitive preflight work before handing a cursor to `executeEngine`. Their concrete validation steps differ, but both combine those steps with signal handling, lock ownership, startup display, engine handoff, result mapping, and cleanup in a long command body.

Decision: Decompose both `runCommand` and `resumeCommand` in this thread. Give each command an explicit orchestration sequence over named collaborators, extend the architecture guard to preserve the intended caller relationships, and retain allocation as a distinct `run` concern. Shared extractions are permitted when they name a genuinely coherent concept and make the resulting command architecture easier to understand; the implementation is not required to keep parallel command-specific code merely to avoid an early abstraction.

Rationale: Applying the same architectural treatment to both commands removes the known instances of the same maintainability problem and leaves one coherent command structure. The commands share lifecycle responsibilities but not an identical preflight dataflow, so clarity and an honest shared contract—not superficial similarity—determine whether a collaborator is shared or command-specific.

## DR2: Keep command order and effects at the orchestration boundary

Scope: CLI command preflight

Context: Extracting preflight blocks into files would not make their safety-sensitive order trustworthy if the extracted modules could invoke one another, render refusals, choose process exit codes, or start execution behind the command's orchestration sequence.

Decision: Keep `run.ts` and `resume.ts` as the only statements of their complete command order. Each extracted preflight module performs one named responsibility, depends only on facts established at its position, and returns either a typed success value or a structured refusal for the command to present. Preflight modules do not call one another, choose exit codes, or start the engine. The command owns refusal presentation, signal checkpoints, engine-result mapping, and cleanup. Architecture tests enumerate the preflight modules and enforce each module's single permitted caller, while behavior tests continue to prove safety-critical ordering and under-lock checks.

Rationale: This structure makes the sequence readable in one place and prevents extraction from hiding control flow or command-level side effects. Typed results give later steps explicit inputs, and the combination of single-caller guards with targeted behavior tests protects both architectural and runtime ordering without requiring every command to share one generic preflight framework.

## DR3: Extract coherent responsibilities rather than legacy comment blocks

Scope: CLI command preflight module boundaries

Context: The existing `runCommand` preflight is divided by thirteen numbered comments of uneven scope, while `resumeCommand` has a similar sequence without the same numbering. Reproducing those comments one-for-one would turn incidental boundaries into architecture, while broad preparation phases would leave multi-concern procedures whose internal ordering still depends on prose.

Decision: Define each extracted module around one coherent, named responsibility. Split responsibilities when an independently meaningful result is established, a safety constraint requires the ordering boundary to remain visible, or the work reaches a distinct collaborator. Short local substeps may remain together when their order is unsurprising and carries no independent safety meaning. Every safety-sensitive ordering relationship must appear as separate calls in the owning command orchestrator.

Rationale: Semantic boundaries keep the module structure understandable as implementation details evolve, while explicit calls retain the ordering constraints that motivated the refactor. This permits early decomposition when it clarifies a real concept without treating every existing section comment as a permanent module.

## DR4: Verify behavior at the command boundary

Scope: CLI verification for the command decomposition

Context: Existing command tests exercise refusals, signals, lock cleanup, queue races, checkpoint creation, engine handoff, and exit mapping through `runCommand` and `resumeCommand`. The demo catalog provides an additional process-level assertion surface with scenario-specific output markers, while the architectural properties introduced by this refactor require static import-graph checks.

Decision: Treat the work as a zero-behavior-change refactor. Keep existing behavioral assertions at the public command boundaries and do not weaken or relocate them merely because implementation moves. Add command-level regression cases for any uncovered safety-sensitive path, and add architecture tests that exhaustively enumerate command preflight modules, enforce their permitted callers, prevent steps from invoking one another, and prevent command orchestrators from directly reaching preflight-owned leaf collaborators. Require both `npm run check` and `npm run demo:all`. Add focused unit tests only when a new shared abstraction contains meaningful logic not already exercised through the commands.

Rationale: Command-level tests remain stable while internal boundaries change and therefore protect the observable behavior the refactor must preserve. Architecture tests cover the new structural promise, while the asserted demo catalog catches incorrect terminal paths that can share an exit code. Avoiding mechanically duplicated unit coverage keeps the test suite aligned with behavior rather than file count.

## DR5: Share order-independent mechanics below command-specific phases

Scope: Relationship between `run` and `resume` command modules

Context: The commands invoke several operations with existing shared owners, but each invocation occurs at a different place in a command-specific safety sequence. A phase shared directly by both command orchestrators would have two callers and would stop representing one explicit place in one order. The current `resume.ts` also obtains its dependency type from `run.ts`, despite most dependencies belonging neutrally to the command layer and the generated run identifier being specific to `run`.

Decision: Keep preflight phase modules command-specific and single-called. Reuse context-neutral, order-independent operations beneath the phase boundary, and introduce a shared helper only when it owns meaningful logic rather than wrapping one existing function. Move common injected dependencies to a neutral command-owned `CommandDeps` type, with run-only seams kept in a run-specific extension. Keep signal lifecycle, refusal rendering, engine handoff, result mapping, and lock cleanup visible in each command; do not introduce a shared lifecycle coordinator.

Rationale: This placement preserves one readable sequence per command without duplicating domain operations that already have proper owners. It permits an early shared abstraction when the concept is genuine and clear, while preventing reuse from hiding ordering or giving a command phase multiple drivers.

## DR6: Keep run allocation as one transactional boundary

Scope: `commands/run/allocate.ts`

Context: Run allocation couples the canonical workspace identity, candidate run identifier, workspace lock, under-lock pending-queue recheck, run-directory creation, and initial checkpoint write. Splitting these operations would permit durable paths, lock ownership, and race protection to drift apart, especially when a candidate identifier collides.

Decision: Implement allocation as one explicit transaction. It resolves the canonical workspace and, for each candidate identifier, acquires the workspace lock before rescanning queues. A queue refusal, scan failure, or checkpoint-write failure releases the lock and returns a structured refusal; an identifier collision releases the lock and retries from lock acquisition with a new identifier. Success returns the run directory, initial checkpoint, and still-held lock as one typed value. Allocation does not render output or select an exit code. `run.ts` retains the visible pre-allocation and post-allocation signal checkpoints and owns unconditional lock release after a successful allocation.

Rationale: The transaction keeps every candidate's identity, durable paths, lock, and queue evidence consistent and preserves the race-closing under-lock rescan. The ownership transfer on success gives exactly one component responsibility for releasing the lock on every path.

## DR7: Separate read-only resume preparation from lock acquisition

Scope: Resume command entry boundary

Context: Resume validates the state root, run directory, checkpoint, recorded thread and workspace, harness runtime, and temporary workspaces without changing the checkpoint. Acquiring the recorded workspace lock is the first process-owned filesystem mutation and has different semantics from allocating a new run.

Decision: Keep resume preflight read-only and have it produce a fully prepared resume context. Use a distinct command-specific collaborator to acquire the existing run's recorded workspace lock and return either a structured contention refusal or the still-held lock. `resume.ts` retains the visible signal checks immediately before acquisition and immediately after success, then owns unconditional release through its `finally`. Do not combine resume lock acquisition with run allocation.

Rationale: The boundary makes it explicit that validation completes before the command claims mutable process state, while keeping low-level lock mechanics out of the orchestration body. Separate run and resume acquisition collaborators reflect their different invariants without obscuring the shared lock primitive beneath them.

## DR8: Require the stock CLI gate before acceptance

Scope: CLI verification and thread acceptance

Context: The implementation report records that `npm --prefix cli run check` repeatedly timed out in the `engine.test.ts` teardown under default file parallelism, while an equivalent serial test invocation passed. DR4 and `spec.md` AC-8.1 require the stock command itself to pass.

Decision: Stabilize the `engine.test.ts` teardown within this thread and require `npm --prefix cli run check` to exit successfully before accepting the implementation. A serial Vitest invocation is supporting diagnostic evidence, not a substitute for the stock gate.

Rationale: The exact stock command is the repository-wide typecheck, test, and build contract, and this thread explicitly made it part of completion. Treating the baseline nature of the timeout as an explanation preserves useful diagnosis, but waiving the gate after it failed would weaken the acceptance contract. The repair may broaden the implementation slightly into test-harness cleanup, which is preferable to handing off a known red mandatory gate.

## DR9: Prove lock non-acquisition across resume refusals

Scope: Resume command verification

Context: The resume refusal matrix proves byte-for-byte checkpoint preservation and no harness invocation across the pre-lock refusal paths, but it does not inspect workspace locks. One matrix row deliberately begins with an existing lock to exercise contention, so the correct invariant is preservation of the arranged lock set rather than universal emptiness.

Decision: At the `resumeCommand` boundary, snapshot the workspace lock entries after arranging each refusal case and assert that the same entries remain after the command returns. Keep the correction in the shared refusal matrix; do not add production changes or per-module tests solely for this coverage gap.

Rationale: Comparing the before-and-after lock set proves that no refusal path acquires or leaks a new lock while remaining valid for the contention case. The command boundary is the behavioral oracle established by DR4, and one matrix assertion covers the promised invariant without coupling tests to the extracted module layout.

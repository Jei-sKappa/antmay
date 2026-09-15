# Architecture and Code Quality Improvements Decision Log

## DR1: Unify Durable Execution Transitions

Scope: CLI execution and resume architecture

Context: The CLI currently applies durable workflow transitions in both the generic runner and the resume command. The duplicated ownership covers checkpoint persistence, attempt mutation, queue gating, stage advancement, completion, and boundary recovery, and has allowed resume to finalize a checkpoint without a validated current-stage `DONE` attempt. The CLI is pre-release, so its checkpoint schema may be redesigned without compatibility machinery.

Decision: After command-specific preflight and lock acquisition, both run and resume will enter one execution engine through typed start or recovery inputs. The engine will exclusively own durable checkpoint transitions, including attempt mutation, queue gating, stage advancement, completion, and persistence. Focused collaborators will own cohesive policies such as Git finalization and pause/recovery decisions; the execution engine will coordinate those collaborators rather than accumulate their internal rules in one monolithic function.

Rationale: A single transition owner removes the competing workflow engines and makes checkpoint invariants enforceable at one boundary, directly addressing the invalid resume-finalization path. Focused collaborators preserve modularity and testability within that owner. This is a larger refactor than extracting helpers under the current callers, so the specification must define the transition model, staged implementation constraints, and characterization tests precisely enough to prevent an unstructured rewrite.

## DR2: Separate Pause Diagnostics from Recovery Control

Scope: Persisted waiting checkpoints and resume dispatch

Context: A paused checkpoint can report several simultaneous reasons, but the current schema also uses the first diagnostic reason and its optional fields to control recovery. Pauses differ materially: some precede any attempt, some preserve a non-`DONE` attempt for rerun, some follow an already finalized `DONE`, and contract or boundary pauses preserve a `DONE` attempt that still requires finalization.

Decision: A waiting checkpoint will retain its ordered reason list solely as diagnostic and presentation data and will carry a separate required discriminated recovery state. Recovery variants will represent rerunning the current stage, advancing after an already finalized `DONE`, finalizing a specifically referenced current-stage `DONE`, and remaining paused pending an external correction. Each variant will require exactly the evidence its action needs. A reference to an attempt will use both stage index and attempt number. Resume will dispatch exclusively on the recovery state, never on reason ordering. Checkpoint validation will reject recovery states whose attempt is absent, belongs to another stage, lacks a `DONE` terminal token, has an incompatible result, or conflicts with the checkpoint condition.

Rationale: Diagnostics may legitimately accumulate and change precedence without changing the safe recovery action, so they are not a sound control interface. A focused recovery union makes recovery intent explicit in persisted state while avoiding the duplication and update complexity of modeling the entire checkpoint as a large discriminated union. Cross-field validation remains necessary, but it is centralized at the checkpoint boundary and can enforce the exact attempt relationship the engine relies on.

## DR3: Encapsulate the Complete Git Boundary Protocol

Scope: CLI Git boundary finalization

Context: Normal execution and saved-`DONE` recovery currently make their own sequences of `HEAD` reads, worktree observation, policy evaluation, staging, staged-set verification, optional commit, and final `HEAD` observation. Recovery further exposes boolean evaluation options even though first-time finalization after contract repair and retry after a prior boundary or commit failure have different semantics.

Decision: The existing Git boundary module will expose one asynchronous finalization operation that owns the complete Git protocol. Its input will use a discriminated context for normal attempt finalization, first-time finalization after contract repair, or retry after a boundary or commit failure. The operation will perform all `HEAD` and worktree observations, selector and required-change evaluation, staging of validated paths, staged-set verification, optional commit, and final `HEAD` observation. It will return a structured success, Git-policy violation, or commit failure together with the observations and any diagnostic fact that `HEAD` moved while paused. First-time finalization after contract repair will still apply the original attempt's `HEAD` rule; retry after a prior boundary or commit failure will treat human `HEAD` movement across the pause as diagnostic, and an intentionally committed change may satisfy `changeRequired`. The module will not mutate checkpoints, advance stages, or render terminal prose. The execution engine will consume the structured result and own those consequences.

Rationale: Git finalization is a cohesive, safety-critical protocol whose ordering and recovery semantics should be local to the module that understands Git policy. A semantic context union expresses the real operational differences without leaking sequencing flags. Keeping durable transitions and presentation outside prevents the Git module from becoming a workflow engine while giving execution one small, testable boundary to call.

## DR4: Keep Pause and Recovery Policy Pure

Scope: CLI execution-engine collaborators

Context: The execution engine must combine a persisted recovery variant with fresh queue, artifact-contract, worktree, Git, and abandoned-attempt evidence. Giving the engine both evidence collection and every recovery rule would recreate the large conditional structure this thread is intended to remove, while one stateful handler object per recovery variant would add an extensibility framework around a closed set of states.

Decision: A focused pause-and-recovery policy module will accept a validated recovery state and structured evidence and return a finite domain directive such as rerun the current stage, advance after a finalized `DONE`, finalize the referenced saved `DONE`, or remain paused with updated diagnostic data. The module will perform no filesystem access, checkpoint persistence, terminal rendering, or checkpoint patch construction. The execution engine will collect the required evidence, invoke the policy, apply the returned directive as a complete durable transition, and persist it.

Rationale: Pure recovery policy can be exhaustively table-tested without filesystem fixtures and keeps the execution engine focused on orchestration. Returning domain directives rather than partial checkpoint objects preserves the engine as the single owner of mutation and prevents the policy boundary from becoming a second transition implementation.

## DR5: Persist an Immutable Harness Runtime Identity

Scope: Run checkpoints and harness selection

Context: The current optional `startedScripted` marker prevents a scripted run from resuming without the developer toggle, but an unmarked run that began against the real harness can resume through the scripted harness when ambient environment state later enables that mode. Other execution inputs are snapshotted so resume does not silently redefine an existing run. The scripted scenario itself is intentionally a live developer input and is re-read on every scripted resume.

Decision: Every checkpoint will carry a required harness-runtime identity discriminated as real or scripted. The identity is fixed when the run is allocated and cannot change on resume. A scripted run will require the exact developer toggle and a valid live scripted scenario on every resume. A real run will refuse resume when the scripted toggle is enabled rather than switch providers. The scripted scenario will remain external to the checkpoint and continue to be re-read and validated on resume.

Rationale: Provider identity materially changes execution and must not be selected for an existing run by ambient environment state. Making it explicit and immutable gives resume deterministic, fail-closed behavior in both directions. The live scripted scenario remains useful for developer-controlled test progression without weakening the identity of the adapter executing it.

## DR6: Resolve and Load One Harness Runtime

Scope: Harness runtime selection, probing, and adapter loading

Context: Both run and resume currently interpret developer runtime state, load scripted scenarios, pair an invoker with its matching executable probe, normalize version results, and receive every real and scripted implementation through their dependency bags. The production command handler eagerly imports both adapter families once either execution command is selected. Runtime resolution requires selected stage IDs for a new run and the persisted runtime identity plus current harness for resume, so it cannot be completed at top-level command dispatch.

Decision: Run and resume will share one harness-runtime resolver. It will select the runtime for a new run or enforce the checkpoint's immutable runtime on resume, validate the developer toggle, load and validate the live scripted scenario when applicable, dynamically import only the selected adapter family, keep the invoker and executable probe paired, perform probing, and return normalized non-empty version results plus structured failures and runtime metadata. Terminal prose will remain in the display layer, and scripted prompt observation will enter through an observational callback. Production command dispatch will load only the selected command and the small resolver; command test dependencies will expose one injectable runtime-loader seam instead of individual real and scripted implementations. The scripted adapter's provider-facing invoker will be separated from its large fixed case and effect catalog without changing the built-in case behavior.

Rationale: Runtime selection and probing form one cohesive real-versus-scripted seam used identically by both execution commands. Resolving them together prevents mismatched invoker/probe pairs, removes repeated selection policy, and avoids loading the developer harness during ordinary execution. Structured results preserve the display boundary, while a single injectable resolver keeps command tests controllable without exposing concrete adapter internals.

## DR7: Give Thread Artifact Contracts One Domain Owner

Scope: Thread artifact state, pipeline contracts, and checkpoint validation

Context: The canonical artifact dimensions and value types currently originate in the pipeline module, their filesystem meaning and descriptions live in the thread module, and checkpoint validation repeats the dimension names and legal values. Catalog entries and checkpoints require the contract representation to remain plain serializable data.

Decision: A cohesive thread-artifact domain module will be the sole owner of artifact state, plan-state values, patterns, prerequisites, transitions, mismatches, canonical dimension and value metadata, validators for untrusted serialized patterns and mismatches, filesystem inspection, matching and transition operations, and human descriptions. Pipeline catalog and composition will import the vocabulary and operations from that domain. Checkpoint validation will delegate artifact-pattern and mismatch validation to it, and display will consume its descriptions while retaining presentation layout. The domain may be organized as focused files under a thread-artifacts module rather than one large source file. Its exported state and contracts will remain plain serializable data, and consumers may read a declared dimension when their rule genuinely depends on it. Artifact semantics and user-visible behavior will not change.

Rationale: Artifact structure is a thread-domain concept used by pipelines, not a pipeline concept implemented by threads. One canonical owner prevents a new dimension or value from requiring manually synchronized validators and descriptions across modules. Keeping the representation plain preserves catalog and checkpoint serialization, while avoiding an opaque facade prevents abstraction from obscuring simple declarative rules.

## DR8: Split Terminal Rendering by Phase

Scope: CLI display architecture

Context: The terminal implementation combines run listing, preflight refusals, startup and developer diagnostics, live execution events, and closing states in one large file. These views reuse painting primitives but serve different consumers: the execution engine needs a replaceable synchronous lifecycle sink, commands own startup and preflight rendering, and list has a separate read-only result. A single interface spanning all views would require consumers and test doubles to depend on unrelated methods.

Decision: Terminal rendering will be split into focused modules for shared painting primitives, run listing, preflight refusals, startup and developer diagnostics, and execution lifecycle output. The execution engine will retain a small execution-display interface and commands will call focused renderers for command-owned phases. A small barrel may provide convenient public imports. The architecture review's proposal for one interface covering every terminal view is rejected. User-visible output will remain unchanged, and existing demo scenarios will be run as regression coverage; scenarios will change only if the implementation exposes a genuine coverage gap or intentionally changes output under a separate decision.

Rationale: Shared formatting justifies internal reuse but does not establish common lifecycle ownership. Phase-specific seams follow interface segregation, keep engine tests lightweight, and solve the giant-file problem without replacing it with a giant presentation contract. Preserving output limits this work to architecture and maintainability rather than combining it with an unrelated interface redesign.

## DR9: Deliver the Accepted Audit Scope Through One Strictly Planned Implementation

Context: The accepted audit actions form one target architecture, but their implementation crosses checkpoint state, execution orchestration, Git policy, harness runtime, thread artifact contracts, and terminal rendering. The thread will proceed through a handoff-grade specification, the applicable specification and plan revision steps, a strict plan, and implementation of that plan with subagents.

Decision: The specification will cover all audit actions accepted in DR1 through DR8 as one implementation scope. It will define the target architecture, preserved behavior, changed behavior, safety invariants, material sequencing dependencies, and verifiable acceptance criteria, but it will not prescribe the task breakdown that belongs to planning. The future strict plan will split the implementation into sensible bounded tasks, order them according to the specification's dependencies, and require appropriate verification at task and integration boundaries before implementation with subagents.

Rationale: One specification keeps the coupled architectural outcome coherent and resolves the thread's full audit goal. Deferring task decomposition to the strict plan avoids prematurely turning architectural decisions into an implementation checklist, while the planned revision and review steps provide the control needed for a safe delegated implementation.

## DR10: Keep Commands Read-Only Across Existing Run State

Scope: Run and resume command adapters versus the execution engine

Context: Argument, document, checkpoint, thread, workspace, runtime, signal, and lock handling are command-level concerns, while some current resume preflight branches on waiting-reason kinds to choose worktree and recovery behavior. A new run also needs an initial checkpoint before an existing run can be transitioned.

Decision: The run command will own new-run preflight, same-thread-run protection, lock acquisition, under-lock allocation checks, run-directory creation, and creation of the initial validated `ready` checkpoint. The resume command will locate and validate the checkpoint, reject completed runs, revalidate recorded identities, resolve the immutable runtime, and acquire the recorded lock without mutating the checkpoint. Both commands will then call the same execution engine with a typed entry value. Under the lock, the engine will own abandoned-attempt recovery, recovery-sensitive worktree requirements, queue gates, artifact checks, harness attempts, Git finalization, pause construction, advancement, completion, and every rewrite of an existing checkpoint. Commands will retain signal-handler lifecycle, startup and preflight presentation, lock release, and engine-result-to-exit-code mapping. Neither command will branch on a recovery variant or diagnostic waiting-reason kind.

Rationale: Initial checkpoint creation is run allocation rather than a transition of existing state, so keeping it in the run command preserves no-run-on-preflight-failure behavior without creating a competing engine. Moving every recovery-sensitive check and all subsequent mutation behind the locked engine entry prevents resume from retaining hidden workflow policy.

## DR11: Use Four Explicit Waiting Recovery Variants

Scope: Persisted waiting recovery and attempt-specific Git evidence

Context: DR2 separates diagnostic reasons from recovery control, but contract repair, Git-boundary retry, queue release after a finalized `DONE`, and ordinary stage retry require different control paths. Treating contract and Git pauses as one generic saved-`DONE` finalization would force the engine to consult diagnostic reason kinds. The current `gitCursor` associates `HEAD` evidence with a stage cursor rather than the exact attempt being recovered.

Decision: Waiting checkpoints will use four recovery variants: `retry-stage`, which launches a new current-stage attempt after applicable gates pass; `resume-finalized-done`, which references an exact already-finalized `DONE` attempt and carries its snapshotted `advance` or `rerun` resolution; `recheck-stage-contract`, which references an exact waiting `DONE` attempt and re-inspects its promised artifact state before directing Git finalization, a safe retry, or another pause; and `retry-git-finalization`, which references an exact waiting `DONE` attempt whose artifact contract passed and retries its Git boundary without invoking the harness. Remaining paused will be a directive from the pure recovery policy rather than another persisted recovery kind. Every attempt will carry its own required start-`HEAD` evidence and, once settled, its post-attempt `HEAD` observation. Contract and Git recovery states will carry the latest pause-time `HEAD` required to diagnose movement across a pause. The global `gitCursor` will be removed. Validation will enforce each variant's current-stage attempt reference, attempt result, `DONE` token, queue resolution where applicable, and required Git evidence.

Rationale: The four variants correspond to materially different safe next actions and make recovery dispatch exhaustive without deriving control from presentation data. Attempt-local Git observations bind evidence to the event that produced it, while recovery-local pause observations preserve the cross-pause diagnostic. Removing the global cursor eliminates redundant state whose relationship to the referenced attempt was previously under-specified.

## DR12: Preserve Observable Behavior Except for Explicit Safety Changes

Scope: Specification acceptance boundary

Context: The accepted findings primarily change architectural ownership and module depth. The required checkpoint recovery model and immutable harness-runtime identity deliberately make some formerly accepted or ambiently selected states invalid, while unrelated command, pipeline, execution, and presentation behavior has no reason to change.

Decision: Command grammar and exit codes; pipeline composition, stage snapshots, targets, artifact prerequisites and promises, and queue resolutions; lock ownership and manual stale-lock recovery; queue gating and signal behavior; the Git-policy semantics established in DR3; prompts, attempt logs, session capture, and continuation commands; and terminal content, stream selection, ordering, color independence, and existing scenario outcomes will remain unchanged. Intentional changes are limited to rejecting checkpoints that lack or violate the required runtime, recovery, attempt, or Git evidence; refusing a real-runtime checkpoint when scripted mode is enabled; and loading only the selected harness adapter in ordinary execution. The checkpoint schema will remain at version `0`, and previously written documents that do not satisfy the new schema will be rejected without migration or compatibility handling. Acceptance coverage will include invalid recovery references, exhaustive recovery-policy directives, every engine recovery variant, normal and recovered Git finalization against real Git fixtures, immutable runtime selection and lazy adapter loading, artifact-domain serialization and validation, unchanged display behavior, and an executable UI scenario for the new real-runtime versus scripted-toggle refusal. The full `npm run check` gate and affected demo scenarios must pass.

Rationale: A refactor should not silently redesign stable CLI behavior. Naming the narrow safety changes gives implementation and review a precise regression boundary, while the required test layers verify both pure transition policy and side-effecting integration. Rejecting old version-zero checkpoints follows the CLI's pre-release contract and avoids weakening the new invariants with compatibility paths.

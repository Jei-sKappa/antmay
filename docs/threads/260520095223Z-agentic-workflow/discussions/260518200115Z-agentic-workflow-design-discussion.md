# Agentic Workflow Design Discussion

Decision log for designing a lightweight, modular, harness-agnostic, spec-driven agentic workflow.

## Required Runtime Shape

Decision: V1 will be skills-only, starting with a small set of skills. Small helper scripts may be added only when they are necessary, but they must remain optional. A required CLI is postponed to V2 and should be considered only if real usage proves it is needed.

Rationale: This preserves the workflow's lightweight and harness-agnostic goals while leaving room for minor automation. The trade-off is weaker enforcement in V1; correctness will rely on clear skill instructions and reviewable file artifacts rather than runtime gates.

## Repository Shape

Decision: Keep the workflow in the existing `Jei-sKappa/skills` repo, but expose it as a clearly grouped workflow bundle inside the repo rather than leaving it as an undifferentiated set of skills.

Rationale: A repo split is premature before the workflow is proven, but a flat skill list would make the spine and support modules hard to understand. Grouping preserves simple distribution while giving the workflow a visible identity and leaving individual skills independently installable.

## Grouping Mechanism

Decision: Represent the workflow grouping through marketplace plugin sections plus strong README grouping. Do not use nested skill directories or skill-name prefixes in V1.

Rationale: Marketplace grouping improves install/list discoverability and README grouping explains the conceptual spine. Avoiding prefixes keeps skill names clean, while avoiding nested directories preserves the current repository layout and distribution assumptions.

## Core vs Supporting Skills

Decision: Distinguish core workflow spine skills from supporting utility skills through README grouping and marketplace plugin grouping in V1.

Rationale: Users need to see which skills form the normal workflow path and which skills are optional helpers, but adding new frontmatter metadata before tooling consumes it would create maintenance burden without practical enforcement.

## V1 Coverage Model

Decision: V1 must include the complete workflow overview and the full catalog of possible workflow skills from day one, including planning and implementation. Some skills may begin as deliberately thin draft protocols, but the composition model, phase boundaries, inputs, outputs, and interaction rules must be defined across the whole workflow.

Rationale: The immediate goal is to establish a complete, production-ready workflow contract rather than to perfect every individual skill body. This preserves end-to-end usability and makes the system composable from the beginning. The trade-off is that some early skills may be skeletal and will need later refinement; that is acceptable as long as the catalog and interfaces are coherent.

## V1 Production-Ready Bar

Decision: V1 production-readiness means the composition contract is production-ready: every phase, artifact, input, output, skip rule, and handoff is defined. Individual skills may start as thin draft protocols as long as they respect that contract.

Rationale: The workflow's reliability depends first on clear interfaces between skills. It is acceptable for early skill internals to be rough; it is not acceptable for artifact ownership, handoffs, or phase boundaries to be ambiguous.

## Durable Artifact Root

Decision: Use `docs/threads/<YYMMDDHHMMSSZ-slug>/` as the visible, reviewable root for workflow artifacts. Scratch and temporary work tied to a thread belongs in that thread's local `.wip/` folder, not in a repository-level WIP root.

Rationale: Thread-local durable storage keeps all reviewable artifacts for a feature, bug, investigation, or decision together while preserving PR visibility. Keeping `.wip/` inside the respective thread folder preserves locality without promoting scratchpads into reviewable artifacts.

## WIP Ignore Rule

Decision: Use a recursive Git ignore rule for thread-local WIP, `docs/threads/**/.wip/`.

Rationale: The current thread contract only requires direct child folders under `docs/threads/`, but the recursive rule is simple and tolerant if nested organization appears later. The trade-off is that it is broader than strictly necessary.

## Thread Artifact Folders

Decision: Start conservatively with the essential V1 artifact folders: `proposals/`, `specs/`, `plans/`, `reviews/`, and `discussions/`. Additional folders may be added during workflow design if a clear need appears.

Rationale: Minimal folders keep thread layout approachable and avoid overfitting the storage model before the workflow is used. The trade-off is that some full-catalog skills, such as verification, follow-up capture, or merge, may need either an existing-folder home or a later folder addition.

## Non-Essential Artifact Folders

Decision: Keep the folder layout completely minimal for now. Extra artifact folders such as `verifications/`, `followups/`, or `merges/` will be discussed later when defining the actual skills and their output contracts.

Rationale: Folder expansion should be driven by concrete skill outputs rather than speculative completeness. The trade-off is that some skill storage questions remain intentionally unresolved until the workflow catalog is discussed.

## Artifact Filename Rule

Decision: Every artifact file should start with a UTC timestamp prefix using `YYMMDDHHMMSSZ`. Inside a timestamped thread folder, filenames should not mechanically repeat the thread slug when the context is already obvious. Instead, the rest of the filename should clarify what the artifact represents, such as `<date>-v1-spec.md`, `<date>-v2-spec.md`, or `<date>-alternative-spec.md`.

Rationale: Universal timestamp prefixes support sorting, immutability, multiple runs, and mergeability. Avoiding repeated thread slugs keeps filenames readable and focuses the name on artifact role, version, or variant. The naming convention may be refined later if real usage exposes ambiguity.

## Artifact Filename Description

Decision: Use a loose filename pattern after the timestamp: `<YYMMDDHHMMSSZ>-<short-kebab-description>.md`. The description is free-form. Include the artifact type in the filename when it improves clarity, but leave that as a user or agent choice rather than a strict rule.

Rationale: The artifact folder already provides broad type context, so filenames can stay human-readable and flexible. Avoiding a strict suffix grammar keeps V1 lightweight and avoids optimizing for tooling before a parser exists.

## Cross-Thread Index

Decision: Do not include a global cross-thread index in V1.

Rationale: A required or optional manual index would create bookkeeping that can easily become stale. Folder names, timestamps, and search are enough until real usage proves a generated index or other discovery mechanism is needed.

## Cross-Project Memory

Decision: Do not include built-in cross-project memory in V1. Users may rely on their harness's native memory features if they want, but those are outside the workflow contract.

Rationale: Keeping memory out of the workflow avoids creating another source of truth and preserves project-local reviewability. Harness-native memory remains available without making the workflow depend on any specific harness.

## Thread Self-Description

Decision: Do not require per-thread metadata such as `README.md`, `thread.md`, or `STATE.md` in V1.

Rationale: The artifacts inside the thread are the durable source of truth. Required metadata files create stale-bookkeeping risk and would undercut the lightweight storage model. Re-orientation will rely on artifact names, artifact contents, and search.

## Conversation Skills Shape

Decision: Use two sibling conversation skills: one for walking through a predetermined list of discussion points, and one for open-ended interviews where the agent discovers questions live. They should be named as an obviously related pair rather than as unrelated skills like `discussion-loop` and `free-interview`.

Rationale: The two modes share tone and logging conventions but have different control flows and triggers. Keeping them separate preserves clarity and replaceability. Related names will make the pair easier for users to discover and understand.

## Conversation Skill Names

Decision: Name the related conversation skills `discussion` and `seeded-discussion`. `discussion` is the open-ended conversation/interview skill where the agent discovers questions live. `seeded-discussion` is the predetermined-points skill, replacing the current public role of `discussion-loop`.

Rationale: The names make the relationship between the skills visible while keeping the open-ended mode as the default. `seeded-discussion` communicates that the discussion starts from supplied seeds, though its description must be explicit because "seeded" is less immediately self-explanatory than "structured".

## Discussion Logging Location

Decision: Discussion logs should live inside the relevant thread at `docs/threads/<thread>/discussions/<timestamp>-<description>.md`. If no thread exists, the skill should resolve that naturally by either asking the user where to create/log it or creating an appropriate thread automatically when the context is obvious. The skill should behave like thread-local logging is normal, without wasting tokens on mechanical setup instructions.

Rationale: Thread-local logs preserve locality and keep discussion history beside the artifacts it governs. The trade-off is that conversation skills need lightweight thread-resolution behavior, but this should be treated as ordinary agent judgment rather than a heavy ritual.

## Discussion Log Timing

Decision: `discussion` and `seeded-discussion` should append decisions incrementally as the conversation progresses.

Rationale: Incremental append-only logging preserves decisions across interruptions and context loss. Cleaner synthesis can be handled separately rather than making the primary log fragile.

## General Summary Skill Idea

Decision: Park an idea for a general-purpose summary or synthesis skill. It could summarize discussions, documents, code findings, reviews, or other artifacts, but should not be tied exclusively to discussion logs.

Rationale: Summarization is likely useful across multiple workflow modules. Keeping it as a general support skill avoids overfitting it to discussion while leaving room to define a better role as the workflow design progresses.

## Discussion Question Style

Decision: Both `discussion` and `seeded-discussion` should include instructions for presenting options and recommendations. In `seeded-discussion`, options plus recommendation is the default and should be opt-out. In `discussion`, options plus recommendation should be opt-in and used when a concrete decision point emerges.

Rationale: Seeded discussions already begin from known decision points, so structured options keep the loop focused and reviewable. Open discussions may need exploratory interviewing first; forcing options too early can distort the problem framing. The shared pattern still gives both skills a common decision-making language.

## Discussion Question Budget

Decision: Do not impose a hard question cap. Discussion skills should interview relentlessly enough to reach shared understanding, walking down the design tree and resolving dependencies between decisions one by one.

Rationale: A conversation-driven workflow should not stop because an arbitrary question budget is exhausted. The discipline should be usefulness rather than count: the agent should ask one focused question at a time, pursue unresolved branches, and keep the conversation oriented toward decisions and artifacts.

## Scope Drift Handling

Decision: When a discussion uncovers a valuable but non-blocking branch, the agent should propose splitting or parking it instead of dragging the current discussion sideways. This should happen only when the branch is not blocking the current decision path.

Rationale: Relentless interviewing still needs scope discipline. The purpose of the split is not just to defer work, but to capture the idea, motivation, reasoning, background, and relevant context so it can later serve as input to a spec, review, discussion, or other artifact.

## Inbox and Backlog

Decision: V1 includes a thread-local `inbox/` with `open/`, `processed/`, and `dropped/` subfolders. There is no Backlog in V1.

Rationale: The Inbox gives the workflow a lightweight place to capture non-blocking review suggestions, deferred spec/task notes, and valuable split discussion branches without turning them into a full task-management system. The three status folders make it visible at a glance what still needs attention while avoiding backlog concepts like priority, owner, grooming, or committed future work.

## Inbox Item Format

Decision: Each Inbox item is a short markdown note with no fixed section template. It must always explain why the item is being captured and preserve enough context for a future reader to understand why it is worth reopening. It should include source, surrounding reasoning, links, options, possible next steps, or related artifacts when useful, but those are not mandatory headings.

Rationale: Inbox capture must be lightweight enough to use often, but not so free-form that future readers have to reconstruct the original chat. The hard requirement is contextual usefulness, not a rigid template.

## Inbox Capture Skill

Decision: Include a standalone Inbox capture skill, currently preferred as `capture-inbox`, and allow other workflow skills to use the same protocol when they need to preserve non-blocking ideas, suggestions, deferred decisions, or split discussion branches. Keep `capture` and `to-inbox` as naming alternatives to consider during the final catalog naming pass.

Rationale: Inbox capture is now broader than review follow-ups, so a narrow `capture-followup` skill would be misleading. A standalone skill gives the workflow a consistent reusable capture protocol while still allowing embedded capture behavior in discussion, review, spec, and plan skills.

## Inbox Capture Trigger

Decision: Inbox capture behavior depends on whether the workflow is user-active or autonomous/AFK. In user-active flows such as discussion or collaborative spec work, the agent should ask before creating an Inbox item. In autonomous or AFK flows such as implementation, review, verification, or full plan creation from a spec, the agent should automatically capture every meaningful non-blocking item rather than burying it in an end summary. The Inbox serves both as a place for agents to leave useful information for the user and as a place for users to park things they have in mind.

Rationale: Active conversations should not let the agent silently create durable artifacts while the user is present and able to choose. Autonomous flows need stronger automatic capture because useful observations can otherwise disappear into a summary or run log. The usefulness threshold remains important: the agent should capture meaningful items, not every tangent.

## Interaction Mode Variants

Decision: Treat interaction mode as a first-class workflow distinction. The high-level workflow remains a simple spine, roughly `propose -> spec -> plan -> implementation -> finish`, but individual phases may have autonomous and discussion-based variants. For example, a phase can have both `write-plan` and `write-plan-interactive`, or `implement-plan` and `implement-plan-interactive`. V1 may duplicate skill bodies to make the catalog explicit, with DRY improvements deferred until the workflow stabilizes.

Rationale: The workflow must be flexible enough for both AFK/autonomous execution and active user-agent collaboration. Separate skill variants make the difference visible and easy to invoke. The trade-off is duplication and possible drift between paired skills; this is acceptable in V1 only if the shared contracts and differences are documented clearly.

## Variant Naming Convention

Decision: Use explicit suffixes for both autonomous and interactive variants of workflow skills. In principle, every major operation can have both modes, such as an autonomous proposal flow from a short prompt or an interactive review flow that discusses findings with the user before deciding what to do.

Rationale: Explicit mode names avoid ambiguity in a flat skill catalog and support the workflow's flexibility goal. The trade-off is noisier skill names, but that cost is acceptable because mode changes behavior materially: autonomous flows can proceed and capture meaningful Inbox items, while interactive flows discuss decisions with the user.

## Unsuffixed Aliases

Decision: V1 uses only explicit mode variants with `-auto` and `-interactive` suffixes. Do not include unsuffixed convenience aliases in V1. Convenience names, routers, reusable instruction templates, or generated skill variants may be added later once the workflow and DRY strategy are clearer.

Rationale: Explicit names make interaction mode visible and avoid hidden defaults. Router aliases would add indirection before the base catalog is proven. The README can present the simple spine while the actual skill names remain unambiguous.

## Core Workflow Spine

Decision: The V1 core workflow spine is `propose -> spec -> plan -> implementation -> finish`. Discussion, review, verification, critique, second opinions, and similar activities are cross-cutting modules/skills/flows that can be applied to any phase or artifact rather than mandatory top-level spine phases.

Rationale: The workflow should mirror how a user can discuss or review anything with a colleague: an idea before proposal, a proposal after drafting, a spec, a plan, code, git status, or finish state. This keeps the core spine simple while allowing quality and conversation modules to attach wherever they are useful. Specialized review/verification variants may exist for targets like specs, plans, code, intent, or ambiguity, but they belong to the broader review/verification/critique module family.

## Core Model

Decision: The workflow is a flexible, composable toolbox rather than an enforced process. Every phase and module is optional, including the nominal spine itself. Users may skip proposal, spec, plan, implementation, or finish when appropriate; they may jump from spec to implementation, proposal to implementation, proposal to finish/discard, or any other coherent path. The workflow should provide uncoupled utilities that cover the pieces a user might need, plus optional opinionated ways of working on top.

Rationale: Flexibility is the core differentiator from heavier workflows. Without a CLI or enforcement layer, hard gates are not enforceable anyway. The design should lean into that reality: make each component useful and replaceable on its own, then document recommended compositions rather than requiring them.

## Workflow Guidance Layer

Decision: Provide both README guidance and a `whats-next` skill. The README should document the full possible workflow and component composition, potentially with a flowchart or state-machine-style model. The `whats-next` skill should inspect the current context/artifacts and suggest coherent next actions or ask the user what direction they want. In a time-constrained V1, `whats-next` may be thin: point the agent to the canonical README URL and instruct it to read that guidance before advising the user.

Rationale: This creates an opinionated guidance layer without turning the base workflow into an enforced process. `whats-next` should be advisory, not a hidden router that executes other skills directly.

## Workflow Model Diagram

Decision: Use a layered map in the README to explain the workflow. Show the nominal artifact spine as one layer and cross-cutting modules such as discussion, review, verification, critique, merge, Inbox, and summary as overlays that can attach anywhere. Keep NFA/state-machine notation as a plausible later addition if the workflow becomes hard to reason about.

Rationale: A layered map best communicates the toolbox model without implying a rigid pipeline. Formal state-machine notation may become useful later, but it is likely too abstract for the first user-facing explanation.

## Proposal Component Role

Decision: Include both `propose-auto` and `propose-interactive` as first-class V1 skills. They may be basic initially; V1 should prioritize composability, artifact contracts, and core workflow coverage over fine-tuned skill behavior.

Rationale: Proposal is a useful optional entry point for rough ideas, feasibility prompts, and feature-request-like artifacts. Providing both modes fits the workflow's flexibility model. The proposal skills do not need to be sophisticated in V1 as long as they produce durable, discussable proposal artifacts and compose cleanly with downstream skills.

## Proposal Artifact Format

Decision: Proposal artifacts are freeform markdown files. The proposal skills may suggest a plausible structure, such as intent, context, rough shape, and open questions, but they must not enforce a template or treat a proposal as valid/invalid based on section structure.

Rationale: The workflow is a modular toolbox, not a rigid document standard. The proposal artifact's contract is contextual usefulness and downstream discussability. Users should be able to replace the proposal skill with their own stricter or looser version without breaking the rest of the workflow.

## Artifact Contract Philosophy

Decision: Use recommended templates plus semantic contracts. The semantic contract defines what an artifact must communicate to compose with the workflow; the official skills may suggest default structures, but those templates are advisory rather than validity rules. User-selectable templating or configurable output shapes are deferred to V2/V3.

Rationale: The workflow already provides some opinion through thread and folder structure, but it should not require rigid document schemas. Semantic contracts preserve replaceability while recommended templates give users and agents useful defaults.

## Spec Component Role

Decision: Include new forward-looking `spec-auto` and `spec-interactive` skills in V1. Keep the existing `derive-spec` skill separate from this workflow decision for now; it freezes an existing codebase into a document and its naming/role can be reconsidered later.

Rationale: Creating a future implementation spec from a proposal, discussion, issue, or user prompt is a different job from reverse-engineering an existing codebase. The workflow needs first-class forward spec skills in both autonomous and interactive modes.

## Spec Immutability

Decision: Specs are immutable once emitted as durable files. Drafts may still be edited during the same active authoring session before emission. Meaningful changes after emission produce a new spec file, never edits to the existing one.

Rationale: Specs are part of the history of project development, not mutable state. This preserves reviewability, supports multiple versions or alternatives, and prevents later conversations from silently rewriting the decision basis for earlier work. The draft-session nuance keeps normal authoring practical before the artifact is emitted.

## Artifact Taxonomy

Decision: Replace the broad mutable/immutable framing with two axes: whether an artifact is editable after emission, and whether the artifact type supports multiple versions or variants. No emitted artifact is editable after emission. The artifact-type split is:

- Versioned artifacts: proposal, spec, plan.
- Record artifacts: discussion log, review, verification, inbox item.

Both buckets are open; new artifact types may be added to either as the workflow grows.

Rationale: Editability and versionability are separate concerns. All emitted artifacts should preserve history, but only some artifact types need version numbers and alternative branches. Record artifacts can have multiple independent records of the same type, such as three reviews of one spec, without treating them as versions of each other.

## Versioned Artifact Evolution

Decision: Versioned artifacts evolve only by emitting a new version or an alternative. Prior emitted versions are never edited. Record artifacts do not evolve after emission. During an active authoring or run session, a record such as a discussion log may still be appended until it is emitted/closed.

Rationale: This keeps historical artifacts stable while allowing the workflow to capture active conversations and long-running records incrementally. Once an artifact is emitted, later changes must appear as new artifacts rather than mutations.

## Versioned Filename Grammar

Decision: Versioned artifact filenames use:

`<timestamp>-v<N>[-<kebab-descriptor>]-<artifact-type>.md`

`<timestamp>` is `YYMMDDHHMMSSZ` UTC. `<N>` is a sequential integer starting at `0`. `<kebab-descriptor>` is optional. Descriptor presence marks the file as an alternative; no special `alt-` prefix is required. Absence means mainline. `<artifact-type>` is mandatory.

Rationale: This supports mainline versions and alternatives without requiring metadata or parent links. The artifact type is mandatory so filenames remain understandable when copied, searched, or viewed outside their folder context.

## Artifact Filename Description Amendment

Decision: Amend the earlier loose filename rule: artifact type is now mandatory in artifact filenames. Record artifact filenames use:

`<timestamp>-<kebab-description>-<artifact-type>.md`

`<kebab-description>` is a recommended kebab-case summary. `<artifact-type>` is mandatory, such as `spec`, `proposal`, `plan`, `discussion`, `review`, `verification`, or `inbox`.

Rationale: The earlier rule left artifact type optional for readability, but filenames need to survive being copied or grepped out of folder context. Adding one mandatory kebab segment is a small cost for clearer standalone filenames.

## No Source-Relation Metadata

Decision: Do not use frontmatter or source-relation keywords such as `Supersedes:`, `Alternative to:`, or `Forked from:` for workflow lineage in V1. Lineage, version, and alternative status live in filenames only. Merge inputs are provided explicitly when invoking the merge skill, not encoded as traversable parent links.

Rationale: Avoiding frontmatter and relation metadata keeps artifacts simple and prevents unconsumed metadata from becoming stale. The accepted trade-off is that a filename cannot tell whether a version came directly from a previous mainline version, from an alternative, or from a merge of a family. If that becomes painful in real usage, a single in-body relation line may be reconsidered later, but not frontmatter.

## Merge Output Naming

Decision: A merge of versioned artifacts emits the next mainline integer version. Merge inputs are not encoded in the output filename.

Rationale: The merge skill receives explicit inputs at invocation time, so filenames do not need to carry source lists. Emitting the next mainline version gives the merged result a clear promotion path while keeping naming compact.

## Version Number Semantics

Decision: Use target-version semantics for versioned artifacts. Version numbers start at `v1`, not `v0`. A filename like `vX-<descriptor>-<artifact-type>.md` means the artifact is a candidate or variant for mainline version `vX`, not an alternative from `vX`. A filename like `vX-<artifact-type>.md` means mainline version `vX`.

Rationale: Target-version semantics solve the parallel-from-nothing problem without inventing a fake `v0`. Initial parallel drafts can be named `v1-opus-spec.md`, `v1-sonnet-spec.md`, and `v1-codex-spec.md`; the promoted or merged result becomes `v1-spec.md`. If `v1` already exists, exploratory variants for the next mainline version use `v2-<descriptor>-spec.md`, and the selected or merged result becomes `v2-spec.md`.

## Versioned Filename Grammar Amendment

Decision: Amend the previous versioned filename grammar so `<N>` starts at `1`, not `0`, and descriptors use target-version semantics. The active grammar is:

`<timestamp>-v<N>[-<kebab-descriptor>]-<artifact-type>.md`

where absence of `<kebab-descriptor>` means mainline `v<N>`, and presence of `<kebab-descriptor>` means candidate or variant for mainline `v<N>`.

Rationale: This preserves compact filenames while clarifying what variants mean. The filename intentionally does not encode whether a candidate came from an earlier version, from parallel drafting, or from a merge input set.

## Canonical Version Optionality

Decision: Descriptorless mainline filenames such as `v3-spec.md` are a useful organization convention, not a required workflow invariant. A user may continue from a described variant such as `v3-abc-spec.md` by passing that artifact explicitly to a later skill. The workflow does not require a mandatory final canonical version for downstream skills to work.

Rationale: The workflow is a composable toolbox, so downstream skills should consume explicit artifact inputs rather than rely on a global canonical file. If a user asks for "the latest spec" while multiple candidates exist, the agent may need clarification; that ambiguity is a user/context issue, not a broken workflow. The workflow's opinion is that emitted files should not be edited, but it does not need to police promotion mechanics such as copy versus rename.

## Ambiguous Artifact Inputs

Decision: Treat ambiguous artifact references as a local skill behavior rather than a central workflow concern. Each skill should expect some kind of input and include a simple instruction to ask the user when the intended artifact is unclear or ambiguous.

Rationale: The workflow does not need to define a global "latest artifact" resolution algorithm. Skills can infer obvious context, but when multiple plausible artifacts exist, they should ask rather than silently choose.

## Spec Semantic Contract

Decision: A spec must be handoff-grade: if the author handed it to someone else, that person should be able to deliver the same work the author had in mind without guessing. Regardless of template, a spec must communicate the intended outcome, context, scope and non-scope, expected behavior or requirements, constraints, explicit decisions, unresolved questions or known gaps, and enough acceptance guidance to plan or review the work.

Rationale: The spec is a foundational artifact, not a rough note. It should prevent a review skill from marking it as non-ready on clarity or completeness grounds. Small specs can satisfy the contract concisely, but the outcome and relevant context must not be ambiguous.

## Spec Quality Bar Scope

Decision: The handoff-grade spec bar belongs to the opinionated/recommended workflow, not to an enforceable validity layer. Users remain free to write a two-line spec, skip review, pass it directly to planning or implementation, and accept the resulting ambiguity.

Rationale: The workflow provides composable utilities and recommended standards, not a mandatory gate system. Official spec skills should aim for handoff-grade output, and review skills can judge specs against that bar, but downstream skills should not require that every user-provided spec satisfies it before continuing.

## Decisions in Specs and Source Discussions

Decision: Official spec skills do not need a dedicated decisions section. When relevant discussion logs or other decision artifacts exist, specs should reference those source artifacts and incorporate settled decisions into the spec body where they matter, such as scope, requirements, constraints, non-goals, or acceptance guidance. Discussion logs are provenance, not the operative contract.

Rationale: This preserves composability without forcing specs into a rigid decision-ledger structure. A future implementer should not have to mine an entire discussion log to understand the work, so settled decisions must still be reflected in the spec itself. References to discussion logs explain where decisions came from.

## Discussion Decision IDs

Decision: `discussion` and `seeded-discussion` logs should number logged decisions sequentially as local IDs, using headings like `## D1: <Point title>`, `## D2: <Point title>`, and so on. Artifacts may reference those IDs when relevant and if they have access to a decision log. Decision IDs are local to their discussion log, so references should include the log path when ambiguity is possible.

Rationale: Decision IDs make discussion outcomes easier to reference from specs, plans, reviews, and later discussions without forcing every spec to include its own decision table. The convention remains optional in the broader workflow because users can create specs without any prior discussion log.

## Plan Component Role

Decision: Include both `plan-auto` and `plan-interactive` as first-class V1 skills. Planning remains optional, but when a user wants a plan, the workflow should provide both autonomous and collaborative ways to create one.

Rationale: Planning is part of the nominal spine and needs a clear artifact contract. Both modes matter: autonomous planning supports AFK flows, while interactive planning lets the user shape granularity, trade-offs, and scope. V1 implementations may be basic as long as they compose cleanly.

## Plan Granularity Profiles

Decision: V1 supports two built-in plan granularity profiles: `loose` and `strict`. `loose` plans are goal-oriented and higher-level. `strict` plans are more detailed and task/phase-oriented. Additional built-in granularities may be introduced later if usage proves they are needed, and users may create their own granularity-specific planning skills.

Rationale: Two profiles cover the main planning trade-off without catalog sprawl. Loose plans suit stronger implementers or exploratory work; strict plans help smaller/weaker implementers, tighter handoffs, and focused review.

## Plan Skill Matrix

Decision: Planning skills are split by both granularity and interaction mode:

- `plan-loose-auto`
- `plan-loose-interactive`
- `plan-strict-auto`
- `plan-strict-interactive`

Rationale: Explicit names make both the planning profile and interaction mode visible. The cost is verbosity, but this is consistent with the V1 decision to avoid hidden defaults and router aliases.

## Plan Granularity Adjustment

Decision: Add `adjust-plan-granularity-auto` and `adjust-plan-granularity-interactive`. These skills take an existing plan and change its granularity based on the user's request, such as looser, stricter, more implementation-ready, or more high-level. The agent interprets degree naturally rather than relying on a fixed list of transformations.

Rationale: A user may start with the wrong granularity or need to adapt a plan for a different implementer. A general adjustment skill avoids proliferating narrow skills such as `make-plan-looser` or `make-plan-stricter`.

## Plan Granularity Ownership

Decision: Plan granularity is a user/context choice. The workflow can explain trade-offs, but it should not treat strict as better than loose or loose as better than strict.

Rationale: Strict plans are useful when the implementer needs tighter guidance or the user wants focused review. Loose plans are useful when the implementer can reason more independently or the work benefits from flexibility. This trade-off belongs to the user and context, not the workflow.

## Plan Artifact Contract

Decision: A plan is an organized, ordered interpretation of an input artifact or context. Official `plan-*` skills should emit a sequential list of isolated tasks. Each task should be independently implementable and reviewable. Tasks may include optional steps and substeps depending on granularity. V1 does not support parallelization semantics.

Rationale: Task-shaped plans are a useful official output convention because implementation and review need coherent units of work. This does not make task-shaped plans a global validity rule; users may still bring other plan shapes. Loose plans contain fewer, goal-shaped tasks with minimal steps. Strict plans contain more detailed tasks with clearer steps/substeps and verification notes.

## Plan Parallelization

Decision: V1 plans do not include parallelization semantics, wave markers, dependency arrays, or task graph notation.

Rationale: V1 planning is sequential by contract. Users who want wave-aware planning can create custom plan skills and matching implementation skills that understand those semantics. Parallel planning is not part of the V1 workflow's business.

## Plan Self-Review

Decision: All official plan skills self-review their output before emission.

Rationale: Self-review is internal quality control, not an external review gate. The plan skill should check that tasks are coherent, independently implementable and reviewable, appropriate for the chosen granularity, not under-split, and not over-split before writing the durable plan artifact.

## Plan Commit Rule

Decision: Plan skills never commit automatically. They may report which files they created or changed, but committing is outside the plan skill's responsibility unless the user explicitly asks in the surrounding session.

Rationale: Committing is a separate composable concern, not part of planning. This matches the repository rule to never commit unless explicitly requested. In a future orchestration layer, `plan-auto` could be composed with a separate commit capability, but that is a later concern rather than a V1 planning behavior.

## Implementation Component Role

Decision: Include both `implement-auto` and `implement-interactive` as first-class V1 skills.

Rationale: Implementation is part of the nominal spine and needs both AFK/autonomous and user-guided modes. V1 implementation skills should be conservative: define inputs, safety boundaries, status reporting, self-review, and Inbox capture behavior rather than attempting to become a heavy orchestrator.

## Implementation Skill Split

Decision: V1 includes separate implementation skills for plan-shaped input and less structured input.

Rationale: Implementing from a plan or plan task is materially different from implementing from a spec, proposal, issue, Inbox item, code context, or direct request. Splitting the skills keeps each contract clearer while preserving optionality.

## Implementation Skill Names

Decision: Use:

- `implement-plan-auto`
- `implement-plan-interactive`
- `implement-auto`
- `implement-interactive`

`implement-plan-*` consumes a plan or specific plan task. `implement-*` consumes less structured implementation input.

Rationale: The names make plan execution visible without requiring every implementation path to go through a plan. The descriptions must make clear that `implement-*` is for less structured input, while `implement-plan-*` is plan-shaped.

## Implementation Topology Split

Decision: Subagent-driven implementation is only a first-class variant when the input is a plan. The V1 implementation catalog includes:

- `implement-auto`
- `implement-interactive`
- `implement-plan-auto`
- `implement-plan-interactive`
- `implement-plan-with-subagents-auto`
- `implement-plan-with-subagents-interactive`

Rationale: Subagent orchestration needs task boundaries, and plans are the artifact type that provides those boundaries. Less structured implementation inputs should stay simpler rather than trying to spawn subagents without a task decomposition.

## Plan Implementation Without Subagents

Decision: `implement-plan-auto` and `implement-plan-interactive` execute plan tasks without spawning dedicated implementer/reviewer subagents. They should rely on the current agent's implementation work plus self-review.

Rationale: These skills provide a lighter execution path for plans. A user may still explicitly ask the agent to spawn a subagent for a specific implementation or review step, but that is user-directed behavior outside the default skill contract.

## Plan Implementation With Subagents

Decision: `implement-plan-with-subagents-auto` is the normal fully autonomous subagent-driven plan execution path. For each plan task, it runs an implementer, then a spec-compliance reviewer, then another spec-compliance reviewer. When review fails, it respawns or returns to an implementer for fixes and always re-reviews after the fix before continuing to the next task. `implement-plan-with-subagents-interactive` follows the same topology, but every transition is a human-confirmed checkpoint, including implementation-to-review and final-review-to-next-task transitions.

Rationale: This captures the heavier review loop inspired by `obra/superpowers` while making it opt-in through an explicit skill name. The interactive variant keeps the same rigor but gives the user control at each step.

## Subagent Harness Compatibility

Decision: `implement-plan-with-subagents-*` assumes the harness can use, spawn, or create subagents. The skill does not need to provide an inline fallback or compatibility layer. If a user invokes a subagent skill in a harness without subagent capability, that is outside the workflow's responsibility.

Rationale: The workflow is a toolbox. A skill that explicitly says "with subagents" can depend on subagent capability by convention, just as any other specialized tool can depend on the capability it names. Silent fallback would make the skill name misleading and collapse the distinction between inline and subagent-driven execution.

## Subagent Review Roles

Decision: `implement-plan-with-subagents-*` uses two review roles after implementation: first a spec-compliance reviewer, then a code-quality reviewer.

Rationale: Spec-compliance review checks whether the task implemented the intended behavior. Code-quality review checks whether the implementation is maintainable, consistent with the codebase, and appropriately tested. Splitting the roles catches different failure modes better than running two identical compliance reviews.

## Subagent Fix Loop Ownership

Decision: When a subagent reviewer finds issues, the default V1 loop should use a new implementer for the fix rather than assuming feedback can be sent back to the original implementer.

Rationale: Not every harness supports sending follow-up messages to a previously spawned subagent, so "original implementer fixes" is not portable enough for the generic skill. A harness-specific custom skill may optimize this differently, but the V1 toolbox should not depend on persistent subagent conversations.

## Subagent Re-Review Rule

Decision: In `implement-plan-with-subagents-*`, every fix made in response to a reviewer issue must be reviewed again before the workflow proceeds.

Rationale: The heavier subagent path exists for rigor. Reviewer feedback is not considered resolved just because an implementer attempted a fix; the relevant review role must check the fix before moving on.

## Blocker Diagnosis Skill

Decision: Defer a dedicated `diagnose-blocker-*` skill outside V1.

Rationale: Blocker diagnosis is a useful support module, but it is not needed in the first catalog. V1 implementation skills can report blockers and preserve context; a specialized blocker diagnosis skill can be added later if repeated usage proves it is worth first-class treatment.

## Implementation Status Protocol

Decision: Implementation skills use a four-state status protocol: `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, and `NEEDS_CONTEXT`.

Rationale: A small shared status vocabulary makes implementation outcomes easier to scan and compose without introducing a state file. `DONE_WITH_CONCERNS` is important for completed work with caveats, and `BLOCKED` / `NEEDS_CONTEXT` distinguish technical blockage from missing information.

## Implementation Commit Rule

Decision: `implement-*-auto` skills commit automatically. Invoking an `implement-*-auto` skill counts as explicit permission for that skill to commit its own implementation changes. `implement-*-interactive` skills ask the user before committing at each step or checkpoint.

Rationale: Implementation is the phase where durable code changes need checkpoints, especially in AFK/autonomous mode. This is intentionally different from document-producing skills such as planning, which do not commit automatically.

## Implementation Commit Granularity

Decision: `implement-plan-auto` commits after each completed plan task. `implement-plan-with-subagents-auto` commits after each task passes implementation, spec-compliance review, code-quality review, and any required re-review. `implement-auto` may commit once at the end or make multiple commits when the input artifact, prompt, implicit task structure, or explicit Git instructions justify it. Interactive variants ask the user at the equivalent checkpoints before committing.

Rationale: Plan-shaped inputs provide natural task boundaries, while unstructured implementation inputs may contain implicit tasks or explicit Git expectations. The workflow should not over-constrain `implement-auto` commit shape. Implementation skills must not rewrite history, reset harmless formatting changes, or manipulate commits to satisfy artificial commit counts.

## Implementation Commit Failure Handling

Decision: If an implementation skill is expected to commit and cannot commit, it reports `BLOCKED`.

Rationale: In implementation flows, the commit is part of the implementation output: for plan-based work it represents the implemented subset of the plan, and for unstructured work it represents the completed implementation unit chosen by the agent or prompt. A failed commit means the implementation artifact is incomplete from the workflow's perspective.

## Git Worktree Support

Decision: V1 does not support Git worktree-based implementation flows.

Rationale: Worktree management would add orchestration complexity and is outside the first workflow contract. V1 implementation operates in the current repository checkout.

## Dirty Worktree Handling

Decision: If the repository is dirty before implementation starts, the agent should ask the user how to proceed. In subagent-driven implementation, the main orchestrator owns this check before spawning implementation/review subagents.

Rationale: Implementation skills must not accidentally commit unrelated user work or revert existing changes. Asking preserves user control in both autonomous and interactive modes when pre-existing repository changes make ownership ambiguous.

## Implementation Plan Adherence

Decision: Do not over-specify plan deviation handling in V1. The plan gives the agent the work to implement; if something turns out to be wrong during implementation, the agent should handle or fix it using normal judgment and report meaningful outcomes.

Rationale: The exact deviation policy is hard to design before testing the full workflow. V1 should focus on producing plans and giving agents enough instruction to implement them, then refine deviation rules after real usage exposes the failure modes.

## Review Skills Are Target-Specific

Decision: V1 review skills are target-specific rather than generic. The V1 review catalog includes:

- `review-spec-auto`
- `review-spec-interactive`
- `review-plan-auto`
- `review-plan-interactive`
- `review-proposal-auto`
- `review-proposal-interactive`
- `review-implementation-auto`
- `review-implementation-interactive`
- `review-code-auto`
- `review-code-interactive`

Rationale: A generic review skill would be too vague to be useful. Review quality depends heavily on target: proposals, specs, plans, implementation, and general code need different questions and standards.

## Spec Review Skill

Decision: Rename or adapt the existing `review-decision-document` skill into `review-spec-auto`. It uses the handoff-grade bar: the spec should be ready to hand off without ambiguity, so someone else could deliver the work the author had in mind without guessing.

Rationale: The existing skill already reviews decision documents against this kind of clarity and readiness standard. A spec is the workflow artifact where that bar matters most.

## Plan Review Skill

Decision: `review-plan-*` checks whether a plan follows the source spec or input artifact, respects project conventions/guidelines, avoids errors, and is appropriate for its chosen granularity. For strict plans, the review should check that tasks are not ambiguous and contain enough detail for the intended implementer.

Rationale: Plan review protects the implementation phase by catching incorrect decomposition, missing requirements, excessive ambiguity, and mismatch with selected granularity. Consider `review-plan-with-subagents-*` in V2 because plan review has many angles that may benefit from specialized reviewers.

## Proposal Review Skill

Decision: `review-proposal-*` is a lightweight review for proposal artifacts, which are rough drafts, feature-request-like prompts, or feasibility starting points. It may include simple adversarial pressure when useful, but should stay lightweight.

Rationale: A proposal is not expected to be handoff-grade like a spec. Its review should surface gaps, risks, ambiguities, and useful next discussion points without pretending the proposal is an implementation contract.

## Implementation Review Skill

Decision: `review-implementation-*` checks whether implemented code is correct and matches the original spec intention or provided implementation input. This replaces the separate `verify-intent`/post-implementation verification concept in V1.

Rationale: Verification is better treated as a form of review rather than a separate workflow phase. `review-implementation-*` covers the original intent-check goal while fitting the target-specific review module family.

## Code Review Skill

Decision: `review-code-*` is a general-purpose code review skill not directly tied to the workflow spine. It checks code for bugs, errors, improvements, edge cases, maintainability, and similar concerns.

Rationale: Users often need a code review independent of a spec or implementation artifact. Keeping this separate from `review-implementation-*` distinguishes general code quality review from "does this implementation match the intended work?"

## Embedded Subagent Reviews

Decision: The spec-compliance and code-quality review roles inside `implement-plan-with-subagents-*` are embedded support prompts/files in that skill's folder, following the pattern of `.library/sources/obra_superpowers/skills/subagent-driven-development`. They do not need to be standalone V1 skills.

Rationale: Those reviewer roles are internal to the subagent-driven implementation loop. Keeping them as supporting files avoids bloating the public skill catalog while still making the orchestration explicit and maintainable.

## Adversarial Review

Decision: V1 suggests using the existing `the-fool` skill for adversarial review, pre-mortems, and devil's-advocate passes, including at least a suggested pass on specs in the opinionated README workflow. A native adversarial review skill may be considered for V2.

Rationale: `the-fool` already covers this role well enough for V1. A native skill may make sense later if adversarial review becomes central to the workflow rather than a supporting recommendation.

## Interactive Review Semantics

Decision: `review-*-interactive` skills perform a genuinely interactive review rather than an automated review followed by a discussion. The agent may ask the user for a review focus; if none is provided, it chooses where to start. It then walks through the artifact one topic, component, module, or suspicious finding at a time, asks the user for their view when useful, tests the user's explanation against the code/document/evidence, and continues iteratively.

Rationale: The value of interactive review is not merely discussing a finished findings list. Fully automated review can already produce findings for later discussion. Interactive review is useful because it lets the user and agent inspect one thing at a time, clarify intent, challenge assumptions, and validate explanations as the review unfolds.

## Auto Review Output Format

Decision: `review-*-auto` skills produce findings-first review reports.

Rationale: Automated review should be actionable and scannable. Reports should lead with verdict/findings, then provide evidence, references, open questions, and suggested next actions as appropriate. The exact severity labels may vary by review target, but findings need enough context to verify and act on them.

## Auto Review Output Location

Decision: `review-*-auto` outputs go to the thread Inbox at `inbox/open/`.

Rationale: Automated review reports produce material that needs human or agent triage: accept, discuss, act on, or drop. Placing them in Inbox makes that lifecycle visible instead of letting findings sit unnoticed in a passive `reviews/` folder.

## Interactive Skill Discussion Logs

Decision: `*-interactive` skills write discussion logs to `discussions/`. Filenames should identify the originating skill and target, such as `<timestamp>-review-plan-v2-api-plan-discussion.md` or `<timestamp>-plan-strict-v1-auth-spec-discussion.md`.

Rationale: Interactive skills are conversations that produce deliberation history and decisions. Keeping their logs in `discussions/` preserves that history separately from the Inbox action queue, while descriptive filenames make the source and target clear.

## Interactive Artifact Logging Amendment

Decision: `*-interactive` does not automatically mean "write a discussion log." `discussion` and `seeded-discussion` always produce logs. Artifact-producing interactive skills, such as `spec-interactive`, `propose-interactive`, and `plan-*-interactive`, produce the target artifact by default and create a log only when the interaction produces durable decisions, trade-offs, rejected alternatives, unresolved disagreements, or other material that cannot be directly and fully applied to the artifact being processed. Simple corrections, clarifications, or edit instructions are applied to the artifact and do not need to be logged as separate decisions.

Rationale: The goal of artifact-producing interactive skills is to create or refine the artifact, not to turn every user reply into governance history. User decisions that cannot be directly represented in the artifact belong in a durable log; routine authoring input belongs in the artifact itself.

## Discussion Skill and Decision Log Naming

Decision: Keep the skill names `discussion` and `seeded-discussion`, but call their durable output a decision log or decision record rather than a discussion log.

Rationale: "Discussion" correctly describes the process: exploration, challenge, follow-up questions, option comparison, and decision-making. "Decision log" better describes the durable artifact: only decisions or unresolved material worth preserving should be logged, not every conversational turn.

## Interactive Review Finding Routing

Decision: Interactive review findings that are resolved or rejected during the conversation remain only in the discussion log. Unresolved, accepted, or deferred actionable findings may be dumped to `inbox/open/` whenever the user asks, and should be written there at the end if any remain. If no actionable findings remain, no Inbox file is created.

Rationale: This avoids maintaining two live files throughout the review while still preventing unresolved findings from being buried in discussion history. The Inbox receives only material that still needs attention.

## Reviews Folder

Decision: Remove `reviews/` from the V1 thread artifact folder set.

Rationale: V1 review outputs no longer need a dedicated `reviews/` folder. Automated reviews go to `inbox/open/`, interactive review conversations go to `discussions/`, and unresolved actionable findings from interactive reviews go to Inbox. A dedicated review archive can be added later if real usage needs it.

## Finish Component Role

Decision: V1 includes a single `finish` skill rather than separate `finish-auto` and `finish-interactive` variants. `finish` asks the user what to do with the completed work, such as merge into main, merge into another branch, create a PR, or leave as is. It is heavily inspired by `.library/sources/obra_superpowers/skills/finishing-a-development-branch/SKILL.md`.

Rationale: Finishing is inherently user-directed because it affects branch disposition and collaboration workflow. A single interactive closure skill is clearer than forcing the auto/interactive split here. This is an explicit V1 exception to the mode-variant convention.

## Finish Scope

Decision: `finish` first performs a lightweight thread check, then asks the user what Git/branch action to take. The thread check should surface relevant final artifacts, open Inbox items, implementation commits/status, and any obvious unresolved workflow concerns. After that, the skill offers actions such as merge into main, merge into another branch, create a PR, or leave as is.

Rationale: Finish should not be a full review or verification gate, but it should prevent obvious closure mistakes like ignoring open Inbox items or unclear branch state. The user remains responsible for deciding the final Git action.

## Merge Component Role

Decision: Include both `merge-artifacts-auto` and `merge-artifacts-interactive` in V1.

Rationale: Mergeability is a core workflow principle, especially for consolidating multiple model outputs, revisions, reviews, or alternative artifacts. Both autonomous and interactive merge modes should exist from day one, even if V1 implementations are basic.

## Merge Scope

Decision: `merge-artifacts-*` defaults to merging same-type artifacts. Cross-type merging is allowed when the user explicitly states the desired output type or the target type is obvious from context.

Rationale: Same-type merging is simpler and safer for common cases such as spec+spec or plan+plan. Cross-type merging remains useful, such as proposal+discussion to spec, but the merge needs a clear target artifact type to avoid becoming an unbounded summarizer.

## Merge Output Location

Decision: Merge outputs go to the normal folder for the target artifact type. A merged spec goes to `specs/`, a merged plan goes to `plans/`, a merged proposal goes to `proposals/`, a merged discussion goes to `discussions/`, and a merged Inbox/review-findings artifact goes to `inbox/open/`.

Rationale: The output's primary identity is the target artifact type, not the fact that it was produced by a merge. This avoids adding a `merges/` folder and keeps downstream skills able to consume the merged artifact from the expected location.

## Merge Traceability

Decision: `merge-artifacts-interactive` writes a discussion log. `merge-artifacts-auto` writes no separate merge log.

Rationale: Interactive merges involve user decisions about what to keep, remove, or change, so those decisions should be captured as deliberation history. Automated merges should keep the artifact surface smaller in V1; the merged artifact itself is the output.

## Merge Conflict Handling

Decision: `merge-artifacts-interactive` asks the user to resolve conflicts between inputs. `merge-artifacts-auto` preserves conflicts explicitly in the output when it cannot confidently resolve them.

Rationale: Interactive mode can use the user to decide subjective conflicts. Auto mode should not silently choose when inputs disagree in a meaningful way; preserving the conflict keeps uncertainty visible for later discussion or review.

## Summary Skill

Decision: Defer a general-purpose summary/synthesis skill to V2.

Rationale: Summarization is likely useful across discussions, reviews, Inbox items, code findings, and thread state, but the V1 catalog is already substantial. V1 should first prove whether merge, finish, and discussion logs leave a real gap that a summary skill should fill.

## Whats Next Output Behavior

Decision: `whats-next` answers in chat by default and may optionally capture meaningful deferred actions or recommendations to Inbox when appropriate.

Rationale: `whats-next` is an advisory navigation helper, not an artifact-producing phase. Chat-first output keeps it lightweight. Inbox capture remains available when the user wants to preserve a path or when the workflow's active/autonomous capture rules make capture appropriate.

## Whats Next Skill Name

Decision: Name the advisory navigation skill `whats-next`.

Rationale: The name matches how users naturally ask for contextual workflow guidance and makes clear that the skill suggests possible next actions rather than executing a hidden router.

## V1 Thread Folder Set

Decision: The finalized V1 thread folder set is:

```text
proposals/
specs/
plans/
discussions/
inbox/
  open/
  processed/
  dropped/
.wip/
```

There is no `reviews/`, `verifications/`, `merges/`, or `adrs/` folder in V1.

Rationale: This matches the routing decisions made so far. Versioned core artifacts have folders, interactive conversations have `discussions/`, actionable or triageable material has `inbox/`, and scratch work has `.wip/`. Other folders can be introduced later if real usage proves they are needed.

## V1 Skill Catalog

Decision: The V1 skill catalog is:

Core / guidance:

- `whats-next`
- `finish`

Discussion:

- `discussion`
- `seeded-discussion`

Proposal:

- `propose-auto`
- `propose-interactive`

Spec:

- `spec-auto`
- `spec-interactive`

Plan:

- `plan-loose-auto`
- `plan-loose-interactive`
- `plan-strict-auto`
- `plan-strict-interactive`
- `adjust-plan-granularity-auto`
- `adjust-plan-granularity-interactive`

Implementation:

- `implement-auto`
- `implement-interactive`
- `implement-plan-auto`
- `implement-plan-interactive`
- `implement-plan-with-subagents-auto`
- `implement-plan-with-subagents-interactive`

Review:

- `review-proposal-auto`
- `review-proposal-interactive`
- `review-spec-auto`
- `review-spec-interactive`
- `review-plan-auto`
- `review-plan-interactive`
- `review-implementation-auto`
- `review-implementation-interactive`
- `review-code-auto`
- `review-code-interactive`

Merge:

- `merge-artifacts-auto`
- `merge-artifacts-interactive`

Inbox:

- `capture-inbox`

Deferred beyond V1:

- `diagnose-blocker-*`
- summary/synthesis skills
- native adversarial review
- commit helper skills
- Backlog
- CLI/router aliases

Rationale: This catalog covers the full workflow from day one while preserving the toolbox model. Some skill bodies may be thin in V1, but the composition contracts, artifact routing, and naming conventions should be clear.

## README Organization

Decision: Organize the README as a hybrid: first explain the toolbox model and layered workflow map, then show common recommended paths, then list skill families by module.

Rationale: Users should first understand that the workflow is composable and not mandatory. Common paths provide onboarding without turning into hard rules. The module-family catalog keeps the full skill set discoverable.

## Marketplace Grouping

Decision: Add one V1 marketplace plugin group for workflow skills, such as `JeisKappa-workflow`.

Rationale: A single workflow group makes the catalog discoverable without creating many small headings. If the group becomes unwieldy in practice, module-level marketplace grouping can be revisited later.

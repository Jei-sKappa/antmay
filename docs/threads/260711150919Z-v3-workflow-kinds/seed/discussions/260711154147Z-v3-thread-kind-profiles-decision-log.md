# Decision log — V3 thread kind profiles (the seed)

Thread: docs/threads/260711150919Z-v3-workflow-kinds/
Target: seed/seed.md
Subject: defining the structural model that lets a future CLI resolve each thread into a deterministic workflow contract.

## P1: Complete kind profiles

Point: Decide whether a thread should select one complete kind profile rather than independently selecting a kind and an assurance level.

What you need to know: Universal `light`, `medium`, and `high` levels imply that every kind participates in the same assurance scale. That is artificial for kinds that have only one sensible form, and it obscures differences that are structural rather than assurance-related. For example, `quick/direct` versus `quick/planned` changes whether a plan exists; it is not merely a difference in review intensity.

A fully qualified kind profile could instead select the complete machine-readable contract:

```yaml
kind: quick/direct
```

```yaml
kind: quick/planned
```

```yaml
kind: roadmap/reviewed
```

```yaml
kind: maintenance
```

Here, `maintenance` needs no variant because it has only one supported contract. The delimiter is a later syntax choice; `/`, `.`, or `:` could all express the relationship.

Decision: A thread selects one complete kind profile rather than combining a kind with a universal tier or assurance modifier. The kind defines a workflow family and its possible optional steps; its enumerated variant resolves those choices by enforcing or disabling the relevant steps. A kind with only one supported contract needs no variant.

Rationale: This gives users a simple mental model and gives a future CLI one deterministic contract to resolve. It avoids forcing every workflow family onto an artificial global assurance scale. The trade-off is potential variant proliferation, so variants are coherent, enumerated profiles owned by the kind rather than arbitrary feature-flag combinations, and related profiles may share their kind's common definition.

## P2: Required and optional obligations

Point: Decide how a variant controls the steps and checks declared by its kind.

What you need to know: A binary required/disabled model cannot represent voluntary activity. For example, a profile might not require a review but should still permit one. Conversely, some activities may be genuinely incompatible with a profile and should be rejected.

Decision: Kind definitions describe the overall workflow, and variants resolve its configurable obligations as either required or optional. Users may define their own variants by changing configuration. The model has no forbidden state: extra files or voluntary activities do not invalidate a thread merely because its selected variant does not require them.

Rationale: A future CLI cannot and should not make progress depend on deleting a user-created file. Required versus optional is sufficient to calculate missing obligations while leaving the thread extensible. The trade-off is that unrecognized or unnecessary artifacts cannot be treated as structural errors; tooling may surface them for information, but their precise effect on blockers and completion remains to be decided separately.

## P3: Engine-neutral V3

Point: Decide whether OpenSpec should be V3’s canonical engine or an architectural reference and optional interoperability target.

What you need to know: OpenSpec provides a proven artifact-DAG pattern, schema resolution, instructions, and agent integration. Its stock schema model does not provide optional obligations, semantic evidence predicates, configurable lifecycle, review-blocker semantics, or roadmap child aggregation. Adding those through a fork or wrapper would require V3 to own most of the state resolver anyway, while coupling it to OpenSpec’s layout and evolving internals.

Decision: V3 will be an engine-neutral thread protocol with no dependency on OpenSpec. OpenSpec will be used only as an architectural reference; V3 will not commit to an OpenSpec adapter or compatibility target. A native CLI or engine may be built later against V3's own contract.

Rationale: OpenSpec validates useful ideas such as artifact dependency graphs and schema-driven instructions, but its completion, optionality, lifecycle, review, and parent-child models do not meet V3's defining requirements. Treating it as a dependency, fork, wrapper target, or promised adapter would add coupling without removing the need to design and own V3's state resolver. The trade-off is that V3 must specify its own protocol and eventually implement its own engine.

## P4: Obligation graph and minimal lifecycle

Point: Decide whether a kind should define an ordered sequence, a general state machine, or a dependency graph of observable obligations.

What you need to know: A sequence cannot naturally express parallel work or roadmap aggregation. A general state machine can express everything, but risks stored mutable state, cycles, and hard-to-explain transitions. A dependency graph can derive readiness and completion from evidence while a very small lifecycle model records only non-derivable conditions such as active, deferred, or closed. Dynamic roadmap work can be represented through an obligation whose evidence evaluates a declared collection of child threads rather than by creating a graph node for every child.

Decision: Use a directed acyclic graph of observable obligations plus a minimal explicit lifecycle as V3's working progression foundation. Variants resolve configurable obligations as required or optional; evidence and dependencies determine satisfaction and readiness; explicit lifecycle state is limited to active, deferred, closed done, and closed dropped. The concrete configuration syntax is not yet decided, and this architectural choice must remain open to an explicit follow-up review before implementation.

Rationale: The model supports parallel readiness, deterministic explanations, and dynamic roadmap child aggregation without introducing a general transition language or storing derivable progress. Treating it as a working foundation allows the remaining consumption and evidence semantics to test the model before it becomes an implementation contract; a later change will be appended as a superseding decision rather than rewriting this record.

## P5: Shared resolver and headless evaluator

Point: Decide which component resolves kind profiles and evaluates thread progress, and when that resolution occurs.

What you need to know: Configuration has two distinct jobs. At thread creation, the selected kind and variant must be resolved into a stable contract. During the thread, that contract must be evaluated repeatedly against artifacts, reviews, child threads, and lifecycle events. Skills should produce evidence for obligations, but should not each implement topology resolution or completion rules.

Decision: V3 will include a minimal headless resolver and evaluator as the single semantic consumer of workflow configuration. It validates kind definitions, resolves and pins the selected variant when a thread opens, evaluates current evidence, and emits machine-readable readiness, blocker, and completion results. Skills and humans satisfy the resulting obligation contracts rather than interpreting raw topology configuration. A polished user-facing CLI remains future work and will act as an interface over the same evaluator.

Rationale: Configurable kinds cannot govern threads deterministically without a shared implementation of their semantics. Shipping the evaluator with V3 prevents each skill from duplicating resolution and completion rules while allowing the full CLI experience to be postponed. The trade-off is that V3 now includes a small software component rather than being a documentation-and-skill-only change.

## P6: Versioned thread-local contracts

Point: Decide how a thread-local contract remains interpretable when later evaluator versions change their vocabulary or semantics.

What you need to know: A resolved contract protects a thread from changes to reusable kinds and variants, but only if the evaluator still understands the contract’s primitive operations. If the evaluator contains special code for nodes named `discussion`, `plan`, or `verification`, renaming or removing those concepts can break old threads. If node IDs are opaque and behavior is expressed through a small versioned vocabulary of dependencies and evidence predicates, most workflow evolution does not affect existing threads.

Decision: Each thread owns an authoritative resolved contract snapshot carrying its contract-format version and the selected kind and variant as provenance. Obligation IDs such as `discussion`, `plan`, or `verification` are opaque to the evaluator; only a small versioned vocabulary of dependency and evidence primitives has engine-defined semantics. Published primitive semantics are immutable within a format version. Evaluators use compatibility readers for supported historical formats, fail explicitly rather than guessing when a format is unsupported, and handle genuinely incompatible changes only through an explicit migration that preserves the previous contract and records the semantic change. Closed threads are not migrated.

Rationale: A snapshot prevents reusable kind edits from changing existing threads, while opaque IDs prevent workflow vocabulary changes from breaking evaluation. Versioned primitive semantics make old contracts interpretable without freezing all future design. Explicit migration preserves auditability when compatibility cannot be maintained. The trade-off is maintaining historical readers for a documented support window and retaining migration history when a live thread crosses formats.

## P7: Better thinking as the primary purpose

Point: Looking at your actual experience—not the future CLI idea—which primary problem do you most want this project to solve?

What you need to know: My current hypothesis is **A first, B through lightweight artifacts, and C only when real usage demonstrates the need**.

Decision: The repository's primary purpose is to offer a clear, opinionated take on spec-driven development that helps users think better with AI: clarify intent, surface missing decisions, and produce reliable implementation handoffs through one or more understandable workflows. Continuity is a secondary benefit provided by lightweight durable artifacts. Machine orchestration and control are not primary goals.

Rationale: The repository originated as a public methodology and a practical personal workflow. In actual use, structured thinking and handoff quality provide recurring value, while returning to stale threads is rare and mechanical lifecycle bookkeeping is routinely bypassed. Optimizing for better thinking keeps the product aligned with its real use instead of building coordination infrastructure for hypothetical future needs.

## P8: Ephemeral reviews

Point: Decide whether review reports and their dispositions should remain committed thread artifacts or become temporary diagnostic work.

What youcurrently, the format is XY, but you suggested Z. Could you explain whether there’s a specific reason for that, and what you mean by “Context”? need to know: Review findings describe the current defects or risks of another artifact and normally become stale once those issues are fixed. Persisting every review and disposition adds folders, lifecycle metadata, and manual closure work. The durable value lies in the corrected target, any new human decision, and the final implementation evidence. Exceptional workflows may still require retained reviews for audit or external collaboration.

Decision: Reviews are temporary diagnostic operations by default, not committed workflow artifacts. Clear omissions, contradictions, defects, and other findings that can be resolved from existing decisions are fixed automatically and rechecked without asking the user. A finding that requires new human judgment is discussed with the user, and only the resulting decision enters durable thread history. Review files may be retained only when an explicitly audit-oriented kind profile requires them or an external review system owns them.

Rationale: A review describes the current condition of another artifact and becomes stale after correction, so preserving it creates lifecycle bureaucracy without durable value. The corrected artifact, any new human decision, and final implementation evidence are the meaningful history. The trade-off is that ordinary review deliberation is not recoverable from Git, which is acceptable because it served diagnosis rather than lasting intent.

## P9: One thread-wide decision log

Point: Decide whether V3 should replace per-target discussion logs with one eagerly created thread-wide decision log and explicitly distinguish transient discussion points from durable decision records.

What you need to know: A **discussion point** is an interaction format designed to help reach a decision. A **decision record** is a durable, self-contained projection of the result. They should not mirror each other mechanically.

The discussion point may include material that has no lasting value: Title; Point; What you need to know; Options or proposed solution; Recommendation.

The decision record should be rewritten after the choice is settled: Title; Scope (optional); Context; Decision; Rationale. `Context` combines the durable parts of `Point` and `What you need to know`, but it is not copied verbatim from the conversation. A fresh agent must be able to understand what problem was being considered, what was settled, why it was settled, and where the decision applies without needing the options menu or chat transcript.

Decision: V3 creates exactly one `decisions.md` eagerly when a thread opens, alongside the seed; a thread with no decisions keeps a header-only file. Discussion points remain transient conversational structures. Once a point is settled, the agent writes a self-contained thread-wide `D<N>` decision record containing a title, optional `Scope`, mandatory `Context`, `Decision`, and `Rationale`. IDs are sequential across the thread. Per-target discussion logs and their folders disappear. Child threads own their own decision logs. The seed plus `decisions.md` must be sufficient to discard the conversational session and author the next artifact without inventing missing intent.

The fields obey these rules:

- `Scope` answers where the decision applies. It is omitted when the whole thread is the scope; otherwise it may name a stage, relationship, or thread-relative artifact path.
- `Context` is mandatory. It states the question and only the surrounding facts necessary to understand the decision.
- `Context` must be self-contained and written from the thread's perspective.
- `Context` must not say “in this chat,” “as you said,” “the user chose B,” or rely on conversational memory.
- `Context` may reference earlier records by ID, such as `D3`, when the reference is resolvable within the same file.
- `Context` may reference thread artifacts using thread-relative paths.
- `Context` must not introduce a new decision or assumption; normative choices belong in `Decision`.
- `Context` should normally be one short paragraph. It is not reconstructed deliberation.
- Rejected alternatives appear only when the trade-off is necessary to understand the rationale.
- `Decision` states the complete substantive resolution and never only an option letter.
- `Rationale` records why the choice was made, its principal trade-off, and any facts that materially condition the decision.
- Menus, recommendations, and general deliberation are not copied into the record.
- When a decision changes, append a new record that identifies the record it supersedes rather than silently rewriting history.

Rationale: One predictable file eliminates the clunky lazy-creation transition and makes decision history easy for agents and humans to locate. Separating the live discussion shape from the durable record preserves enough context for reliable downstream authoring without turning Git history into a partial chat transcript. The trade-off is losing physical target scoping, which the optional `Scope` field restores when it is useful; genuinely independent work should live in child threads rather than proliferating logs inside one thread.

## P10: Conventions-first V3

Point: Decide whether V3 should implement deterministic workflow evaluation or define kinds as opinionated skill-usage conventions.

What you need to know: A headless evaluator, obligation graph, and contract lockfile are useful for navigation, automation, and multi-agent coordination. They do not directly improve the quality of thinking, and they introduce protocol versioning, state interpretation, migrations, and maintenance. A conventions-first V3 can still standardize kinds, artifacts, decision capture, reviews, and handoffs while postponing executable workflow semantics until real usage demonstrates a need.

Decision: V3 will be a conventions-first methodology. Kinds and variants define documented, opinionated patterns for composing skills and durable artifacts; they are not executable contracts. V3 will not implement or commit to a headless evaluator, CLI, obligation DAG, thread-local contract lockfile, evidence-predicate language, historical protocol readers, or deterministic workflow enforcement. Predictable artifact names and locations should keep future tooling possible without designing the methodology around hypothetical tooling. The existing navigation skill may inspect a thread contextually and recommend next actions without claiming machine-authoritative workflow state.

This decision supersedes P4, P5, and P6 as V3 implementation commitments. Their obligation-graph, evaluator, and versioned-contract models remain recorded research that may inform a future, separately justified tooling effort if repeated real-world use demonstrates a concrete need.

Rationale: The repository's primary purpose, established by P7, is better thinking and reliable handoff. A conventions-first system serves that purpose with substantially less configuration, lifecycle bookkeeping, migration complexity, and maintenance. Users and agents can already bypass local workflow controls, so executable contracts would add ceremony without solving the primary problem. The trade-off is that V3 will not calculate authoritative readiness or completion; navigation remains advisory until actual usage establishes a stronger requirement.

## P11: Archive-based terminal lifecycle

Point: Decide whether threads still need a dedicated ledger carrying kind and disposition after removing tiers, executable contracts, and workflow enforcement.

What you need to know: V2’s ledger stores two facts: tier and lifecycle disposition. Tiers are being replaced by kinds, which are selected when the thread opens and can be recorded in the seed. Active, deferred, and closed states mainly support continuity and mechanical enforcement—the concerns V3 has deprioritized. Mutable lifecycle state can also become stale when users work through skills without updating it.

Decision: V3 eliminates `ledger.md`. The seed records the selected kind and variant. A thread directly under `docs/threads/` is active or unfinished; a thread under `docs/threads/archive/` is terminal and intentionally removed from active work. V3 does not model deferred or resumed states. Completed and abandoned threads are distinguished by their durable content: completed work carries the kind's terminal outcome or implementation report, while abandonment is recorded as a decision with its rationale in `decisions.md`. Archiving is the explicit act that ends the thread's active lifecycle.

Archival link behavior is outside this thread's scope because it already has a dedicated thread. V3 acknowledges that moving a folder changes literal paths and does not claim that slug searchability is the same as an unbroken link; the dedicated thread will define the cross-thread and external-reference policy.

Rationale: Archive location provides the only lifecycle distinction that matters for this conventions-first methodology in a form humans can see without folding a status file. Removing the ledger eliminates tier, pause/resume, closure, and freeze bookkeeping that was often bypassed and could drift from actual work. The trade-off is losing a machine-readable active/deferred/done axis and relying on an explicit archive action, which is acceptable because continuity and orchestration are secondary goals.

## P12: Thread history, living documentation, and write authority

Point: Decide whether V3 should replace generalized artifact freeze machinery with explicit document roles and skill write authority.

What you need to know: Thread artifacts describe how a particular change was developed at a particular time; they are not the project’s current source of truth. Living project documentation describes the current system and should evolve as implementation changes behavior. Git may not record intermediate thread states when work is completed before committing, so agents still need clear rules about which artifacts they own. Broad freeze rules add ceremony, while write-scope rules can prevent agents from rewriting upstream or historical artifacts to justify downstream work.

Decision: V3 distinguishes historical thread artifacts from living project documentation and uses explicit skill write authority instead of document versions, approval latches, lifecycle freezes, or a generalized mechanical freeze guard.

Thread artifacts record how one change was understood and delivered at a particular moment. They include the seed, `decisions.md`, any proposal, the spec, the plan, and implementation or outcome reports. They are not the current description of the product. Living project documentation—such as README content, user documentation, architecture references, API or protocol documentation, operational runbooks, and repository conventions—describes the system as it currently exists and is expected to evolve across threads. When implementation changes documented behavior, updating the affected living documentation is part of implementation. If no separate living documentation exists, V3 does not require inventing it; code and tests remain authoritative where appropriate.

Skills obey these write boundaries:

- The thread-opening operation alone writes the current thread's seed.
- Interactive decision-making operations append to the current thread's `decisions.md`; changed decisions append superseding records rather than rewriting prior decisions.
- Proposal, spec, and plan authoring operations may edit their respective current-thread target, as may a targeted review or fix operation when existing durable decisions make the correction mechanical.
- An implementation operation reads its input spec and plan but does not edit either to justify or retroactively describe its work.
- If implementation exposes a spec problem, it may proceed only within an already granted degree of freedom, record an honest deviation that remains within accepted intent, or stop and surface a human decision when intended behavior must change.
- A plan is implementation input and is not rewritten after the fact to make completed work appear planned.
- Implementation or outcome reports are written by the operation that performed the work.
- A skill does not modify other active threads while working from the current thread.
- Archived threads are read-only by default.
- Current project code, tests, and living documentation may be changed only within the current implementation scope.
- Every skill may write only its declared outputs, current-thread targets it explicitly owns, and current project files within its authorized implementation scope.

Rationale: The useful distinction is authority and purpose, not whether every file has crossed a lifecycle latch. Narrow ownership prevents agents from rewriting upstream contracts, unrelated threads, or historical records while still allowing mechanical review fixes and ordinary authoring. Living documentation remains current without pretending that old thread specs describe the present system. The trade-off is that these protections are conventions enforced through skill design rather than filesystem access controls, which matches P10's conventions-first scope.

## P13: Interaction posture as an authoring principle

Point: Decide whether V3 should require explicit interaction-mode metadata or use interactive/AFK as an internal authoring principle inferred from each skill’s purpose.

What you need to know: Skills naturally differ between dialogue-driven operations, completion-oriented operations, and one-shot deliverables. Some completion-oriented skills may still encounter exceptional blockers requiring human judgment. Mandatory markers and per-skill sections would add repetition without eliminating these hybrids, while having no shared authoring rule could produce skills that ask unnecessary questions or behave poorly under explicit AFK invocation.

Decision: V3 treats interactive versus AFK as an explicit repository-level skill-authoring distinction, not as a required runtime schema. Skills do not universally add an `interaction:` frontmatter field, a mandatory interaction-mode section, duplicated interactive and AFK variants, or an exhaustive classification registry. The normal interaction posture is inferred from the skill's purpose, description, and operating instructions. Only a skill whose behavior would otherwise be surprising needs to state special interaction rules explicitly.

The central classification question is: **Is obtaining new human input part of the skill's normal job, or is human input an exceptional blocker?** Sending a result through chat does not by itself make a skill interactive.

### Interactive skills

Interactive skills are dialogue-driven: obtaining human input and settling decisions is their core operation. Questions are expected output, multiple turns are normal, and the skill has not failed merely because it needs another response.

Examples include:

- `discussion`;
- `seeded-discussion`;
- any workflow whose purpose is to discover, compare, and settle human decisions.

Interactive skills may ask questions as normal execution, present alternatives or a proposed solution, obtain new human decisions, and append the resulting durable decision record to the current thread's `decisions.md`.

### AFK-oriented skills

AFK-oriented skills are completion-oriented: their normal job is to consume supplied and durable inputs and produce an outcome without requiring ongoing conversation. They should attempt to finish autonomously. Asking the user is exceptional and justified only when the available inputs are insufficient and proceeding would invent intent, exceed authority, or choose outside granted freedom.

Examples include:

- spec authoring;
- plan authoring;
- plan and other artifact reviews;
- implementation;
- implementation and outcome reporting.

A spec skill remains AFK-oriented even if it occasionally discovers a missing human decision. That situation is a blocked AFK-oriented operation, not evidence that spec authoring is fundamentally interactive. Clear omissions, contradictions, defects, and other mechanically resolvable findings are fixed from durable inputs; genuinely missing intent is surfaced rather than invented.

### One-shot deliverable skills

One-shot deliverable skills consume an input and return a finished message or handoff. They are not interactive merely because their output appears in chat or because the user manually invoked them. Reading, copying, or forwarding the result afterward does not turn the operation into a dialogue.

Examples include:

- `consult-the-expert`;
- `brief-the-recipient`;
- `meta-prompting`.

These skills should not initiate back-and-forth unless required input is genuinely absent. Their normal shape is `input → finished message`.

`open-thread` is likewise completion-oriented rather than dialogue-driven: it writes the thread and reports what it did. A correction window permits follow-up, but dialogue is not its primary work.

### The middle ground

V3 applies these authoring rules:

- Design every skill with a clear natural interaction posture.
- Dialogue-driven skills may ask questions as normal execution.
- Completion-oriented skills should finish from supplied and durable inputs whenever safely possible.
- Completion-oriented skills ask only when human judgment is genuinely indispensable, never merely because clarification would be convenient.
- An explicit invocation such as “run AFK,” “do not ask questions,” or “finish without me” overrides the normal posture: the skill must not wait for input.
- Under an AFK override, a blocked repository-writing operation leaves a temporary handoff file under the current thread's `.wip/` area and returns a concise terminal notification naming the outcome and file path.
- A one-shot chat deliverable under an AFK invocation simply returns its completed result; it does not need a repository handoff file.
- An AFK-oriented skill chooses autonomously only inside explicitly granted freedom and never creates a new human or product decision.
- Successful ephemeral reviews fix and recheck their target without committing a review report. A review blocked on genuine ambiguity writes a temporary handoff. After interactive resolution, only the resulting decision enters `decisions.md`.
- A skill may support both interactive and AFK behavior when the operation genuinely supports both cleanly, but V3 does not force every skill to implement two control flows.
- Separate interactive and AFK skills are warranted only when their semantics differ enough that one coherent instruction set would become confusing.
- Only behavior that would be surprising from the skill's description and purpose needs an explicit per-skill interaction rule.

Descriptions and workflows should normally communicate posture naturally:

```text
“Conduct an open-ended interview…”  → naturally interactive
“Create a spec from…”               → completion-oriented
“Review a plan…”                    → completion-oriented
“Draft a paste-ready message…”      → one-shot deliverable
```

An AFK-oriented repository-writing operation must not finish by asking a question. If human judgment is indispensable, it leaves its partial work coherent, writes the blocker and necessary context to its declared temporary handoff, and returns only a concise notification such as:

```text
Blocked: one product decision is required.
Report: .wip/needs-decision.md
```

The file is authoritative; the chat response is notification, not an attempt to begin an interactive exchange.

Rationale: The distinction is valuable as a design lens because it protects human attention and makes AFK runs predictable, but a universal marker would misclassify natural hybrids and add repetitive metadata without changing behavior. Inferring posture from purpose preserves the existing skills' successful ergonomics: dialogue skills converse, work-producing skills finish when they safely can, and one-shot deliverables return their payload. Explicit AFK invocation remains a strong behavioral override. The trade-off is that posture is conventionally understood rather than mechanically discoverable, which is consistent with P10's conventions-first methodology.

## P14: Clean experimental cutover to V3

Point: Decide whether V3 migrates existing threads, makes new skills understand old layouts, or applies only to newly opened threads.

What you need to know: V3 changes foundational thread semantics: tiers and ledgers disappear, discussions become one `decisions.md`, reviews become ephemeral, artifact statuses and versions disappear, and archive location becomes the terminal signal. Translating an existing thread would require interpreting and rewriting its historical artifacts. Supporting both formats inside every skill would preserve complexity that V3 is explicitly removing.

Decision: V3 uses a clean experimental cutover. The existing V1 and V2 canonical documentation remains unchanged as a historical record of earlier workflow experiments. Existing V1/V2 threads are not migrated, maintained, or supported by V3 skills; they may remain untouched and be ignored or archived separately. Every active workflow skill is migrated wholesale to V3 without V1/V2 compatibility branches or a separately preserved legacy skill distribution. V3 applies only to threads opened after the V3 skills and documentation land. This V3 design thread remains structurally V2 while it designs and implements the cutover.

The repository is public but currently has one actual user, so the cutover optimizes for clean experimentation rather than backward compatibility for hypothetical consumers. Earlier workflow versions and their threads exist to help future agents understand what was tried, what changed, and why—not as supported runtimes.

A possible future public baseline is explicitly deferred. After one workflow version has been used stably for many months, the repository may present that mature methodology as a fresh public version 1 and may remove the old experimental documentation from the working tree. That rebaseline, deletion policy, public migration story, and release naming are not commitments of V3 and require a separate future decision; Git history will continue to preserve provenance.

Rationale: Wholesale migration keeps every V3 skill simple and prevents obsolete lifecycle, review, and layout rules from leaking into the new methodology. Preserving the old documentation provides experimental context without imposing compatibility costs. The trade-off is that old threads cease to be operable through the current skill suite after cutover, which is knowingly accepted because they are outdated personal experiments rather than supported user data.

## P15: Three subject-neutral default workflows

Point: Decide whether V3 should begin with only the three demonstrated workflow structures or anticipate additional specialized kinds.

What you need to know: Kinds are now conventions-first playbooks, not executable schemas. A kind is justified when work has a meaningfully different durable structure or terminal outcome—not merely because its subject is a bug, feature, refactor, or security change. Too many initial kinds would recreate tier/profile complexity before real use demonstrates it.

Decision: V3 begins with exactly three built-in, subject-neutral workflow structures: Quick, Standard, and Roadmap. Quick provides the smallest delivery path and supports direct and planned forms. Standard provides the normal spec-driven path for one change. Roadmap explores and structures a larger direction, then decomposes it into independently executable child threads. Every workflow begins with the shared thread genesis artifacts `seed.md` and `decisions.md`; later artifacts differ by workflow convention. Reviews are operations available wherever useful rather than workflow stages.

Workflows describe how the user wants to work, not what the work is about. V3 does not route bugs, features, security changes, refactors, or documentation changes to a workflow by subject. A bug may use Quick or Standard; a large documentation effort may use Roadmap; the user chooses the workflow whose process fits the situation.

Additional workflows are added only when actual use demonstrates a different purpose, durable artifact structure, and natural completion shape that would be distorted as a variant of an existing workflow. V3 does not predefine investigation, documentation-only, bugfix, audit, security, or other subject-oriented categories.

Rationale: The three workflows cover the structural needs already demonstrated while keeping selection understandable and user-owned. Subject-neutral workflows avoid fragile classification rules and let the same domain use different amounts and shapes of process. The trade-off is that specialized workflows are deferred until evidence shows they provide a genuinely different process rather than another label.

## P16: Workflows compose reusable capability skills

Point: Decide whether each workflow owns a prefixed skill suite, all skills branch internally by workflow, or workflows compose reusable capability skills.

What you need to know: Some operations genuinely differ by workflow: Quick needs a small plan while Standard needs a prescriptive multi-file plan. Other operations—discussion, opening a thread, decision logging, handoff writing, and archiving—share the same artifact contract across workflows. The repository’s skill self-containment rule also discourages skills from invoking or depending on sibling skills, so composition should live in workflow documentation rather than orchestration hidden inside skills.

Decision: The repository offers a suite of independently invokable, self-contained capability skills. Workflows are documented compositions that organize those skills into easy-to-discover paths. Skills do not inspect a workflow name and branch across several output contracts, and the repository does not duplicate a full prefixed skill suite for every workflow. A new skill is created only when an operation's purpose, durable output, or execution contract materially differs—not merely because the same operation appears in another workflow.

Shared capabilities retain workflow-neutral names and behavior. Examples include `open-thread`, `discussion`, archiving, handoff skills, support skills, and general research operations. The shared `discussion` skill reads the current seed and `decisions.md`, conducts decision points, and appends thread-wide decision records. Quick may use it briefly or skip it when intent is already complete; Standard uses it to make the specification handoff-grade; Roadmap uses it to settle direction, decomposition, boundaries, and child-thread intent. Those differences belong to workflow guidance, not duplicated `quick-discussion`, `standard-discussion`, or `roadmap-discussion` skills.

Materially different planning contracts justify separate capabilities. V3 will use a rewritten brief-plan skill, using deprecated `plan-loose` only as source material rather than restoring it unchanged, and a rewritten strict-plan skill:

- The brief plan is one file with a goal, a small number of concrete tasks, and observable verification. It remains suitable for an agent implementer while avoiding task subfiles and Standard-level ceremony. Quick's planned workflow uses this capability.
- The strict plan uses an index plus self-contained task briefs with explicit files, steps, verification, and acceptance criteria. It supports AFK implementation and junior-developer handoff. Standard uses this capability.

Capability-oriented names such as `plan-brief` and `plan-strict` are preferred over workflow-prefixed names because they describe the produced artifact and remain reusable by future workflows.

Roadmap may receive a dedicated authoring skill because it produces a distinct durable roadmap and child-thread definitions rather than a specification or implementation plan. That is a real capability boundary, not a naming prefix. The exact Roadmap artifact contract remains to be decided.

Workflow documentation, not skill-to-skill invocation, owns composition. The working shapes are:

```text
Quick / Direct
open-thread → [discussion] → implement → report → archive

Quick / Planned
open-thread → [discussion] → plan-brief → implement → report → archive

Standard
open-thread → discussion → spec → plan-strict → implement-plan → report → archive

Roadmap
open-thread → discussion → roadmap → open child threads → outcome → archive
```

Square brackets denote conventionally optional activity, not an evaluator-controlled transition. Future workflows may reuse the same capabilities in new compositions without requiring renamed copies.

Rationale: This structure makes workflows easy for users to discover while preserving skills as composable tools. It avoids both large universal skills with hidden workflow branches and a multiplicative catalog of duplicated prefixed skills. Separate planning skills are warranted because brief and strict plans serve different downstream contracts. The trade-off is that workflow adherence lives in documentation and user choice rather than an orchestrator, which is consistent with P10.

## P17: Project V3 documentation architecture

Point: Decide whether the V3 documentation describes a methodology, a project iteration, or a versioned skill suite with multiple workflows.

What you need to know: P16 established that skills are reusable capabilities and workflows are documented compositions over them. Shared thread and authoring conventions exist, but they do not imply one universal process. The V1/V2/V3 labels currently serve as internal experimental history; a future mature public release may use a fresh baseline and remove those experimental labels from its user-facing presentation.

Decision: Use **Project V3** as the internal experimental name. The user-facing model is a reusable suite of Skills plus separately documented Workflows. Project V3 is not presented as one universal methodology or workflow, and the former `kind` terminology is retired. The default user-facing workflow names are Quick Workflow, Standard Workflow, and Roadmap Workflow.

Canonical documentation uses this structure:

```text
docs/project/v3/
├── README.md
├── thread-model.md
├── skill-authoring.md
└── workflows/
    ├── quick.md
    ├── standard.md
    └── roadmap.md
```

The files have distinct responsibilities:

- `README.md` explains Project V3's architecture: reusable capability skills composed into multiple workflows.
- `thread-model.md` defines the shared thread substrate, including the seed, `decisions.md`, historical thread artifacts versus living documentation, archive-based lifecycle, artifact roles, and write authority.
- `skill-authoring.md` defines cross-skill authoring conventions, including ephemeral reviews, interaction posture, AFK behavior, and when a materially different capability earns a separate skill.
- Each `workflows/*.md` file defines one process: its purpose, sequence, required and optional activities, durable outputs, variants if any, user involvement, and natural terminal outcome.

The repository root `README.md` exposes a compact, subject-neutral table linking directly to each workflow file and describing only process shape. Adding a future workflow requires a new workflow document and a corresponding table entry; workflows are not categorized by bug, feature, security, documentation, refactor, or other subject matter.

Project V3 is an internal canonical label rather than a promised public product name. A future stable public rebaseline may present the mature skill suite and workflows without experimental V1/V2/V3 terminology.

Rationale: The information architecture mirrors the product architecture established by P16. Shared thread and skill rules live once, while each workflow remains independently discoverable and extensible. “Project V3” avoids falsely implying one universal methodology and keeps experimental versioning internal. The trade-off is a new canonical path alongside the retained V1/V2 workflow documentation, which is intentional under P14's clean experimental cutover.

## P18: Workflows have optional activities, not variants

Point: Decide whether Quick should store a Direct/Planned variant or simply document brief planning as an optional activity.

What you need to know: Named variants were introduced when a deterministic contract needed to resolve optional steps. Under P10, workflows are usage conventions and may be adapted by the user. Recording `Variant: Direct` in the immutable seed can become misleading if the user later decides that a brief plan would help. A workflow document can present common paths without turning them into persistent classifications.

Decision: Project V3 removes the concept of workflow variants entirely. Each workflow documents one understandable normal path and may include optional activities that are suggestions rather than configured or enforced branches. The user decides which optional activities add value and may adapt the path without changing metadata, migrating a thread, or violating a contract. The seed records only the selected workflow, for example `Workflow: Quick`; it carries no variant.

Quick is therefore one workflow:

```text
open-thread → [discussion] → [plan-brief] → implement → report → archive
```

Square brackets identify optional suggested activities. Documentation may illustrate a direct example and a briefly planned example, but they are examples of using the same workflow rather than named variants. Quick expects no proposal or spec. `decisions.md` may remain header-only. Verification is part of implementation, reviews are optional temporary operations, implementation updates affected living documentation, and a concise implementation report is the durable terminal artifact.

This decision supersedes P1's complete kind-profile selector, P2's variant resolution model, and P15's Direct/Planned variant language. Their underlying insight—that different amounts of process are useful—survives as optional activities chosen by the user rather than persistent variant configuration.

Rationale: Without an evaluator, variant metadata creates a classification that can become stale without providing control or automation. One workflow with clearly marked optional activities is easier to understand, easier to adapt, and more faithful to the conventions-first purpose. The trade-off is that two Quick threads may follow different paths, which is intentional because workflow documentation guides rather than governs the user.

## P19: Standard Workflow and shared Finish endpoint

Point: Decide the normal Standard sequence and whether proposals and reviews are core stages or optional supporting activities.

What you need to know: Standard represents the repository’s full spec-driven path for one change. Its durable value comes from clarified decisions, a handoff-grade specification, a prescriptive plan, implementation, and an outcome report. Proposals are useful when direction needs exploration but redundant when the initial discussion already establishes it. Reviews remain valuable quality operations under P8, but their reports are ephemeral and their clear findings are fixed automatically.

Decision: The Standard Workflow uses this normal sequence:

```text
open-thread
→ discussion
→ [proposal]
→ spec
→ [spec review / lossless review]
→ plan-strict
→ [plan review]
→ implement-plan
→ [implementation review / code review]
→ finish
  └─ [archive-thread]
```

Square brackets mark optional suggested operations. A proposal is used only when the work benefits from a separate direction-setting artifact before specification. Spec, lossless, plan, implementation, and code reviews remain visible as optional quality operations; their reports are temporary under P8, clear findings are fixed and rechecked automatically, and only newly required human decisions enter `decisions.md`.

Workflow diagrams list user-invoked operations, not artifacts emitted by those operations. `implement-plan` changes the project and emits the implementation report, so `report` is not a separate workflow step. The durable Standard outputs are the seed, `decisions.md`, an optional proposal, the specification, the strict multi-file plan, project changes, and the implementation report.

The same correction applies to Quick. Its normal sequence is:

```text
open-thread
→ [discussion]
→ [plan-brief]
→ implement
→ [implementation review / code review]
→ finish
  └─ [archive-thread]
```

The implementation operation emits Quick's concise implementation report; there is no separate report operation.

Every Project V3 workflow uses `finish` as its normal final delivery operation. In V3, Finish no longer sets a spec's implemented latch, appends a ledger closure, disposes reviews, freezes artifacts, or depends on approval metadata. It:

1. inspects the work for obvious unresolved concerns;
2. confirms that the workflow's principal outcome exists, including the implementation report for Quick and Standard or the roadmap handoff for Roadmap;
3. checks that affected living documentation was updated when applicable;
4. surfaces unresolved AFK handoffs under `.wip/`;
5. asks whether to create a pull request, merge into the target branch, or leave the branch as-is;
6. performs the selected branch operation with appropriate confirmations; and
7. offers thread archival as an optional next action.

“Leave as-is” is a valid Finish result. Finish ends the workflow's delivery work and organizes its repository handoff; it does not insist on publishing or merging. `archive-thread` is optional post-finish lifecycle housekeeping. If archival is skipped, the thread remains in the active listing until the user chooses to put it away. Unbracketed Finish is the documented normal path, not mechanically enforced under P10.

Rationale: Standard preserves the full thinking-to-handoff path while making direction-setting and quality passes available without compulsory lifecycle bureaucracy. Keeping optional reviews visible communicates useful quality opportunities, while ephemeral handling prevents stale review history. Separating invoked operations from their outputs removes the redundant report step. A shared Finish endpoint gives every workflow a consistent branch handoff without restoring V2's latches or ledger. The trade-off is that a user may skip optional quality operations or Finish because the workflows remain conventions rather than controls.

## P20: Roadmap finishes after decomposition

Point: Decide whether Roadmap is a direction-and-decomposition workflow or a long-lived umbrella that remains active until every child thread finishes.

What you need to know: The original goal was to think through a larger project from scratch and create separate threads for its implementation phases. Keeping the parent active throughout child execution enables centralized progress tracking and reconciliation, but reintroduces orchestration, child status, and lifecycle management that P7 and P10 deprioritized. Finishing after decomposition keeps Roadmap focused on better thinking and lets each child own its decisions and delivery.

Decision: Roadmap is a direction-and-decomposition workflow, not a long-lived project-management umbrella. Its normal sequence is:

```text
open-thread
→ discussion
→ [proposal]
→ roadmap
→ [roadmap review]
→ open child threads
→ finish
  └─ [archive-thread]
```

The parent explores and settles the larger direction, emits a roadmap containing self-contained child-thread briefs, opens the child threads, and then finishes. It performs no project implementation, does not track child status, does not remain active until all children complete, and does not own a progress ledger. Its durable outputs are `seed.md`, `decisions.md`, an optional proposal, the roadmap artifact, and the child threads created from that roadmap.

Each child thread owns its own seed and `decisions.md` and independently follows Quick, Standard, or Roadmap according to the process the user chooses for that unit. A child may itself use Roadmap when further decomposition is genuinely required; parent-child cycles are not meaningful and should not be created.

Later cross-child reconciliation is optional rather than part of the normal parent lifecycle. If the parent remains unarchived, the user may return to it and append new decisions. If it is archived, the user opens a new reconciliation thread referencing the roadmap and relevant children rather than modifying the archived thread.

Rationale: Decomposition directly serves P7's better-thinking goal by turning an oversized direction into independently understandable work. Keeping the parent alive as a coordinator would require the status aggregation, lifecycle machinery, and long-term continuity that P10 deliberately removed. The trade-off is no centralized progress view across children; if repeated use later proves that view valuable, it can justify a separate coordination tool or workflow rather than burdening Roadmap now.

## P21: Append-only Roadmap feedback from descendants

Point: Decide how a child thread communicates discoveries that may invalidate assumptions, alter scope, or affect future child threads.

What you need to know: Child implementation can reveal information unavailable during initial decomposition. Future children need that information, but reading every sibling thread is expensive and unreliable. The original roadmap should remain historical, and a child should not have authority to rewrite parent decisions or redefine sibling intent. An additive feedback file can preserve discoveries without turning the parent into a status-tracking coordinator.

Decision: Every Roadmap thread creates two Roadmap-specific artifacts: `roadmap.md`, which preserves the original direction and self-contained child briefs, and an eagerly created, append-only `roadmap-feedback.md`, which descendants use only for discoveries with parent- or sibling-level impact. Future children read their own seed and `decisions.md`, the parent `roadmap.md`, and relevant records from `roadmap-feedback.md`; they do not read every sibling thread.

`roadmap-feedback.md` starts with `# Roadmap Feedback`. Each feedback record uses sequential thread-local `F<N>` numbering and contains:

- a title;
- `Source` — the child thread that produced the discovery;
- `Affects` — the named future child briefs, shared constraints, overall direction, or a possible new child affected;
- `Context` — self-contained evidence and the assumption or boundary challenged;
- `Impact` — why later work may need to change; and
- `Recommendation` — an advisory next action, never a new human decision.

A child appends feedback only when a discovery may affect the Roadmap direction, shared constraints, another child, or the need for an additional child. Local implementation surprises remain in the child's implementation report and do not pollute the parent feedback channel.

Descendant write authority is narrow. A child may append a feedback record but may not rewrite `roadmap.md`, edit the parent's `decisions.md`, modify sibling seeds/specs/plans, declare a new parent-level human decision, or mark another child blocked or complete. This is the one explicit exception to P12's cross-thread write rule. Append-only descendant feedback does not reactivate an archived Roadmap thread or turn it into a coordinator.

When a future child reads applicable feedback:

- it incorporates adjustments that follow mechanically from existing durable decisions;
- if the adjustment changes human intent, an interactive operation asks the user and records the resulting decision in the child's `decisions.md`;
- under an explicit AFK invocation, it writes a temporary `needs-decision` handoff and stops rather than inventing intent; and
- if feedback implies additional work outside existing child briefs, it may recommend opening another child thread but does not create one silently.

The Roadmap workflow is therefore:

```text
open-thread
→ discussion
→ [proposal]
→ roadmap                  # emits roadmap.md + roadmap-feedback.md
→ [roadmap review]
→ open child threads
→ finish
  └─ [archive-thread]

child work
→ append parent-level discoveries to roadmap-feedback.md when needed
```

Rationale: A single parent feedback channel gives later children the discoveries they need without forcing sibling-by-sibling context loading or allowing downstream work to rewrite the original decomposition. Its additive, advisory nature preserves historical direction and human authority. The trade-off is one intentional post-archive append surface and a required parent-feedback preflight for Roadmap children, both narrowly scoped to the workflow's core cross-child learning problem.

## P22: Separate Roadmap authoring from child-thread materialization

Point: Should authoring the roadmap and opening its child threads be one operation or two?

What you need to know: These activities have different purposes:

- Authoring establishes the direction, boundaries, shared constraints, and child briefs.
- Materialization creates folders, seeds, decision logs, lineage references, and feedback links.
- Keeping them separate permits an optional roadmap review before creating several threads.
- Creating children manually with the ordinary thread-opening operation would avoid another capability, but it would be repetitive and make consistent lineage easier to miss.

Decision: Roadmap authoring and child-thread materialization are separate capabilities. The Roadmap authoring operation creates `roadmap.md` and `roadmap-feedback.md` and does not create child threads. After any optional Roadmap review, a dedicated `materialize roadmap threads` operation reads the Roadmap's child briefs and creates the corresponding child threads consistently.

The Roadmap workflow is:

```text
open-thread
→ discussion
→ [proposal]
→ roadmap
→ [roadmap review]
→ materialize roadmap threads
→ finish
  └─ [archive-thread]
```

Each child brief contains at least:

- Outcome;
- Context;
- Scope and boundaries;
- Dependencies;
- Selected workflow; and
- Relevant shared constraints.

Workflow selection is explicit before materialization rather than advisory or guessed by the materializer. In interactive use, the materialization operation asks for a missing workflow selection. Under an explicit AFK instruction, it records the unresolved selection and does not create that child rather than inventing a choice.

The dedicated capability is justified despite P16's preference for reusable operations because coordinated materialization has a materially distinct purpose and side effects from opening one ordinary thread. It creates several related thread homes from structured briefs while preserving their parent relationship and feedback path. Workflow documentation composes Roadmap authoring, optional review, and materialization; the individual capabilities remain self-contained and do not instruct agents to invoke sibling skills.

Rationale: Separating authoring from materialization preserves a clean checkpoint where the decomposition can be inspected or revised before it fans out into multiple durable threads. A dedicated materializer avoids repetitive manual setup and inconsistent lineage while keeping Roadmap authoring focused on thinking and decomposition. The trade-off is one additional capability in the suite, justified by its distinct multi-thread output contract.

## P23: Shallow V3 thread layout with singleton outcome artifacts

Point: Should V3 retain V2’s lineage-oriented folders, or adopt a shallower artifact layout?

What you need to know: V2 supports multiple proposal, spec, and plan lineages, reviews attached to each artifact, document versions, and lifecycle metadata. Most of that machinery disappears under our V3 decisions:

- A thread represents one unit of work at a particular moment.
- Decisions share one `decisions.md`.
- Reviews are temporary.
- Proposal and specification versions are gone.
- A Roadmap decomposes multiple subjects into child threads instead of keeping multiple implementation lineages in its parent.
- Strict plans still need an index and individual task files.
- Multiple implementation attempts may produce multiple durable reports, so reports are not necessarily singletons.

Decision: V3 uses a shallow, capability-shaped thread layout, refined so brief and strict planning share the same root artifact and implementation has one current outcome report:

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
├── seed.md
├── decisions.md
├── proposal.md                  # optional
├── spec.md                      # optional
├── plan.md                      # optional; brief plan or strict-plan index
├── plan-tasks/                  # strict plan only
│   ├── 01-<kebab-slug>.md
│   └── ...
├── implementation-report.md     # Quick or Standard implementation outcome
├── roadmap.md                   # Roadmap only
├── roadmap-feedback.md          # Roadmap only
└── .wip/                        # temporary handoffs and working material
```

`seed.md` and `decisions.md` are eagerly created when the thread opens. All other artifacts and folders are created on demand. A brief plan is entirely contained in `plan.md`. A strict plan uses `plan.md` as its authoritative index and adds dispatchable task briefs under `plan-tasks/`. The explicit `plan-tasks/` name is preferred over a generic `tasks/` name because it remains unambiguous outside the plan's immediate context.

The `reports/` directory is removed. Quick and Standard normally have one implementation outcome rather than a collection of execution-attempt records, so `implementation-report.md` is a singleton current-outcome artifact. An implementation operation owns it and may update it while continuing the same thread's implementation. A blocked operation may use `.wip/needs-decision.md`; materially separate implementation phases generally belong in separate threads rather than accumulating reports in one thread.

Artifact write authority follows purpose: `spec.md` and `plan.md` describe intended work and are not retroactively rewritten by implementation; `implementation-report.md` describes the evolving implementation outcome and may be updated by the implementation operation while the thread is active. Archival makes the complete thread historical and ends ordinary editing, subject only to P21's narrow descendant-feedback exception for Roadmap threads.

This decision removes V2 lineage folders, artifact-local `discussions/` and `reviews/` folders, version directories, and timestamped per-run implementation reports from the V3 layout.

Rationale: The shallow layout keeps the artifacts a user normally reads visible at the thread root and uses a directory only for a genuinely multi-file strict plan. Sharing `plan.md` gives both planning depths one predictable entry point. A singleton implementation report serves the project's better-thinking and handoff goals without retaining an audit trail of every execution attempt. The trade-off is that overwritten intermediate implementation states are not preserved as workflow records, which is intentional under P7 and P10.

## P24: Store an expanded suggested workflow, not a workflow identity

Point: Does `Workflow: Quick | Standard | Roadmap` describe the thread’s original intended path, or its current workflow state?

What you need to know: The distinction matters when a thread changes shape after opening. For example, a Quick thread may uncover enough complexity to warrant a specification and strict plan.

Decision: A V3 thread stores neither an original workflow name nor a current workflow classification. Its `seed.md` instead contains a mandatory `## Suggested workflow` section that spells out the complete recommended sequence selected at opening time in human-readable language. Optional activities are explicitly labelled as optional in prose. The suggestion uses no progress checkboxes, completion markers, lifecycle values, or evaluator-oriented schema.

For example, a thread opened from the Quick Workflow template may contain:

```markdown
## Suggested workflow

1. Discuss the change if clarification is needed. *(optional)*
2. Write a brief implementation plan if useful. *(optional)*
3. Implement the change and update `implementation-report.md`.
4. Review the implementation or code if the risk warrants it. *(optional)*
5. Finish the thread and choose how to handle the branch.
6. Archive the thread when it no longer needs to remain active. *(optional)*
```

This section is an immutable opening-time recommendation, not a statement of current state, a contract, or a compliance checklist. The user may follow it, skip optional activities, add useful operations, or depart from it without editing the seed, reclassifying the thread, or making the thread invalid. When a departure changes human intent in a way worth preserving, it may produce a normal decision record; minor adaptation requires no bookkeeping.

Named Quick, Standard, and Roadmap Workflows remain discoverable documentation and reusable opening templates, but their names are not persisted as thread metadata. A thread is therefore opened **from** a workflow template; it does not permanently **have** that workflow as a type. Updating a published workflow changes future suggestions only and never reinterprets an existing thread, because each existing seed contains the complete suggestion as it stood when opened. A user may also customize the suggested sequence for one thread without defining a new workflow name or variant.

`whats-next` may read the suggested sequence as advisory context and combine it with the artifacts and repository state it can observe. It does not mark steps complete, judge compliance, or assume that divergence is an error.

Roadmap child briefs likewise contain the complete suggested workflow sequence rather than a selected workflow name. The materialization operation copies that sequence into the child's seed without resolving a name through potentially newer workflow documentation. If a child brief lacks a usable suggestion, interactive materialization asks the user; under an explicit AFK instruction it records the unresolved input and does not create that child.

This decision supersedes P18's requirement that the seed record `Workflow: Quick` and P22's requirement that child briefs carry a selected workflow. It refines P15 and P17: Quick, Standard, and Roadmap remain default subject-neutral workflow documents, but they are templates and usage patterns rather than classifications assigned to threads.

Rationale: Expanding the recommendation makes every thread understandable without requiring the reader to know what a workflow name meant in a particular project revision. It avoids mutable current-state bookkeeping, preserves historical truth, supports per-thread adaptation, and gives advisory navigation enough context without recreating a deterministic contract. The trade-offs are a longer seed and a small synchronization responsibility between published workflow guidance and the concise templates available to thread-opening operations.

## P25: Self-contained canonical workflow suggestion references

Point: What should the user provide when opening a thread, and where should the default workflow outlines live?

What you need to know: An installed `open-thread` skill must be self-contained. It cannot assume that the repository’s Project V3 documentation is installed beside it. At the same time, requiring the user to reproduce an entire workflow sequence whenever they open a thread would be cumbersome.

Decision: `open-thread` accepts either the name of a built-in default workflow template—Quick, Standard, or Roadmap—or a complete custom suggested workflow. A built-in name is invocation input only: the skill resolves it to a self-contained local reference and copies that reference's `## Suggested workflow` section verbatim into `seed.md`. The workflow name is not persisted.

The exact seed-ready default suggestions live once, inside `open-thread`'s own folder:

```text
skills/workflow/capture-discussion/open-thread/
├── SKILL.md
└── references/
    └── workflows/
        ├── quick.md
        ├── standard.md
        └── roadmap.md
```

Each reference contains the complete canonical `## Suggested workflow` section for that default, ready for verbatim insertion. These references are the single source of truth for the exact suggested sequences used when opening threads. `open-thread` does not maintain another copy of those sequences in its body.

The Project V3 workflow documents remain the canonical human-facing explanations of each workflow's purpose, trade-offs, normal use, optional activities, outputs, and examples. They point readers to the corresponding local template for the exact opening-time suggestion and do not duplicate that section verbatim. The references own the copyable sequence; the workflow documents own the explanatory guidance.

When the user supplies a custom suggested workflow, `open-thread` writes that complete suggestion rather than resolving a built-in template. If neither a built-in template nor a custom suggestion is supplied, the skill asks the user rather than inferring a workflow from the task's subject or apparent complexity.

Roadmap child briefs follow the same rule: they contain either a complete custom suggested workflow or, during Roadmap authoring, a built-in selection that is expanded into the complete suggestion before the Roadmap is emitted. Child materialization copies the already-expanded suggestion into the child seed and never resolves a workflow name against newer templates.

Rationale: Local reference files keep the installed skill self-contained without maintaining duplicate copies of the exact workflow sequences. Verbatim copying makes an existing thread independent of later template revisions, while separate explanatory workflow documents remain readable and extensible. The trade-off is that the workflow documentation links to a skill-local reference for the exact seed text, but this is preferable to two authoritative copies that can drift.

## P26: Sparse, contextual seed metadata

Point: Besides the expanded suggestion, which information should every V3 seed be required to carry?

What you need to know: The V2 seed requires an `External:` line even when no external ticket exists:

```markdown
External: none — this began as a local idea
```

That explicitly records absence, but it is also mechanical metadata with little informational value. V3 no longer needs tier or lifecycle fields. Roadmap children do need lineage information, while ordinary threads do not.

Decision: V3 seeds use sparse contextual metadata rather than a fixed set of fields with explicit `none` values. Every `seed.md` contains exactly three conceptual requirements:

1. a title;
2. a self-contained genesis narrative explaining what triggered the work and its intended outcome; and
3. the complete `## Suggested workflow` section established by P24 and P25.

Additional metadata appears only when it carries real information:

- `External:` is present only when an actual tracker ticket or other external source is linked;
- Roadmap materialized children include parent-Roadmap and child-brief references;
- `Supersedes:` may appear only when a known supersession relationship is useful; and
- absent optional metadata means not applicable and is never represented by a mandatory `none` value or a justification for absence.

An ordinary seed may therefore be:

```markdown
# Seed: Add configurable retry behavior

A customer-facing integration needs configurable retry limits so temporary
provider failures do not immediately abort synchronization.

External: https://github.com/example/project/issues/123

## Suggested workflow

...
```

A materialized Roadmap child additionally carries conceptually equivalent metadata for:

```markdown
Parent: <Roadmap thread reference>
Roadmap brief: <stable brief identifier>
```

The precise reference syntax remains deferred to the dedicated archival-link discussion already identified. The thread folder's timestamp provides opening time, so the seed does not duplicate it. No owner, workflow name, tier, disposition, lifecycle status, or empty placeholder fields are added.

Rationale: A seed should preserve meaningful genesis and orientation, not simulate a complete database row. Conditional metadata makes locally originated threads lighter while retaining external provenance and Roadmap lineage when they exist. The trade-off is that seeds are not field-for-field uniform, but their mandatory human-readable structure remains predictable and their absent relationships are unambiguous.

## P27: Passive external references and explicit tracker mutations

Point: Does linking an external ticket authorize thread skills to write back to that tracker?

What you need to know: V2 does three things beyond preserving the ticket URL:

- `open-thread` posts a backlink comment.
- `finish` ensures the backlink exists and closes the ticket.
- Commits or pull requests reference the ticket.

This creates several practical problems:

- A thread may not be committed or pushed when opened, so its supposed permalink may not resolve.
- Tracker access can make an otherwise local operation fail or partially complete.
- Closing a thread, merging code, and closing a work-management ticket are related but not necessarily identical decisions.
- The current rules are internally awkward: `open-ticket` describes itself as the only tracker-writing skill, while `open-thread` and `finish` also write comments or status.
- Native pull-request and issue linking often provides the useful relationship without a custom backlink protocol.

Decision: External tracker references are passive by default. Supplying a ticket or other external source authorizes an operation to read it for context and record its real URL in the seed's conditional `External:` field. It does not authorize `open-thread`, `finish`, or another ordinary thread operation to comment on, update, transition, or close the external item.

The responsibility boundary is:

```text
open-ticket       → explicit external ticket creation
open-thread       → local thread creation; external read permitted
finish            → repository and branch handoff; external reference surfaced
explicit request  → comment on, update, transition, or close the ticket
```

`open-thread` no longer posts a backlink comment and does not fail local thread creation merely because tracker write access is unavailable. When a supplied ticket must be read to create a self-contained seed and read access is unavailable, it may ask the user to provide the relevant ticket content rather than partially performing external operations.

`finish` surfaces the linked external reference during handoff and may place a non-closing reference such as `Related to <ticket>` in a pull-request description. It does not use automatic-closing syntax, close the ticket directly, or post a terminal comment unless the user explicitly asks for that external mutation. Closing the repository thread, merging code, and changing work-management status remain separate decisions.

`open-ticket` remains an explicit tracker-writing capability whose invocation authorizes creating exactly one external ticket. Other tracker mutations require similarly explicit user intent rather than being implied by the presence of an `External:` line.

Rationale: A source reference is context, not mutation authority. Passive linking preserves provenance and useful PR association while eliminating unreliable opening-time permalinks, tracker-dependent local failures, and unintended lifecycle changes. The trade-off is that tracker state will not automatically follow thread state, which is intentional because the systems represent different concerns and V3 rejects continuous or ceremonial synchronization.

## P28: Purpose-specific ignored workspaces and a pending-decision queue

Point: How should temporary review questions and other in-progress state be organized when reviews may run concurrently?

What you need to know: Successful reviews should leave no artifact, but unresolved human judgment needs a concurrency-safe rendezvous point that Seeded Discussion can consume. The existing `.wip/` folder also mixes unrelated drafts, execution state, and reviewer scratch.

Decision: Retire the generic `.wip/` folder in V3. Temporary thread-local state instead lives in purpose-specific, dot-prefixed, explicitly gitignored folders. The initial taxonomy is:

```text
<thread>/
├── .drafts/                 # competing or not-yet-emitted artifact candidates
├── .runs/                   # resumable operation progress and agent scratch
└── .pending-decisions/      # unresolved human judgment emitted by reviews
```

Dot-prefixing communicates that these folders are local operational state but does not itself make Git ignore them; V3 adds explicit ignore rules. Each folder is created on demand and removed when empty. Durable artifacts never point into these folders because their contents are workspace-local and disposable or consumable.

A successful review auto-fixes supported defects, rechecks its target, returns a concise summary, and leaves no review artifact. When irreducible human judgment remains, each concurrent review writes its own uniquely named, write-once prompt file under the active thread's `.pending-decisions/`. Reviewers never append to a shared singleton. A prompt may contain one or more canonical discussion points, including their source evidence and enough self-contained context for an interactive resolution pass.

The absence of `.pending-decisions/` means there are no known pending human decisions. `whats-next` and `finish` surface any prompt files that do exist. The folder does not prove whether reviews occurred and is not a review-status system; it represents only unresolved human input.

Retire `seeded-discussion` rather than silently changing its broad meaning. Replace it with a user-invoked `resolve-pending-decisions` operation whose declared job is to consume one selected prompt or the thread's pending queue, consolidate obvious duplicates when needed, resolve one point at a time, append the resulting durable records to `decisions.md`, remove settled points, delete exhausted prompt files, and remove `.pending-decisions/` when it becomes empty.

The exact internal contracts, ownership rules, and contents of `.drafts/` and `.runs/` are deliberately deferred to a later discussion point. Their names and broad separation are accepted here; detailed taxonomy must be defined before the V3 implementation spec is complete.

Rationale: Purpose-specific local folders make write authority and cleanup clearer than a single catch-all workspace. Independent prompt files allow concurrent reviewers to hand off human questions safely, while the resolver turns only settled outcomes into Git-backed decisions. The trade-off is several reserved local folders and explicit cleanup rules, but each exists only when its distinct operational purpose is active.

## P29: One-way skill composition through model-invoked primitives

Point: Should V3 permit skills to invoke reusable behavioral primitives explicitly?

What you need to know: The referenced repository uses a one-way model: human-invoked orchestrators may invoke model-invoked primitives through `/skill` prose. This centralizes shared behavior, but the calls are not typed runtime functions and can fail if dependencies are absent.

Decision: Remove the V2 rule forbidding explicit skill-to-skill coupling. V3 adopts constrained instruction composition rather than unrestricted calls between arbitrary skills.

Skills may have three architectural roles:

1. **User-invoked entry points** own a complete user-visible operation and its orchestration.
2. **Model-invoked primitives** own one reusable behavioral discipline that an entry point, another suitable orchestrator, or the model may reach explicitly.
3. **References** own passive formats, examples, or factual guidance that do not warrant invocation behavior.

The dependency rules are:

- user-invoked entry points may invoke model-invoked primitives;
- model-invoked primitives never invoke user-invoked entry points;
- dependencies are named explicitly through `/skill-name` prose rather than deep cross-folder Markdown imports;
- dependency cycles are forbidden;
- a primitive owns behavior rather than merely acting as a shared text fragment;
- passive shared information remains reference material;
- callers retain ownership of domain-specific inputs, paths, side effects, concurrency, and completion criteria;
- extract a primitive only when multiple real consumers need the behavior or autonomous model routing is independently useful; and
- do not fragment the suite preemptively into micro-skills.

Create `discussion-point` as V3's first model-invoked primitive. It owns the canonical discussion-point structure and discipline: Title, Point, What you need to know, creative options or a practical proposed solution, recommendation, fact-versus-human-decision separation, and one-point-at-a-time presentation. It supports interactive presentation and normalization/emission of a review finding into a caller-provided unique prompt path.

The callers retain distinct responsibilities:

- `discussion` discovers points live, uses `/discussion-point` when a concrete fork emerges, and appends settled Decision Records to `decisions.md`;
- review operations determine finding validity, auto-fix what existing decisions support, allocate concurrency-safe prompt paths, and use `/discussion-point` to emit only irreducible human questions;
- `resolve-pending-decisions` selects and manages pending prompt files, uses `/discussion-point` interactively for each point, appends settled records to `decisions.md`, and cleans up consumed temporary inputs.

This is instruction composition, not a claim of language-level function semantics. V3 does not assume typed parameters, typed returns, automatic dependency resolution, or runtime enforcement. How composite skills and their required primitives are installed and validated is a separate unresolved design point that must be settled before implementation.

Rationale: One owner for the discussion-point discipline eliminates substantial duplication across open-ended discussions, queued discussions, and reviews while keeping their domain workflows separate. The one-way invocation boundary is easier to understand and audit than arbitrary mutual coupling. The trade-offs are additional model-visible context and a dependency-availability problem that the distribution model must explicitly solve.

## P30: Defer skill dependency installation and validation

Point: Must every V3 skill remain independently installable, even when it invokes another skill?

What you need to know: The current repository advertises individual installation:

```sh
npx skills add Jei-sKappa/skills --skill <skill-name>
```

After P29, installing `discussion` without `discussion-point` would leave an unresolved dependency. Prose invocation does not itself ensure that the required primitive is installed.

Decision: Project V3 permits explicit skill dependencies and assumes that every dependency named by a skill is available in the user's installation. The V3 migration does not build dependency metadata, dependency-aware installation, call-graph validation, automatic repair, inline fallback behavior, or duplicated standalone implementations. It also does not preserve a guarantee that every composite skill works when installed alone.

This is an intentional experimental-stage limitation. The repository is currently used by its owner, who understands and controls the installed set, so solving distribution integrity now would add machinery without improving current use. A composite skill directly names the model-invoked primitive it needs and otherwise focuses on its actual operation.

A future repository-specific installer may make dependencies native. It may install dependency closures, verify that all referenced skills are present, detect when a user manually deletes a required primitive, and offer repair. Those capabilities are deferred to a separate future design and are not promised by Project V3.

Until that installer exists, a missing invoked skill is an installation error rather than a branch the calling skill must compensate for. Documentation may state that Project V3 is designed and tested as a coherent installed suite, but no V3 runtime check or installer work is required.

Rationale: Explicit composition provides immediate authoring and maintenance value for the sole current user, whereas robust dependency distribution is a separate product problem. Ignoring it deliberately keeps the V3 migration focused. The trade-off is that third-party partial installations may fail opaquely or behave incompletely; that risk is knowingly accepted during the experimental period.

## P31: Universal AFK-to-human pending-decision queue

Point: Should `.pending-decisions/` accept prompts only from review skills, or from any AFK-oriented operation that encounters an indispensable human decision?

What you need to know: Reviews motivated the folder, but the same condition can occur during specification, planning, implementation, research, or Roadmap materialization. P13 already established that an explicitly AFK operation must not wait in chat or invent intent when blocked by human judgment.

Decision: `.pending-decisions/` is the universal thread-local bridge from AFK-oriented work back to human judgment. Any operation running with an AFK posture may emit a canonical pending decision when it cannot proceed safely without choosing human intent. Reviews are expected to be the most common producer but have no exclusive ownership of the queue.

Each pending prompt identifies:

- the producing skill;
- the target artifact or operation it serves;
- the relevant source artifacts or evidence;
- one canonical discussion point produced through `/discussion-point`; and
- what operation should resume or rerun after the decision is settled.

An AFK operation first completes everything it can derive or fix safely. It emits a pending decision only for an irreducible judgment and never uses the queue as a substitute for repository investigation, ordinary implementation judgment, or a concise final report. It does not wait in chat and does not invent the answer.

`resolve-pending-decisions` is the one user-invoked interactive bridge for prompts from every producer. Resulting human choices become durable Decision Records in `decisions.md`; temporary prompts are then consumed according to the queue lifecycle still to be specified.

This decision replaces P13's generic `.wip/needs-decision.md` handoff with the concurrency-safe `.pending-decisions/` queue and broadens P28 beyond review-only production.

Rationale: The underlying condition is the same regardless of which AFK operation encounters it: progress requires human intent. One semantic queue and one resolver are easier to learn and maintain than producer-specific blocker files. The trade-off is that prompt metadata must be sufficiently explicit for heterogeneous originating operations to resume correctly.

## P32: One pending-decision file per human question

Point: Should one prompt file represent an entire producing operation or exactly one human decision?

What you need to know: A single review or implementation run may uncover several unrelated questions. Those questions may be discussed at different times, overlap with findings from other agents, or require different operations to resume afterward.

Decision: One file under `.pending-decisions/` represents exactly one irreducible human decision. A producing operation writes as many independent files as there are genuinely independent questions and leaves no batch-level review or blocker report.

Each file uses a human-readable UTC-and-slug filename plus a short unique suffix so concurrent producers cannot collide even when they finish within the same second. The conceptual shape is:

```text
.pending-decisions/
├── 260712142301Z-a3f9-retry-ownership.md
├── 260712142301Z-81be-api-compatibility.md
└── 260712142302Z-c914-roadmap-scope.md
```

Each prompt contains:

```markdown
# Pending decision: <title>

Producer: /<skill-name>
Target: <thread-relative artifact or operation>
Sources: <relevant references>
Resume: <operation to rerun or continue>
Created: <UTC>

## Point

<the decision to make>

## What you need to know

<self-contained evidence and surrounding context>

## Options
<!-- or: ## Proposed solution -->

...

## Recommendation

...
```

`/discussion-point` owns the canonical point body and its creative-versus-practical presentation. The producing operation owns the correctness of the evidence, the target and source references, the resume instruction, and allocation of the unique output path.

The file is the atomic unit of interactive discussion, duplicate detection, durable decision creation, cleanup, and eventual resumption. Multiple files from one producer run may be resolved independently; no prompt needs partial status fields merely because another question from the same run remains open.

Rationale: One question per file matches V3's one-point-at-a-time discussion discipline and makes concurrent production and cleanup straightforward. The trade-off is more temporary files when an operation discovers several questions, which is preferable to editing partially consumed multi-question batches or adding per-point lifecycle state inside them.

## P33: Pending decisions are bundled by resumption boundary

Point: Should one prompt file represent an entire producing operation or exactly one human decision?

What you need to know: A single review or implementation run may uncover several unrelated questions. Those questions may be discussed at different times, overlap with findings from other agents, or require different operations to resume afterward.

Decision: Supersede P32's one-file-per-question rule. One file under `.pending-decisions/` is a **resumption bundle**: it contains one or more human decisions produced by the same operation that share a coherent target and should be settled before the same resumption action runs once.

The normal case is one bundle per producing skill invocation. An invocation emits separate bundles only when subsets of its questions have meaningfully different targets or require different follow-up operations. The invariant is therefore:

```text
one bundle = one producer + one coherent target + one resumption action
```

Concurrent producers always allocate separate uniquely named files. Each bundle begins with a lightweight routing header:

```markdown
# Pending decisions: <bundle title>

Producer: /<skill-name>
Target: <thread-relative artifact or operation>
Resume: <operation to rerun or continue once>
Created: <UTC>
Points: <count>
Summary: <one-line description of the contained questions>
```

The body contains one canonical `/discussion-point` section per unresolved human question. All points in the bundle share the routing header's producer, target, and resumption boundary.

`resolve-pending-decisions <path>` loads only the named bundle. When invoked without a path, it lists bundle files and reads only their routing headers; it does not ingest every prompt body. If exactly one bundle exists, it selects it directly. If several exist, it presents a compact queue and lets the user choose, adding a recommendation only when dependency or urgency makes an order materially preferable. It then loads the selected bundle alone and discusses its points one at a time.

After each choice becomes a durable Decision Record in `decisions.md`, the resolver removes that settled point from the mutable temporary bundle. The file therefore always contains only unresolved points and needs no per-point status metadata. If the user pauses, the remaining body is the complete resumption state for the next interactive session. When its final point is settled, the exhausted bundle is deleted.

The producing operation performs this grouping while it still has the best context to understand which questions belong to one resumption. The resolver does not load every pending question and reconstruct groups retrospectively.

Only genuine human decisions enter `.pending-decisions/`. An explicitly requested read-only findings report is a different deliverable; clear defects and observations are not disguised as decision points merely because the reviewer lacks mutation authority.

Rationale: Resumption boundaries provide the useful locality of one file per review or AFK operation without the partial-state complexity of arbitrary batches. Header-only queue discovery prevents unnecessary context ingestion, and destructive removal of settled temporary sections keeps resumption simple without introducing lifecycle fields. The trade-off is that producers must identify coherent resumption groups correctly, which is domain knowledge they already possess.

## P34: Resolve a bundle, then resume its producer once

Point: Should resolving the question finish the queue item, or must the originating operation also apply and recheck the decision?

What you need to know: If the resolver deletes a prompt immediately after writing its Decision Record, the queue becomes empty even though `spec.md`, code, or another target may not yet reflect that decision. Requiring the user to remember a separate rerun recreates the forgotten mechanical handoff we are trying to remove.

Decision: `resolve-pending-decisions` closes the complete decision-to-application loop for one selected resumption bundle by default.

It:

1. selects one bundle without loading unrelated bundle bodies, following P33;
2. discusses the selected bundle's points one at a time through `/discussion-point`;
3. appends each settled outcome as a durable Decision Record in `decisions.md`;
4. removes each settled point from the temporary bundle;
5. deletes the bundle when no unresolved points remain;
6. invokes the bundle's declared resumption operation exactly once, supplying the target and newly created Decision Record references;
7. lets that operation apply the decisions and recheck its work; and
8. leaves no new temporary artifact on success, or permits the resumed operation to emit a new coherent bundle if genuinely new human judgment is required.

The resolver does not rerun the producer after every individual point. Compatible questions are decided first and applied together at their shared resumption boundary. It stops after the one resumption cycle rather than automatically opening and discussing any newly emitted bundle, preventing an unbounded interactive loop. The user may invoke the resolver again for remaining or newly discovered bundles.

An invocation may explicitly request a decision-only session. In that exceptional mode, the resolver records decisions and consumes the selected bundle but reports the declared resumption action without invoking it. End-to-end resolution remains the normal behavior because it prevents decided intent from being left unapplied through forgotten manual bookkeeping.

Rationale: Automatic grouped resumption keeps `.pending-decisions/` semantically limited to unresolved human judgment while ensuring that settled decisions normally reach their targets. It removes the easy-to-forget handoff between discussion and repair and avoids wasteful reruns per point. The trade-off is that the resolver orchestrates one downstream operation, which is consistent with P29's one-way composition model and bounded by the bundle's explicit resume contract.

## P35: Fixed reconciliation versus review semantics

Point: Should workflow-artifact correction and delivered-work assessment use fixed, distinct operation semantics rather than selectable review modes?

What you need to know: Proposal, specification, plan, and Roadmap artifacts are development instruments that can often be corrected mechanically from existing decisions before downstream use. Code and implementation assessment benefits from reviewer independence and should not silently authorize working-tree changes. Invocation-time modes would make the same skill name carry different mutation authority.

Decision: Project V3 distinguishes two fixed operation categories and does not add report-only, queue-only, or auto-fix variants to one generic review contract.

**Reconciliation** operations inspect a workflow artifact and are authorized to edit their declared target when a correction follows from authoritative existing decisions. They recheck supported repairs and route irreducible human intent into coherent `.pending-decisions/` bundles. They never modify their authority source merely to make the target appear consistent; a source fault becomes a pending human decision.

**Review** operations inspect delivered work read-only and produce an independent assessment. They do not edit the reviewed code or implementation and do not silently turn the invocation into a repair pass. How their findings reports are represented, retained, and optionally routed into later decision work remains unresolved.

Each skill has one predetermined category and mutation contract; the user does not choose a behavior variant at invocation time. Skill naming should eventually make the category and authority clear.

This decision locks only the reconciliation-versus-review approach. It does **not** yet decide:

- the exact review report output, location, durability, or lifecycle;
- the final names and complete category assignment of every existing review skill;
- whether `review-spec`, specification reconciliation, and lossless-mapping behavior remain separate, merge, or are renamed; or
- how findings from a read-only review may later become pending decision bundles.

Those subjects require subsequent discussion.

Rationale: Fixed semantics make invocation authority predictable and avoid multiplying hidden modes inside one skill. Workflow artifacts can be repaired efficiently from decisions, while delivered work receives an independent read-only assessment. Deferring the exact skill map prevents this architectural agreement from prematurely settling the two output and specification-review questions the user wants to examine separately.

## P36: Finding-only pending-review bundles

Point: Define one output contract for every read-only review skill.

What you need to know: Asking the reviewer to split findings between review and decision queues requires judgment outside its core responsibility and risks inconsistent routing. A single findings bundle preserves the complete assessment and lets later operations decide what to do with it.

Decision: Every read-only review skill has one output destination and performs no finding routing. It never writes `.pending-decisions/` and never decides whether a finding is mechanically fixable, requires human intent, should be accepted, or should be rejected.

When a review finds no actionable issue, it returns a concise pass result in chat and creates no file. When it finds one or more actionable issues, it creates one uniquely named findings bundle for that review run under the active thread's gitignored `.pending-reviews/` folder. Concurrent reviews always use separate files.

A pending-review bundle uses this conceptual structure:

```markdown
# Pending review: <review title>

Reviewer: /<review-skill>
Target: <reviewed code or implementation reference>
Created: <UTC>
Findings: <count>

## Context

<optional concise overall assessment needed to interpret the findings>

## Findings

### F1: <short title>

Severity: <blocker | issue | nit>
Category: <review-specific category>

Finding: <what is wrong>

Evidence: <precise supporting reference>

Impact: <why it matters>

Suggested action: <a useful next action, when supportable>
```

`F<N>` identifiers are sequential and local to one bundle. Findings are ordered by severity and then by the review skill's natural category order. Every finding includes a severity, review-specific category, finding statement, evidence, and impact; a suggested action is included only when useful and supported. The optional `## Context` section is the place for a short natural-language mini-review that applies to the bundle as a whole.

Review-specific categories remain owned by each reviewer. For example, code review may use quality, safety, idioms, and testability, while implementation review may use acceptance, constraints, scope, behavior, and test coverage.

The review's responsibility ends with an accurate bundle. A later operation may address findings, turn a specific finding into a human decision, rerun the reviewer, or remove the temporary bundle, but none of that routing or lifecycle logic belongs to the read-only review skill. The exact consumption and deletion behavior remains undecided.

The folder name `.pending-reviews/` is accepted with the defined meaning **completed reviews whose findings remain available for attention**, not reviews that have yet to run. Its absence means no pending-review bundle has been emitted in the local workspace; it does not prove that every possible review was performed.

Rationale: One predictable output rule keeps reviewers focused on independent assessment and prevents them from conflating defects with human decisions. Finding-only bundles avoid empty pass artifacts, support concurrent reviewers, retain useful review context, and postpone disposition to a later operation without recreating committed review records or approval latches.

## P37: Separate specification decision fidelity from handoff quality

Point: Separate specification decision fidelity from specification handoff quality.

What you need to know: Lossless mapping has only been used against specifications and behaves like reconciliation: supported discrepancies should be corrected, while missing human intent should be queued. Specification review is an independent read-only assessment of whether the reconciled document is fit for downstream planning and implementation.

Decision: Retire `review-lossless-mapping` as a standalone skill and absorb its behavior into `reconcile-spec`.

`reconcile-spec` becomes a mutating, decision-fidelity operation:

1. Read `decisions.md`, the seed, and relevant upstream artifacts.
2. Inventory the decisions the specification should carry.
3. Add clearly omitted decisions.
4. Remove or correct content that contradicts existing decisions.
5. Remove unsupported choices that the specification invented.
6. Preserve legitimate elaboration and mechanically derived acceptance criteria.
7. Use `.pending-decisions/` only when determining the correct specification requires new human intent.
8. Recheck after corrections.
9. Produce no review report.

Its core question is:

> Is this specification a lossless, additive-free expression of the decisions that govern it?

`review-spec` remains a real, read-only review:

1. Read the reconciled specification as a downstream handoff.
2. Judge whether another agent can plan and implement from it without relying on hidden conversational context.
3. Check clarity, completeness, internal consistency, scope boundaries, observable behavior, constraints, degrees of freedom, acceptance guidance, and planning readiness.
4. Do not edit `spec.md`.
5. Do not perform an exhaustive decision-by-decision lossless mapping.
6. If it passes, create no file.
7. If it finds issues, write one `.pending-reviews/` bundle using the P36 format.

Its core question is:

> Is this a good enough specification for someone else to act on safely?

A visible contradiction with `decisions.md` can still be reported by `review-spec` because it harms readiness, but exhaustive source-to-spec fidelity belongs to `reconcile-spec`. That keeps the boundary practical rather than forcing the reviewer to ignore an obvious problem.

The recommended sequence becomes:

```text
spec
→ reconcile-spec
→ [review-spec]
→ plan
```

`review-spec` remains optional under the conventions-first workflow. A clean result is a readiness judgment in chat, not an approval latch or lifecycle gate.

The two operations answer different questions:

- `reconcile-spec`: Does the specification faithfully carry the user's decisions without omissions, contradictions, or unsupported additions?
- `review-spec`: Is the resulting specification clear, complete, unambiguous, self-contained, and ready for another agent to plan and implement?

A specification may pass one and fail the other. It may faithfully preserve a vague decision yet remain too ambiguous to implement, or it may be polished and implementation-ready while silently adding behavior the user never decided. Reliable handoff benefits from both axes without combining their mutation authority or output behavior.

Rationale: Moving lossless mapping into reconciliation places obvious decision-fidelity corrections with the operation authorized to make them and sends only missing human intent into the decision queue. Keeping specification review independent preserves a genuine downstream-reader assessment of document quality. The separation avoids a redundant standalone lossless-review artifact while retaining the two materially different questions the user values.

## P38: Address pending reviews through manual composition

Point: Who should consume a `.pending-reviews/` bundle, apply supported fixes, recheck the target, and remove the bundle?

What you need to know: A read-only reviewer deliberately stops after reporting findings. Someone still needs to:

- assess rather than blindly accept each finding;
- modify the appropriate target;
- route genuine human intent through `.pending-decisions/`;
- rerun the original reviewer; and
- remove stale findings after a clean recheck.

Decision: Start with manual composition rather than introduce a dedicated `address-review` orchestrator.

A pending-review bundle is an ordinary, self-contained input that the user can give to any capable agent with a direct instruction such as “read the findings and fix them.” Addressing simple findings does not require invoking a named skill. When a domain-specific skill is useful and available, the user may invoke it explicitly, but the review bundle does not prescribe an `Address with:` skill or assume that any particular user-invocable skill is available for model invocation.

The addressing agent must assess each finding rather than accept it mechanically, apply the supported corrections within its actual write authority, and use `.pending-decisions/` only if resolution requires new human intent. The user may then rerun the original reviewer explicitly when an independent recheck is worthwhile. A recheck that still finds issues emits a fresh bundle under P36; a clean recheck emits no new file.

The consumed bundle remains temporary workspace state. It is removed once the user or addressing agent judges that its findings have been addressed, dismissed, or superseded by a newer review bundle. V3 does not add statuses, dispositions, automatic retry loops, or a specialized resolver for pending reviews.

This is intentionally an experimental baseline. If ordinary use shows that manual handoffs are frequently forgotten, review bundles become stale, or repeated repair-and-recheck loops are cumbersome, a later discussion may introduce bounded orchestration based on observed failures rather than anticipated complexity.

Rationale: Most review findings are few and straightforward, so direct natural-language repair is cheaper and more flexible than another workflow skill. Avoiding an `Address with:` field also respects the planned distinction between user-invocable and model-invocable skills: a reviewer cannot safely assume that a named addressing skill is callable by the next agent. The trade-off is that rerunning the reviewer and cleaning up the temporary bundle rely on user or agent discipline; that cost is accepted while the model is tested in practice.

## P39: Complete reconciliation and review taxonomy

Point: Which V3 skills should reconcile mutable workflow artifacts, and which should perform independent read-only reviews?

What you need to know: Reconciliation and review should not be duplicated mechanically for every artifact. A second operation is justified only when it answers a materially different question.

Decision: Adopt the following V3 reconciliation and review taxonomy:

| Current capability | V3 disposition | Responsibility |
|---|---|---|
| `review-proposal` | Rename to `reconcile-proposal` | Align the proposal with existing decisions; fix supported discrepancies; queue missing intent. |
| `review-lossless-mapping` | Retire | Its specification behavior moves into `reconcile-spec`. |
| — | Add `reconcile-spec` | Enforce lossless, additive-free decision fidelity. |
| `review-spec` | Keep as `review-spec` | Read-only assessment of handoff quality and planning readiness. |
| `review-plan` | Rename to `reconcile-plan` | Align the plan with the specification and repair plan faults. |
| `review-implementation` | Keep | Read-only implementation-versus-spec fidelity review. |
| `review-code` | Keep | Read-only code-quality review. |
| — | Add `reconcile-roadmap` | Align the roadmap and its decomposition with existing decisions. |
| — | Add `review-roadmap` | Read-only assessment of whether the decomposition, dependencies, and child briefs are safe to hand off. |

`reconcile-spec` is explicitly the successor to `review-lossless-mapping`, not merely a new skill that happens to reuse part of it. It retains the same core objective in both directions:

1. find decisions that govern the specification but were not added to it; and
2. find decisions, assumptions, or commitments added to the specification even though the user never made them.

The successor changes the operation's authority and outcome, not that objective. Where the correct mapping follows from existing authoritative decisions, `reconcile-spec` edits the specification to restore a lossless, additive-free mapping. Where resolving the discrepancy would require new human intent, it emits a coherent `.pending-decisions/` bundle. It does not produce a review report.

Do not retain `review-proposal` as a separate read-only review. A proposal is an exploratory intermediate: `reconcile-proposal` can repair established discrepancies and turn genuinely unresolved risks or ambiguities into pending decisions without adding another findings-only pass before specification.

Do not retain `review-plan` as a read-only review. Its current auto-correcting behavior already matches reconciliation, and the plan is a disposable execution instrument rather than an artifact whose independent quality judgment needs preserving.

The specification and Roadmap warrant both categories because each is an important downstream handoff. Reconciliation asks whether the artifact faithfully represents established intent; review independently asks whether another agent can safely act on it.

Rationale: Naming operations by their fixed mutation contract makes their behavior predictable and prevents “review” from meaning both correction and independent assessment. Limiting paired reconciliation-and-review operations to consequential handoffs avoids mechanically duplicating skills for every artifact. Explicitly preserving the lossless-mapping objective in `reconcile-spec` ensures the V3 simplification does not lose the original safeguard against omitted user decisions or smuggled-in commitments.

## P40: Replace generic ignored workspaces with implementation-scoped runs

Point: Should V3 eliminate generic draft and run workspaces, retaining only an implementation-specific temporary workspace?

What you need to know: No active authoring skill creates candidate drafts, while only `implement-plan` and `implement-plan-with-subagents` create resumable or inter-agent execution state. Generic folders would advertise extensibility that is not presently used.

Decision: Retire `.wip/` without introducing generic `.drafts/` or `.runs/` replacements. Retain `.pending-decisions/` and `.pending-reviews/` for their already-defined cross-operation handoffs, and introduce only the implementation-owned ignored workspace `.implementation-runs/`.

The current active-skill audit establishes the basis for this narrower model:

- `propose`, `spec`, and `plan-strict` write canonical artifacts directly. They only mention `.wip/` as the hypothetical location for competing multi-model drafts.
- `merge-artifacts` reads caller-provided competing drafts but does not create them.
- review skills merely repeat non-commit or misplaced-draft rules and do not operationally use draft files.
- `whats-next` only explains the old candidate-variant convention.
- `implement-plan` writes a progress ledger for task progress, context-compaction recovery, and implementation-report synthesis.
- `implement-plan-with-subagents` writes the same progress ledger plus conditional implementer outcomes and internal reviewer scratch used across agent boundaries and fix loops.
- `implement` does not use `.wip/`.

`.implementation-runs/` is invocation-scoped rather than keyed only by plan lineage. Its conceptual shape is:

```text
.implementation-runs/
└── 260713143000Z-plan-001/
    ├── progress.md
    └── task-01/
        ├── 01-implementer-outcome.md
        └── 02-review.md
```

The workspace follows these rules:

- `implement-plan` creates only `progress.md`.
- `implement-plan-with-subagents` may additionally create dispatch outcome and internal review files.
- Every invocation receives a unique run directory, preventing a later run against the same plan from inheriting stale progress.
- Context compaction within an invocation recovers from that invocation's run directory.
- At a normal terminal outcome, successful or blocked, the skill first writes or updates `implementation-report.md` and then removes its temporary run directory.
- If execution is unexpectedly interrupted before the report is produced, the run directory remains available for explicit resumption.
- A new invocation never silently adopts an existing run directory; resumption must identify the run explicitly.
- No durable artifact refers to a path inside `.implementation-runs/`; durable information is copied or synthesized into the implementation report or another canonical output.

Use `.implementation-runs/` rather than `.ephemeral-implementation-resources/`. “Implementation” identifies the owner, while “runs” identifies the unit and explains why multiple directories may coexist. “Resources” could imply stable inputs or reusable assets, and “ephemeral” is misleading because interrupted state intentionally survives compaction or session loss until explicitly resumed.

Remove the repository-wide candidate-draft storage convention. `merge-artifacts` may continue to accept explicitly supplied candidate paths wherever the caller created them; their location is an input concern rather than part of the thread model. If a future capability actively generates parallel candidates, it may introduce a narrowly scoped workspace based on demonstrated need.

This decision supersedes the `.drafts/` and generic `.runs/` portions of P28. P28's `.pending-decisions/` direction survives as refined by P31–P34, and `.pending-reviews/` remains governed by P36 and P38.

Rationale: V3 should model the ignored workspaces its skills actually require rather than reserve generic namespaces for hypothetical uses. The narrower folder makes ownership and cleanup obvious, preserves the compaction and subagent handoff behavior used by both plan implementers, and fixes V2's stale-state risk by separating invocations. The trade-off is that a future non-implementation operation needing filesystem-backed run state must define its own workspace or motivate a shared abstraction later.

## P41: Self-contained Roadmap contract with factual materialization links

Point: What information must a Roadmap contain so it supports good decomposition, independent child execution, review, and safe repeated materialization without becoming a project tracker?

What you need to know: The Roadmap must serve several consumers:

- the human reviewing the overall direction;
- `reconcile-roadmap`, checking it against established decisions;
- `review-roadmap`, assessing decomposition quality;
- the materialization operation creating child threads;
- future child agents needing parent context.

It must remain a thinking and handoff artifact—not a status dashboard, dependency engine, or ledger.

Decision: `roadmap.md` uses the following conceptual contract:

```markdown
# Roadmap: <title>

## Intended outcome

<what completing the overall initiative should accomplish>

## Context

<why the initiative exists and the surrounding project context>

## Scope and boundaries

### In scope

...

### Out of scope

...

## Shared constraints

<constraints that apply across multiple children>

## Decomposition rationale

<why the work is divided this way, including important sequencing
or ownership boundaries>

## Child threads

### C1: <child title>

Materialized thread: <repo-relative thread reference, added after creation>

Outcome: <the independently valuable result this child should produce>

Context: <self-contained background needed to open the child>

Scope and boundaries:
- In scope: ...
- Out of scope: ...

Dependencies:
- <C<N> plus what information or outcome is needed>
- or: None

Relevant shared constraints:
- <constraints from the parent that materially apply>

Suggested workflow:
<the complete expanded workflow sequence, never merely “Quick” or “Standard”>

### C2: <child title>

...
```

At the Roadmap level:

- `Intended outcome` defines the overall destination.
- `Context` makes the artifact understandable without the original chat.
- `Scope and boundaries` prevents decomposition from silently expanding the initiative.
- `Shared constraints` contains only rules affecting multiple children; child-specific constraints live in the relevant brief.
- `Decomposition rationale` explains why the selected children and boundaries make sense.

The Roadmap does not need to supply an implementation design for every child. Its purpose is to define independently discussable outcomes, not pre-write each child's specification.

`C1`, `C2`, and subsequent child identifiers are stable local references inside the Roadmap. Dependencies refer to these IDs rather than titles. IDs do not change after materialization, and their numeric order is organizational rather than lifecycle state or a guarantee of sequential execution.

Every child brief is self-contained enough to become a seed. It contains an outcome, relevant context, explicit scope and boundaries, dependencies and the input required from them, applicable shared constraints, and the complete expanded suggested workflow. A dependency describes what the child consumes rather than merely naming another child, for example:

```text
Dependencies:
- C1 — consume the finalized authentication boundary and token ownership rules.
```

Before materialization, `Materialized thread:` is absent rather than set to `none` or `pending`. After successfully creating a child, the materialization operation adds the corresponding thread reference to its brief. This field is factual evidence, not workflow status. It supports idempotent partial reruns, parent-to-child navigation, and distinguishing an unmaterialized brief from an existing child without checkboxes.

The materializer:

1. creates children whose briefs have no materialized-thread reference;
2. skips and verifies children already carrying a valid reference;
3. adds each reference immediately after successful creation; and
4. never uses the field to track whether a child is active, blocked, finished, or archived.

The separate archival-link thread determines how references behave when child threads move into the archive.

`roadmap.md` contains no completion checkboxes, child status fields, progress percentages, owners, assurance levels, workflow names, approval latches, mutable dependency state, or summaries of child implementation progress. Child discoveries affecting later work go into `roadmap-feedback.md`, not through rewrites of the original direction or child briefs. The only normal post-authoring mutation made by materialization is adding factual child-thread references.

Rationale: A self-contained direction plus structured child briefs gives humans, reviewers, materializers, and future child agents the same durable source without turning the Roadmap into a coordinator. Stable child IDs make dependencies and feedback precise, while descriptive dependency inputs reduce unnecessary sibling-context loading. Factual materialization references provide restart safety and navigation without recreating status machinery. The trade-off is a small mechanical edit to `roadmap.md` after review, accepted because it records created evidence rather than changing intent.

## P42: Finish is an advisory delivery handoff, not a lifecycle sealer

Point: What should `finish` do after removing lifecycle ledgers, approval latches, durable reviews, automatic tracker closure, and enforced workflow completion?

What you need to know: Finish remains the shared endpoint of Quick, Standard, and Roadmap, but it can no longer “seal” a thread mechanically. Archival now owns the visible terminal lifecycle, while External references do not authorize tracker mutations. Finish therefore needs a narrower purpose that still provides practical value.

Decision: `finish` becomes an interactive delivery-handoff skill whose purpose is to inspect what exists, surface unresolved signals, and let the user decide how to deliver the current branch. It does not decide whether the thread is objectively complete.

Finish first runs a lightweight readiness inspection. It reads the seed's suggested workflow as context rather than an enforced checklist and inspects:

- whether the thread's apparent principal outcome exists, such as `implementation-report.md` for implemented work or `roadmap.md` plus materialized-child evidence for Roadmap work;
- `.pending-decisions/`;
- `.pending-reviews/`;
- abandoned or interrupted `.implementation-runs/`;
- obvious unresolved conflict markers;
- whether relevant living documentation appears current;
- the current branch, recent commits, and working-tree state; and
- verification evidence already recorded by implementation.

Finish does not rerun the complete test suite or repeat implementation review. Verification belongs to implementation and optional review operations. Its report is signal-only: empty categories are omitted instead of producing a ceremonial checklist of `none` results.

Readiness findings are advice rather than gates. Finish may recommend pausing when pending decisions, review findings, unmaterialized Roadmap children, a dirty worktree, a missing outcome artifact, or another consequential signal suggests delivery is premature. The user may explicitly accept the trade-off and continue. Finish never manufactures readiness by approving or versioning documents, deleting pending bundles, rewriting the specification or plan, creating a missing implementation report, marking reviews resolved, or adding completion statuses.

Finish offers one of three branch dispositions:

1. `create PR`;
2. `merge into target branch`; or
3. `leave as is`.

For a merge, Finish asks for or confirms the target branch. The user's selected option authorizes that branch operation; Finish does not ask for redundant confirmation before every ordinary Git command. It still resolves missing consequential parameters and stops on failure rather than improvising recovery. It never rebases, amends, force-pushes, or otherwise rewrites history.

Creating a pull request or merging requires the relevant work to be committed. Finish must not silently commit an arbitrary dirty worktree because unrelated user changes may be present. If the user selects delivery while uncommitted changes exist, Finish asks whether to authorize a commit of an explicitly identified file set, return so the user can prepare commits separately, or leave the branch as-is. This is meaningful mutation authorization rather than an artifact approval latch.

External tracker references remain passive under P27. Finish may include an `External:` reference in a pull-request body as a non-closing relationship such as `Related to`, but it does not automatically comment on the ticket, close it, change its status, add a backlink, or use closing keywords. Those actions require an explicit user request.

After the branch action, Finish reports the outcome and presents `archive-thread` as the normal optional next action. It does not archive automatically. Finish owns repository delivery; archive location records that the thread is no longer active.

V3 Finish therefore no longer sets `status.implemented`, appends `closed: done`, reads a tier, freezes artifacts, disposes reviews, closes linked tickets, updates tracker backlinks, treats missing workflow stages as violations, or updates living documentation itself.

Rationale: Finish remains valuable when concentrated on the consequential repository-handoff moment rather than simulating control the filesystem cannot enforce. An evidence-backed branch choice helps the user avoid losing or delivering incomplete work, while advisory signals preserve the conventions-first model. Removing redundant command confirmations and mechanical status writes reduces ceremony. The trade-off is that Finish cannot certify completion; archival and the durable artifacts remain the human-readable evidence of lifecycle and outcome.

## P43: Reconciliation is normal artifact maintenance; independent review is optional

Point: Should reconciliation be part of the normal suggested path, or shown as an optional quality activity like read-only review?

What you need to know: Reconciliation and review now have different purposes:

- reconciliation makes an authored artifact faithfully reflect its authoritative inputs and may correct it;
- review independently judges whether a consequential handoff is good enough to use.

If both are shown as optional reviews, users may continue treating reconciliation as approval ceremony. If reconciliation is part of the normal path, it becomes the authoring equivalent of a compiler or formatter pass—but remains skippable because all workflows are conventions.

Decision: Make reconciliation an unbracketed normal step for specification, strict planning, and Roadmap authoring. Keep independent reviews optional. For an optional proposal, proposal authoring and reconciliation form one optional group.

The Quick Workflow is:

```text
open-thread
→ [discussion]
→ [plan-brief]
→ implement
→ [review-implementation]
→ [review-code]
→ finish
  └─ [archive-thread]
```

Quick has no reconciliation step. It intentionally avoids a specification; `plan-brief`, when used, has no specification to reconcile against; and adding a reconciliation pass would undermine its lightweight purpose. Its authoring and implementation operations still perform ordinary self-checks.

The Standard Workflow is:

```text
open-thread
→ discussion
→ [proposal → reconcile-proposal]
→ spec
→ reconcile-spec
→ [review-spec]
→ plan-strict
→ reconcile-plan
→ implement-plan
→ [review-implementation]
→ [review-code]
→ finish
  └─ [archive-thread]
```

The reconciliation roles are:

- `reconcile-proposal` aligns an optional direction-setting artifact with existing decisions;
- `reconcile-spec` performs the successor lossless-mapping pass defined by P37 and P39; and
- `reconcile-plan` aligns the strict plan with the specification and repairs plan faults.

The Roadmap Workflow is:

```text
open-thread
→ discussion
→ [proposal → reconcile-proposal]
→ roadmap
→ reconcile-roadmap
→ [review-roadmap]
→ materialize-roadmap-threads
→ finish
  └─ [archive-thread]
```

`reconcile-roadmap` ensures that the overall direction and child decomposition faithfully carry established decisions before optional independent review and multi-thread materialization.

In workflow notation, unbracketed means the documented normal path, never mechanically required. Bracketed means suggested when useful. A bracketed group such as `[proposal → reconcile-proposal]` means that when the optional artifact is created, reconciliation is its normal companion. Pending decisions may interrupt any reconciliation, but `resolve-pending-decisions` is reactive infrastructure rather than a stage repeated in every workflow diagram.

Rationale: Reconciliation is part of producing a trustworthy artifact, not an approval event, while independent review provides a genuinely optional second opinion. Making that distinction visible in the normal sequences preserves the safeguards against decision drift without recreating mandatory review bureaucracy. Omitting reconciliation from Quick protects its purpose as the minimal path. The trade-off is that even unbracketed steps may be skipped under the conventions-first model, which is intentional and does not invalidate the thread.

## P44: Plan Brief is a one-screen plan and may be upgraded in place

Point: What should distinguish `plan-brief` from the deprecated `plan-loose`, and how should a brief plan evolve if a Quick thread grows into Standard?

What you need to know: `plan-loose` is not especially brief. It still requires independently implementable and reviewable tasks, task-specific verification, granular self-review rules, and much of the same conceptual machinery as strict planning. Meanwhile, the current `implement` skill does not explicitly accept `plan.md`, even though Quick now places `plan-brief` immediately before it.

Decision: `plan-brief` succeeds `plan-loose` with a substantially smaller contract. It always writes the thread-root `plan.md` using this conceptual shape:

```markdown
# Plan: <title>

Source: <thread-relative source>

## Outcome

<the result this implementation should produce>

## Steps

1. <short implementation step>
2. <short implementation step>
3. <short implementation step>

## Verification

<the small set of checks that demonstrates the overall change works>

## Notes

<only constraints, assumptions, or cautions genuinely needed by the implementer>
```

`## Notes` is optional. The other sections are required.

A brief plan gives implementation a sensible order, keeps every step to one short paragraph, and records overall verification rather than a verification contract for every step. It does not require per-task files, file lists, per-step acceptance criteria, independent reviewability, strict task isolation, dependencies, waves, state, statuses, or frontmatter. It should normally fit on one screen. When safe planning requires detailed substeps, per-task verification, explicit file ownership, or acceptance criteria, the author recommends `plan-strict` instead.

Within a thread, `plan-brief` normally reads `seed.md`, `decisions.md`, and any explicit code or issue reference supplied by the user. It emits a self-contained `plan.md` that does not depend on the original chat.

V3 `implement` explicitly accepts `plan.md` as input. It treats the numbered entries as its implementation steps while retaining freedom to derive obvious substeps during execution. If no brief plan exists, Quick may invoke `implement` directly from `seed.md`, `decisions.md`, a code reference, or the user's explicit prompt.

If a Quick thread grows into Standard, the normal escalation is:

1. create `spec.md`;
2. run `reconcile-spec`;
3. invoke `plan-strict`;
4. replace the brief `plan.md` with the strict plan index; and
5. create `plan-tasks/` atomically.

The brief plan is disposable working structure, so replacing it requires neither versioning, a supersession record, nor a new thread. Git may retain textual history when commits happen, but V3 does not depend on that history. `plan-strict` replaces the complete planning artifact rather than combining strict tasks with stale brief steps.

The reverse transition is exceptional. If `plan-tasks/` already exists, `plan-brief` must not silently downgrade the planning artifact or delete strict tasks. It requires an explicit instruction to replace the strict plan, after which it writes the brief `plan.md` and removes the obsolete `plan-tasks/`.

Rationale: A genuinely short plan gives Quick users useful ordering and verification without recreating Standard's ceremony. Reusing `plan.md` keeps navigation predictable, and in-place escalation lets complexity discovered during work increase rigor without multiplying artifacts or threads. The trade-off is that a brief plan delegates more implementation judgment to `implement`, which is the intended Quick contract.

## P45: Implementation report is the current durable outcome, not a run history

Point: What should the singleton implementation report preserve, and how should it evolve across multiple implementation passes without becoming a task ledger?

What you need to know: V2 creates one immutable, timestamped report per implementation run. V3 instead has one root-level `implementation-report.md`, while `.implementation-runs/` temporarily carries detailed progress and subagent scratch. The durable report should describe the current delivered outcome even when no intermediate Git commits exist.

Decision: `implementation-report.md` uses this compact conceptual contract:

```markdown
# Implementation report

Source: <seed.md, plan.md, or spec.md>

## Outcome

<what was completed, partially completed, blocked, or found already satisfied>

## Changes

<concise description of the resulting code, tests, configuration,
and living-document changes>

## Verification

<checks actually performed and their results>

## Deviations and judgment calls

<material differences from the input and choices made within granted freedom>

## Remaining concerns

<known risks, unresolved limitations, or blockers>

## Follow-ups

<work discovered but intentionally left outside this implementation>
```

`Outcome`, `Changes`, and `Verification` are always required. The other sections appear only when they contain useful information; the report does not emit repeated `none` placeholders.

The singleton describes the thread's current implementation outcome rather than preserving a run history. Implementation operations create it when they reach a normal terminal outcome and update it in place on later passes. Resolved concerns and obsolete blockers are removed, new changes and current verification replace stale descriptions, and previous run transcripts are not appended. Task status blocks, dispatch counts, and fix-loop details remain in `.implementation-runs/` only while operationally needed. Git may preserve earlier report text when commits happen, but V3 does not rely on that history.

The report is written or updated whenever an implementation operation returns normally. Successful work describes the delivered result; partial or blocked work clearly names what changed and what prevented completion; a no-op explains that the requested state already existed and how that was verified. An unexpected interruption may leave only `.implementation-runs/`; incomplete or unverified scratch does not update the report merely to make the thread appear current.

Verification records checks actually executed, including failures or intentionally skipped checks with their reasons. It may include test commands and summarized results, builds, linters, static analysis, targeted manual inspection, and living-document changes required by the implementation. It never claims that a plan's intended verification was performed merely because the plan names it. Commit SHAs are optional and never required for completeness.

The report records deviations honestly and does not retroactively edit `spec.md` or `plan.md` to make implementation appear compliant. New human intent goes through `.pending-decisions/`; choices within already granted degrees of freedom may be recorded under `Deviations and judgment calls`.

Follow-ups remain concise report entries when they are only candidates for later work, become new thread seeds only when explicitly opened, and append to a parent Roadmap's `roadmap-feedback.md` only when they meet P21's cross-child-impact rule. The report never cites `.implementation-runs/` paths because those resources are deleted after the durable outcome is synthesized.

Rationale: A single current-outcome document gives Finish and future readers the useful implementation explanation without preserving internal orchestration bureaucracy. Required outcome, changes, and verification make the handoff trustworthy even without Git history, while optional signal sections avoid empty ceremony. The trade-off is that intermediate implementation attempts disappear from the thread artifact, which is intentional under the better-thinking and conventions-first goals.

## P46: What's Next advises from evidence without reconstructing execution history

Point: How should `whats-next` advise the user when some normal operations—especially reconciliation—leave no success artifact proving they ran?

What you need to know: V3 deliberately avoids a ledger, approval latches, reconciliation receipts, and successful-review files. Therefore:

- `spec.md` proves that specification authoring occurred;
- `plan.md` proves that planning occurred;
- `.pending-reviews/` proves that a review found issues;
- the absence of a review bundle does not prove that a review ran;
- a reconciled artifact may be textually identical to its input, so the filesystem cannot prove reconciliation ran.

Trying to infer these operations from timestamps, Git history, or document content would be unreliable. Adding execution receipts would recreate the bookkeeping we removed.

Decision: `whats-next` is an evidence-based, read-only advisor rather than a derived-status reader. It answers what can be observed, what unresolved signals exist, and which next actions are plausible given the seed's suggested workflow. It does not claim to know the last operation executed and writes no files.

It reads:

- whether the thread is in the active tree or archive;
- `seed.md`, especially `## Suggested workflow`;
- `decisions.md`;
- existing canonical artifacts;
- Roadmap child briefs and materialization references;
- `.pending-decisions/` headers;
- `.pending-reviews/` headers;
- `.implementation-runs/`;
- `implementation-report.md`;
- current branch and working-tree state; and
- an optional user hint such as “I just reconciled the spec.”

Navigation prioritizes:

1. pending human intent relevant to downstream work;
2. explicitly resumable interrupted implementation runs;
3. known pending-review findings, presented as findings to address, dismiss, or supersede rather than automatic blockers;
4. comparison of observable artifacts with the complete suggested workflow stored in the seed; and
5. reasonable alternatives such as optional review, escalation from Quick to Standard, direct implementation, Finish, or archival.

When a suggested operation leaves no success evidence, advice is conditional. For example:

```text
Observed:
- spec.md exists.
- No plan.md exists.
- No pending decision or review bundles are present.

Suggested path:
spec → reconcile-spec → [review-spec] → plan-strict

Next:
- If reconcile-spec has not run, run it now.
- If it has already run, plan-strict is the next normal step.
- review-spec remains an optional second opinion before planning.
```

If the user states that an invisible operation already ran, `whats-next` uses that fact for the current answer without writing a completion marker.

A thread under the archive is terminal from the workflow's perspective. A thread in the active tree is merely unarchived; it may already have completed implementation and delivery. `whats-next` may say that an active thread appears ready for Finish or archival but does not label it mechanically complete.

For a Roadmap, it surfaces child briefs lacking materialization references, invalid child references, and feedback relevant to future children. It never aggregates child completion, and descendant feedback does not reactivate an archived Roadmap.

The response stays concise and signal-oriented:

```text
Observed:
...

Signals:
...

Recommended next:
...

Alternatives:
...
```

Empty sections are omitted, and at most two to four concrete actions are suggested.

Rationale: The original workflow suggestion remains useful for orientation even when actual work diverges, while durable artifacts and temporary queues provide honest evidence about outcomes and unresolved work. Conditional advice acknowledges the intentionally unobservable operations instead of inventing state or recreating receipts. The trade-off is that V3 cannot reconstruct an exact execution trace; any future CLI requiring that capability must make a separate product decision.

## P47: Pending decisions carry advisory follow-up, not an executable Resume contract

Point: How can `resolve-pending-decisions` resume an AFK operation if that operation is a user-invoked skill unavailable for model invocation?

What you need to know: Three accepted decisions currently conflict:

- P29 distinguishes user-invoked entry points from model-invoked primitives and forbids model-side invocation of user-only skills.
- P34 says `resolve-pending-decisions` invokes the bundle’s resumption operation once after settling its questions.
- P38 rejected `Address with: /implement` partly because `implement` may be user-invoked and therefore unavailable to the model.

The referenced Matt Pocock repository enforces this distinction:

- Claude uses `disable-model-invocation: true`;
- Codex uses `policy.allow_implicit_invocation: false` in `agents/openai.yaml`.

If V3 adopts equivalent enforcement, `Resume: /spec` or `Resume: /implement` may be impossible.

Decision: Use a modified self-contained-continuation approach that preserves interactive user choice. Pending-decision producers do not emit a `Resume:` header or a `## Resume` section, and `resolve-pending-decisions` does not automatically invoke the originating skill or execute a stored continuation contract.

The bundle retains `Target:` and adds a required natural-language paragraph titled `## Suggested action after resolving the decisions`. The producer writes this suggestion while it still understands the domain context. It describes a useful follow-up, such as applying the resulting decisions to `spec.md` and rechecking decision fidelity, but it remains advice rather than an executable command, workflow state, or promise that a named skill is model-callable.

The revised routing shape is conceptually:

```markdown
# Pending decisions: <bundle title>

Producer: /<skill-name>
Target: <thread-relative artifact or operation>
Created: <UTC>
Points: <count>
Summary: <one-line description>

## Suggested action after resolving the decisions

<self-contained advisory follow-up>

<canonical discussion points>
```

`resolve-pending-decisions` remains interactive. It:

1. selects one bundle and discusses its points one at a time;
2. appends each settled outcome to `decisions.md`;
3. removes settled points and deletes the exhausted bundle;
4. reassesses the producer's suggested action against the decisions just made and the current repository state;
5. offers the user its own recommended next action, which may adopt, refine, or reject the producer's suggestion; and
6. waits for the user's choice.

If the user accepts, the current agent performs the bounded application and recheck directly from the target, the new Decision Records, and the agreed action, without invoking another skill unless the user explicitly requests that skill. If the user prefers, they may instead invoke the relevant user-facing skill themselves. If they decline or defer the action, the resolver stops cleanly after recording the decisions.

An accepted direct continuation runs once. If it discovers genuinely new human intent, it may emit a new coherent pending-decision bundle and stop; it does not automatically open another discussion loop.

This decision supersedes P33's `Resume:` header and P34's automatic producer invocation. It preserves P34's goal of making the application handoff difficult to forget, but turns the handoff into a visible, meaningful interactive choice rather than hidden orchestration.

Rationale: The resolver already has the human present, so offering the next action is simpler and safer than encoding an executable continuation or assuming access to a user-invoked skill. The producer's advisory paragraph preserves valuable domain context, while the resolver's fresh recommendation accounts for the decisions actually made. The trade-off is one additional user response before application, accepted because it authorizes real target mutation rather than performing mechanical bookkeeping.

## P48: Enforce user invocation by default across Claude and Codex

Point: Should V3 technically prevent models from implicitly invoking user-facing workflow skills?

What you need to know: The distinction affects real behavior:

- A documented-only distinction leaves every skill available for automatic model routing.
- An enforced distinction means workflow steps run only when the user names them.
- Model-invoked primitives remain available both automatically and through explicit user invocation.

This axis is separate from interactive versus AFK posture. For example, `implement-plan` can be AFK-oriented while still being user-invoked: the user starts it, then it works autonomously.

Decision: Enforce invocation roles consistently across Claude and Codex, using user-invoked as the conservative default for essentially all skills. A skill becomes model-invoked only when V3 explicitly identifies it as a reusable primitive whose autonomous availability is valuable.

User-invoked entry points include all named workflow steps and deliberate standalone operations: thread opening, discussion, proposal and artifact authoring, planning, implementation, reconciliation, review, Roadmap materialization, pending-decision resolution, navigation, Finish, archival, and one-shot handoff or prompting skills.

Each user-invoked skill sets:

```yaml
disable-model-invocation: true
```

in `SKILL.md`, and carries the synchronized Codex policy in its local `agents/openai.yaml`:

```yaml
policy:
  allow_implicit_invocation: false
```

Its description is a concise human-facing summary rather than an automatic-routing trigger list.

Explicitly approved model-invoked primitives omit both restrictions. They remain reachable by either the model or the user, and retain model-facing descriptions with concrete routing triggers. `discussion-point` is the first confirmed primitive. Additional primitives are introduced only for demonstrated shared behavior, not to preemptively fragment every entry point.

Passive formats, examples, and role instructions remain reference files rather than invocable skills.

README and relevant group documentation distinguish user-invoked skills from model-invoked primitives. `AGENTS.md` documents the metadata pair and requires the Claude and Codex settings to remain synchronized; a skill must not be user-only in one harness while implicitly invocable in the other.

The cost is that users must remember or discover entry-point names rather than relying on automatic routing. V3 mitigates this through workflow documentation, the complete suggested workflow stored in every seed, `whats-next`, and the README's workflow-and-skill index.

Changing a user-invoked skill to model-invoked later is intentionally cheap: remove the two synchronized restrictions and rewrite its description for model routing when actual use demonstrates the need.

Rationale: Defaulting to explicit user invocation prevents agents from unexpectedly starting broad workflow operations, implementation, reviews, or repository delivery based on fuzzy natural-language matching. It also makes the user/model boundary that motivated P38 and P47 real rather than aspirational. The trade-off in discoverability is acceptable for the current sole-user experimental stage and reversible when experience supports broader implicit invocation.

## P49: Begin V3 with six bounded model-invoked primitives

Point: Which shared behaviors justify becoming model-invoked primitives in the first V3 implementation?

What you need to know: P48 defaults almost every skill to user invocation. A primitive should be an exception only when:

- at least two real callers need the behavior;
- keeping multiple copies would create drift;
- the behavior has a clear bounded contract;
- it never starts a broad workflow by itself;
- it refuses to act without caller-supplied scope and authorization.

A model-invoked primitive is technically available for automatic routing, so internal primitives must have narrow descriptions and strong preconditions.

Decision: V3 begins with exactly six explicitly justified model-invoked primitives. Additional primitives require demonstrated duplication rather than speculative fragmentation.

### `discussion-point`

Owns Point and What-you-need-to-know framing, creative options versus a practical proposed solution, recommendation discipline, one-point-at-a-time presentation, and the facts-versus-human-decisions distinction. Consumers include `discussion`, `resolve-pending-decisions`, and pending-decision production.

### `emit-pending-decisions`

Owns unique concurrent bundle allocation, the P33/P47 routing shape, canonical point formatting through `discussion-point`, the advisory `Suggested action after resolving the decisions`, and prevention of empty or non-human-decision bundles. Potential consumers include reconciliation, specification, planning, implementation, research, and Roadmap materialization.

The caller supplies producer, target, evidence, points, and suggested follow-up. The primitive does not determine whether a domain question genuinely requires human intent.

### `emit-pending-review`

Owns unique `.pending-reviews/` path allocation, P36's bundle and finding schema, local `F<N>` numbering, severity ordering, and no-file-on-clean behavior. Consumers are `review-spec`, `review-roadmap`, `review-implementation`, and `review-code`.

The caller owns finding validity, evidence, severity, and review-specific categories.

### `create-thread`

Owns normalized filesystem creation: allocate the thread folder, write `seed.md`, eagerly create `decisions.md`, copy the complete suggested workflow, and add supplied parent or external references. Consumers are `open-thread` and `materialize-roadmap-threads`.

Because thread creation is consequential, the primitive requires an explicit caller-authorization block naming the invoking user-facing operation and every normalized field. Without that contract, it refuses and directs the user to `open-thread`. It never interprets a rough idea or chooses a workflow itself.

### `update-implementation-report`

Owns P45's singleton report structure, merging a verified current outcome into the existing report, removing resolved or obsolete concerns, and preventing task transcripts or `.implementation-runs/` references from leaking into the durable report. Consumers are `implement`, `implement-plan`, and `implement-plan-with-subagents`.

The caller supplies verified changes, checks, deviations, concerns, and follow-ups. The primitive does not inspect code or decide whether implementation succeeded.

### `append-roadmap-feedback`

Owns selecting the next local `F<N>`, validating P21's feedback shape, appending without rewriting existing records, and enforcing the narrow descendant write boundary. Consumers include implementation operations working in Roadmap descendants.

The caller supplies the parent Roadmap reference, affected children or shared direction, evidence, impact, and recommendation. The primitive rejects local-only implementation notes that do not meet the cross-child-impact rule.

Code-review axes, implementation-fidelity axes, the strict-plan task format, subagent reviewer briefs, artifact examples, and workflow suggestion templates remain passive local reference material rather than skills.

Every primitive description begins with its bounded precondition. A primitive refuses incomplete direct routing rather than expanding itself into the user-facing workflow it supports. For example, `emit-pending-review` acts only after a reviewing caller supplies a target and already validated, evidenced, categorized findings.

Rationale: These six contracts already have multiple real consumers or protect a particularly error-prone shared side effect. Centralizing them realizes P29's function-like composition without exposing broad workflows to implicit invocation. Strict caller preconditions limit accidental autonomous use. The trade-off is a small internal skill surface and explicit dependencies, already accepted under P30 for the coherent-suite experimental stage.

## P50: Preserve current implementation and commit semantics

Point: Should V3 implementation skills continue auto-committing per task, or leave delivery commits to Finish?

What you need to know: All three current implementation skills auto-commit. That provides reliable checkpoints, especially for subagent review loops, but it does not match the common way you described working: thread artifacts and implementation may remain uncommitted until the end.

V3 now has:

- `.implementation-runs/` for recovery and internal progress;
- `implementation-report.md` for the durable outcome;
- Finish for explicit branch delivery and dirty-worktree commit authorization.

That means commits no longer need to carry workflow state merely to make the workflow understandable.

Decision: Preserve the current implementation execution and commit semantics rather than changing commit ownership in V3.

`implement`, `implement-plan`, and `implement-plan-with-subagents` continue auto-committing according to their existing per-task or per-cycle policies. Their current explicit Git-instruction override remains: a user may request a different cadence or no commits for a particular invocation, but the default behavior does not change.

In particular, retain `implement-plan-with-subagents`' current commit checkpoints, task-scoped implementation and merged review loop, fix iterations, subagent boundaries, and per-task orchestration semantics. These mechanics are working well and should not be redesigned as a side effect of the Project V3 thread-model migration.

V3 changes to the implementation skills are limited to what the accepted Project V3 decisions require, including:

- the shallow thread layout and root `plan.md` / `plan-tasks/` paths;
- `.implementation-runs/` replacing `.wip/` implementation state with invocation-scoped cleanup;
- the singleton current-outcome `implementation-report.md` and `update-implementation-report` primitive;
- `.pending-decisions/` and Roadmap feedback behavior;
- removal of tiers, ledger state, approval latches, V2 lineage assumptions, and obsolete freeze rules; and
- synchronized user-invocation metadata under P48.

Finish handles only changes that remain uncommitted after the implementation operation, such as thread artifacts or other explicitly scoped delivery work. It does not replace the implementation skills' normal commit behavior.

Rationale: The current implementation skills, especially the subagent topology, already provide useful and proven execution, review, recovery, and commit boundaries. Changing those mechanics would expand V3 from a thread and workflow redesign into an unrelated implementation-engine redesign. The trade-off is preserving automatic commit side effects and their existing dirty-worktree ceremony, accepted for now and cheap to revisit independently if practical use later motivates it.

## P51: Complete V3 skill migration inventory

Point: Which existing skills should be retained, renamed, retired, rewritten, or left functionally unchanged during the clean V3 cutover?

What you need to know: P14 rejects compatibility work and old-thread migration. That allows direct renames and retirement, but the implementation spec must remove any ambiguity about the final skill inventory.

Decision: Apply the following explicit migration map.

### Rename or promote

| Current skill | V3 skill | Action |
|---|---|---|
| `review-proposal` | `reconcile-proposal` | Rename and replace read-only review behavior with reconciliation. |
| `review-plan` | `reconcile-plan` | Rename while preserving and simplifying its corrective plan-adherence behavior. |
| `plan-loose` | `plan-brief` | Move out of `deprecated/`, rename, and implement P44's smaller contract. |

The old names do not remain as compatibility wrappers.

### Retire into `deprecated/`

| Skill | Reason |
|---|---|
| `seeded-discussion` | Replaced by `.pending-decisions/` and `resolve-pending-decisions`. |
| `record-verdict` | Approval and review-disposition latches no longer exist. |
| `review-lossless-mapping` | Succeeded by `reconcile-spec` under P37 and P39. |

These remain as historical retired skills on disk but disappear from active workflow documentation and active plugin groups.

### Add user-invoked skills

```text
plan-brief
reconcile-proposal
reconcile-spec
reconcile-plan
reconcile-roadmap
review-roadmap
roadmap
materialize-roadmap-threads
resolve-pending-decisions
```

`reconcile-proposal` and `reconcile-plan` arise from renames; the others are new capabilities.

### Add model-invoked primitives

```text
discussion-point
emit-pending-decisions
emit-pending-review
create-thread
update-implementation-report
append-roadmap-feedback
```

These live in `skills/workflow/primitives/` and follow P49's bounded-caller contracts.

### Deeply rewrite existing workflow skills

- `open-thread` delegates normalized creation to `create-thread`, creates the shallow seed and eager `decisions.md`, copies complete workflow suggestions, and removes tier and ledger behavior.
- `discussion` uses `discussion-point`, writes Decision Records to singleton `decisions.md`, and removes artifact-local logs.
- `propose` writes root `proposal.md` and removes versions, latches, lineage folders, and `.wip/` behavior.
- `spec` writes root `spec.md`, removes versions, approval state, lineage folders, and artifact-local reviews, and uses the pending-decision primitive when necessary.
- `plan-strict` writes root `plan.md` plus `plan-tasks/` and removes lineage, tier, and `.wip/` rules.
- `implement`, `implement-plan`, and `implement-plan-with-subagents` preserve P50's execution and commit semantics while migrating paths, reports, pending decisions, invocation metadata, and Roadmap feedback.
- `review-spec`, `review-implementation`, and `review-code` become strictly read-only, use `.pending-reviews/` through `emit-pending-review`, and emit nothing on a clean result.
- `merge-artifacts` accepts explicit candidate paths without requiring a standard draft folder, writes the applicable root artifact and singleton decision log, and removes V2 freeze, lineage, and status assumptions.
- `finish` implements P42's advisory delivery handoff.
- `whats-next` implements P46's evidence-based navigation.
- `archive-thread` archives by explicit user intent rather than requiring a closed ledger, removes ledger and latch checks, and follows the separate archival-link decision when available.

### Retain with small or metadata-only changes

- `open-ticket` retains its explicit tracker-creation purpose, aligns wording with P27's passive `External:` semantics, and receives user-invocation metadata.
- `afk-exploration`, `the-librarian`, `take-snapshot`, `brief-the-recipient`, `consult-the-expert`, `report-to-the-owner`, and `meta-prompting` preserve their functional behavior unless a direct V3 contradiction is discovered, receive synchronized user-invocation metadata, and use concise human-facing descriptions.

### Group layout

```text
skills/workflow/
├── capture-discussion/
├── propose/
├── spec/
├── plan/
├── roadmap/
├── reconcile/
├── implement/
├── review/
├── primitives/
├── merge/
├── finish-navigate/
├── research/
├── documentation/
├── handoff/
└── support/
```

Add marketplace entries for `roadmap`, `reconcile`, and `primitives`, respecting alphabetical plugin order.

Repository-wide derived updates include `AGENTS.md`, root `README.md`, `.claude-plugin/marketplace.json`, `.vscode/settings.json` scopes, `.gitignore`, Project V3 documentation, workflow-suggestion references, and Raycast output through its existing generator rather than manual manifest edits.

No V1/V2 documentation or old thread artifacts are modified.

Rationale: An explicit inventory prevents a junior implementer from preserving obsolete aliases, overlooking hidden V2 assumptions, or redesigning unrelated standalone skills. Direct renames retain repository history without compatibility baggage, retirement preserves experimental provenance, and new groups make Roadmap, reconciliation, and primitives discoverable as distinct capability families. The trade-off is a broad coordinated migration across documentation and distribution metadata, accepted under P14's clean-cutover strategy.

## P52: Archive link repair is explicitly deferred

Point: Should the V3 specification wait for the separate archival-link decision, or proceed while treating it as an explicit implementation prerequisite?

What you need to know: V3 already decides that:

- archive location is the only terminal lifecycle signal;
- archived threads are normally historical;
- Roadmap descendants may still append narrowly scoped feedback;
- parent and child threads carry cross-thread references;
- materialization adds child references to `roadmap.md`.

Moving a thread can therefore affect:

- parent-to-child Roadmap links;
- child-to-parent links;
- cross-thread Decision Record references;
- external backlinks;
- archived Roadmap feedback writes.

Defining that behavior casually inside this discussion would duplicate the dedicated thread and risk conflicting decisions.

Decision: Explicitly defer all archival-link repair or rewrite behavior to a future dedicated thread already recorded in the owner's backlog. Project V3 does not wait for that discussion, treat it as an implementation prerequisite, reserve a partial archive task for it, or guess a temporary link-rewrite strategy.

`archive-thread` may perform V3's simple location-based archival without attempting to preserve, discover, or rewrite every cross-thread reference. Parent, child, Decision Record, external, or other references may therefore break when a referenced thread moves into the archive. This is a known and accepted V3 limitation.

The V3 specification names the limitation only so an implementer does not accidentally expand scope to solve it. It contains no archival-link acceptance criteria beyond not pretending the problem has been handled. A future thread owns the complete behavior and may revise `archive-thread`, reference syntax, or both.

Rationale: Archival-link integrity has its own backlog item and is not necessary to validate the core V3 workflow redesign. Treating it as a dependency would delay a specification that is otherwise ready, while implementing a guessed partial solution would create conflicting behavior. The trade-off is knowingly allowing broken links after archival until the dedicated future work is completed.

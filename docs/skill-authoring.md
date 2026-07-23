# Skill authoring

This document defines the cross-skill conventions every skill in this suite follows: interaction posture, terminal outcomes, composition, invocation-role metadata, when a capability earns its own skill, naming, how reconciliation differs from review, section headings, progressive disclosure, the filesystem-deletion rule, and the shared-reference authoring rule. Each skill remains a self-contained instruction set; these are the rules that keep the suite coherent.

## Interaction posture

Interaction posture is an authoring principle, not a runtime schema. Skills carry no `interaction:` frontmatter field and no mandatory interaction-mode section. A skill's normal posture is inferred from its purpose, description, and operating instructions; only behavior that would otherwise be surprising warrants an explicit per-skill interaction rule. The central question is whether obtaining new human input is part of the skill's normal job or an exceptional blocker — sending a result through chat does not by itself make a skill interactive.

Three natural postures exist:

- **Dialogue-driven** skills, such as discussion and the `open-thread` and `archive-thread` thread handshakes, exist to obtain human input and settle decisions. Questions are expected output, multiple turns are normal, and needing another response is not failure.
- **Completion-oriented** skills — specification, planning, artifact reviews and reconciliations, implementation, reporting — consume supplied and durable inputs and produce an outcome without ongoing conversation. They finish autonomously whenever safely possible. Asking is exceptional and justified only when the inputs are insufficient and proceeding would invent intent, exceed authority, or choose outside a granted freedom. A completion-oriented skill remains completion-oriented even when it occasionally discovers a missing human decision.
- **One-shot deliverable** skills consume an input and return a finished message or handoff. Reading, copying, or forwarding the result afterward does not turn the operation into a dialogue; their shape is input → finished message.

Completion-oriented skills carry no attended-ask branch and do not detect whether a person or a tool invoked them: their behavior is identical either way. Every such skill runs a mandatory preflight before any substantive execution — it resolves which thread and target it operates on and validates its invocation input, its required artifacts, and the tooling, credentials, and safety gates the run depends on. Any failure caught at that stage — a missing or ambiguous thread or target, a malformed or garbled invocation, a trivial request repair, an ambiguous artifact or review reference, unclear tracker ownership, an unmet prerequisite, missing tooling or credentials, or a dirty worktree without valid advance authorization — writes no workflow artifact and ends the run `REFUSED` with a precise instruction for how to re-invoke or remediate. A preflight refusal is never a pending decision: because the run never started, the machine-readable terminal outcome carries the whole state and no bundle is emitted.

Advance authorization to work in a dirty worktree is usable only when it acknowledges that the existing changes will be preserved and may enter implementation commits; a bare instruction to ignore the dirty tree does not satisfy the gate, and the preflight still refuses.

Once substantive execution has begun, two paths stop the run and both end `BLOCKED`. Missing human intent discovered during the work — a genuine product or workflow decision the run cannot safely derive — is queued through `/emit-pending-decisions` to the thread's `.pending-decisions/` after the skill finishes everything else safely derivable; the skill then returns a concise terminal notification and stops, never asking in chat and never inventing the answer. An unfixable operational defect — a failure the run cannot repair on its own — ends the run with a diagnosis and no decision bundle. If the user happens to be present they invoke the resolve operation in the same chat right after a decision-bundle notification; otherwise the bundle waits and is resolved later.

Clarification versus decision is distinguished at resolution time, not at emission time: the operation that resolves a bundle records genuine new intent as a decision, while an answer that merely clarifies which input was meant settles the point without being recorded. Dialogue-driven skills, by contrast, keep asking as their normal output, and one-shot deliverable skills are unchanged — they return their finished message directly.

## Terminal outcome

Every completion-oriented user-invoked entry point ends its final chat message with exactly one line:

```text
Outcome: <TOKEN> — <one-line reason or pointer>
```

The vocabulary is closed to three tokens; no other token exists:

- `DONE` — the skill completed its requested job, including when it completed with non-blocking concerns. A review that emitted a findings bundle is DONE.
- `BLOCKED` — substantive execution started and then stopped: it queued missing human intent in `.pending-decisions/`, or it hit an unfixable operational defect.
- `REFUSED` — preflight prevented the run from starting: an unresolved thread or target, an unmet precondition, a failed safety gate, or any other invocation-input failure caught before substantive execution.

The line composes with the skill's exact confirmation message — the confirmation becomes the reason part, for example `Outcome: DONE — Spec written: spec.md`.

The name is fixed. This protocol — the three-token vocabulary and the closing line together — is called the **terminal outcome** everywhere it is mentioned: in skill bodies, workflow documents, and reports alike. It is never renamed to run status, workflow status, completion status, or any other status phrase; prose that needs to name the closing line itself calls it the terminal outcome line. The term always refers to a *run's* end state — a completed *thread's* lasting artifact is its **final deliverable**, a different concept with its own name.

The standard applies to completion-oriented entry points only. Dialogue-driven skills have no terminal outcome; one-shot deliverable skills return the deliverable unframed and add no outcome line; and primitives never emit it, because the calling skill owns the run's terminal message.

That absence is enforced by authoring silence, never by runtime prohibition. A skill that emits no terminal outcome does not mention the protocol, the line, or the tokens in its body — not even to forbid them — and does not label its own interaction posture: an agent that is never told the vocabulary exists cannot emit it, while a negation ("emit no outcome line") would only teach it the concept, and asking or delivering is already an agent's default behavior needing no classification. What a body spells out is the completion-oriented behavior where it applies, never its absence elsewhere.

## Internal progress and local return contracts

The three-token terminal outcome is the only project-wide status protocol. A single agent executing sequential internal tasks has no caller at each task boundary, so it defines no formal per-task status vocabulary: its internal progress is recorded as factual prose or ordinary structured fields — the task attempted, the changes made, the verification performed, any concerns, the commit, and the next action — in its progress file and implementation report, never as formal status tokens. Such a run still ends `DONE` when the requested operation completed, even with non-blocking concerns, `BLOCKED` when substantive execution started but could not finish, and `REFUSED` when preflight prevented execution.

A skill defines skill-local return tokens only where its own caller/callee topology genuinely consumes them — as when an orchestrator dispatches subagents and must quickly classify each untrusted reply. Those return contracts stay inside the owning skill: they are not promoted into these canonical conventions and are not restated as a second project-wide status protocol. Their generic name is fixed as well: prose calls them **skill-local return tokens** — a skill may name each role more narrowly inside its own body (a reply token, a lane verdict) — and never calls them statuses or outcomes; a return token never appears in a terminal outcome.

## Composition

Skills compose one way only. A user-invoked entry point may invoke a model-invoked primitive; a primitive never invokes an entry point; and dependency cycles are forbidden. Dependencies are named explicitly in prose as `/skill-name` invocations, never as deep cross-folder Markdown imports. A caller retains ownership of its domain-specific inputs, paths, side effects, concurrency, and completion criteria; a primitive owns one bounded, reusable behavioral discipline.

A skill never reads another skill's `references/`. Invocation through `/skill-name` is the only permitted cross-skill coupling. Reading another skill's references reaches into its internals and couples the reader to another folder's layout; that boundary is absolute, and any shared passive material a skill needs lives in its own folder (see the shared-reference rule below).

The suite is authored and used as one coherently installed set. A skill assumes every dependency it names is present; a missing invoked skill is an installation error, not a branch the caller compensates for. No skill builds dependency detection, inline fallback, or a duplicated standalone implementation to cover an absent dependency.

## Invocation-role metadata

Two roles carry explicit metadata:

- **User-invoked entry points** own a complete user-visible operation. Each sets `disable-model-invocation: true` in `SKILL.md` and carries the synchronized policy `allow_implicit_invocation: false` under `policy:` in its local `agents/openai.yaml`. Its description is a concise human-facing summary rather than an automatic-routing trigger list.
- **Model-invoked primitives** omit both role restrictions — the `disable-model-invocation` key and the `policy` block — remaining reachable by either the model or the user, and open their descriptions with the bounded caller precondition that must hold before the primitive acts.

The Claude and Codex settings must always agree: a skill is never user-only in one harness while implicitly invocable in the other. Changing a skill's role later means changing the pair together — for a promotion to a primitive, removing both restrictions and rewriting the description for model routing.

Every active skill — both roles — ships an `agents/openai.yaml` carrying an `interface:` block of picker metadata for Codex-style harnesses: `display_name` (the skill's name in title case) and `short_description` (a terse 4–7-word picker line). The `short_description` is deliberately not a copy of the `SKILL.md` `description`: a primitive's description is a routing gate written for the model, the wrong register for a human picker. Entry points carry `policy.allow_implicit_invocation: false` beneath the interface block; primitives carry the interface block alone. The interface block is universal — its presence never encodes the role — while the `policy` block is what encodes the role, in lockstep with `disable-model-invocation`.

## When a primitive is extracted

A primitive is the exception, not the default. Extract one only when the behavior has at least two real consumers, or when it protects a particularly error-prone shared side effect that must be centralized to prevent drift. A primitive has a clear bounded contract, never starts a broad workflow by itself, and refuses to act without caller-supplied scope and authorization. The suite is not fragmented preemptively into micro-skills; speculative extraction that anticipates a second consumer instead of observing one is not justified.

The razor that decides whether reused material becomes a shared reference or a primitive turns on format versus discipline. A reused **format** — passive material that constrains what an acting skill writes, such as a record shape or a point structure — lives as a shared reference under `shared/references/` declared in the manifest, never as a callable skill; a reference needs no verb because it performs no side effect. A reused side-effecting **discipline** — the edge cases, refusals, and invariants that must execute identically regardless of which caller drives them — is a model-invoked primitive. The razor must not creep: the five behavioral primitives — `allocate-thread`, `emit-pending-decisions`, `emit-pending-review`, `update-implementation-report`, and `append-roadmap-feedback` — own genuine side-effecting disciplines and stay skills.

## When a capability earns a separate skill

A new user-invoked skill is created only when an operation's purpose, durable output, or execution contract materially differs from an existing skill — not merely because the same operation appears in another workflow. Shared capabilities keep workflow-neutral names and behavior and are reused across workflows through documentation, never duplicated into workflow-prefixed variants. Capability-oriented names that describe the produced artifact are preferred over workflow-prefixed names, because they remain reusable by future workflows. A materially distinct output contract — a different durable artifact or a different set of side effects — is what warrants a separate skill.

## Naming

A primitive's name is verb-first, the verb naming the bounded side effect it performs on behalf of a caller — `allocate-thread`, `emit-pending-decisions`, `update-implementation-report` — so the name reads as a mechanical building block rather than a user-facing capability. An entry point's name uses the user's intent language: the words a person reaches for when deliberately invoking the operation. Keeping the two registers distinct is what stops a primitive from being mistaken for the entry point it composes into.

## Reconciliation versus review

Every skill has one predetermined mutation contract; the user never chooses a behavior variant at invocation time, and no skill offers report-only, queue-only, or auto-fix mode switches.

- **Reconciliation** operations inspect a workflow artifact and are authorized to edit their declared target when a correction follows from authoritative existing decisions. They recheck supported repairs and route irreducible human intent into coherent `.pending-decisions/` bundles. They never modify their authority source to make the target appear consistent; a source fault becomes a pending human decision, and they produce no review report.
- **Review** operations inspect delivered work read-only and produce an independent assessment. They never edit the reviewed target and never silently turn the invocation into a repair pass. Their sole output is a findings bundle under `.pending-reviews/` when issues are found, and a concise pass in chat when clean.

Naming makes the category clear: a `reconcile-*` skill mutates its target from decisions, and a `review-*` skill assesses delivered work without touching it.

## No legacy awareness

A skill states its expected inputs and the thread structure it works with precisely, and contains no recognition logic for — and no mention of — superseded or foreign thread layouts. An input that does not match the skill's stated contract is the same situation as pointing the skill at any unrelated file: the agent notices the mismatch through ordinary judgment and raises it as an ordinary input ambiguity — handled per the skill's interaction posture, not through a special-case rule or by half-adapting to an unfamiliar shape. The safeguard is the precision of each skill's stated input contract, not layout recognition.

## Section headings

When a skill has an end-to-end execution sequence, it lives under a single heading, `## Procedure`. This is a naming rule, not a presence mandate: an all-reference skill whose behavior is fully carried by its format and guideline sections (the one-shot deliverable skills, for example) carries no `## Procedure` section at all rather than a ritual read-draft-output sequence. `## Workflow` is never used as a section heading: the word names the thread-level workflow-model concept — the published workflows and their templates — and reusing it for a section heading would make prose cross-references and grepping ambiguous. Artifact-format headings that belong to an emitted artifact, such as the `**Steps:**` field inside a plan task brief, are not section headings and are untouched by this rule.

## Progressive disclosure

A `SKILL.md` body is loaded whole on every invocation, while a file under `references/` is read only on demand. Two conventions keep the common path lean without hiding rules.

A conditional block moves out of the body into a reference when both conditions hold: (a) it executes only under a condition most runs do not meet — genuinely rare, not merely "optional" — and (b) it is substantial enough that inlining it costs real context, more than a couple of sentences. Main-path content and short conditionals stay inline, with one structural exception: a large main-path block — an artifact template on the order of a hundred lines, say — may move to its own reference even though every run consumes it, when leaving it inline would bury the `## Procedure` steps deep in the body; the consuming step then points at it and the read simply happens at that step. When a block does move, its trigger condition stays in the body, because it must be evaluated on every run, and the pointer to the reference is naturally worded prose — flowing instructions, never a mechanical "IF X READ Y" construction; only the what-to-do moves out. The pointer always cites the reference file's full skill-relative path (e.g. `references/formats/discussion-point.md`) — never a filename plus a folder description, and never a bare folder. A block reused by several skills lives in `shared/references/`; a block unique to one skill lives in that skill's own `references/`.

A worked example always lives in `references/` — shared only when more than one skill reuses it — and the step that consumes it points at it in natural prose, citing its full skill-relative path, from the place where the imitation happens. A worked example never carries a rule that exists nowhere else: anything normative stated only inside an example is hoisted into the body first, so the body stays the complete set of rules and the example stays purely illustrative.

## Filesystem deletion

A skill never carries an instruction that deletes, empties, or erases user filesystem content unless the user explicitly asks for it. The sole exception is pending-queue consumption: removing a settled point or an exhausted bundle from a pending folder is how that communication completes, so the operation that resolves the queue performs it. Everywhere else a runtime body stays silent about deletion in both directions — it carries neither a "never delete" clause nor a "you may delete" clause — because even mentioning deletion authority can prime a long-running agent to erase the wrong thing. Where a body needs to state that a workspace stays behind, it says so in a single positively-framed sentence — the directory remains in place as the run's operational trace — worded without any delete or remove token.

## Shared references

Some passive reference material is genuinely shared by more than one skill. Because a skill never reads another skill's `references/`, each declaring skill ships its own physical copy — but those copies are generated, not hand-authored twice.

- Canonical shared files live once under `shared/references/` at the repository root.
- `shared/manifest.yaml` maps each declaring skill's path to the list of shared files it needs. The manifest is a deliberately restricted flat map of skill path to string list, so a dependency-free parser suffices.
- A sync script mirrors each canonical file to the same relative path under the declaring skill's `references/` folder. It owns exactly the files the manifest names: on every run it deletes and rewrites precisely those, so their content stays in lockstep with the canonical source while hand-authored skill-local references sitting alongside them are left untouched. Its deletion authority is confined to files under a skill's `references/` folder that the manifest declares. Removing a manifest entry leaves its previously generated copy behind as an orphan to delete by hand.

The generated copies under `references/` are committed and flow into distribution unchanged, keeping every installed skill self-contained. They are never hand-edited: to change shared material, edit the canonical file under `shared/references/` and re-run the sync script.

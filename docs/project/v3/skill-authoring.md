# Skill authoring

This document defines the cross-skill conventions every Project V3 skill follows: interaction posture, composition, invocation-role metadata, when a capability earns its own skill, how reconciliation differs from review, and the shared-reference authoring rule. Each skill remains a self-contained instruction set; these are the rules that keep the suite coherent.

## Interaction posture

Interaction posture is an authoring principle, not a runtime schema. Skills carry no `interaction:` frontmatter field and no mandatory interaction-mode section. A skill's normal posture is inferred from its purpose, description, and operating instructions; only behavior that would otherwise be surprising warrants an explicit per-skill interaction rule. The central question is whether obtaining new human input is part of the skill's normal job or an exceptional blocker — sending a result through chat does not by itself make a skill interactive.

Three natural postures exist:

- **Dialogue-driven** skills, such as discussion, exist to obtain human input and settle decisions. Questions are expected output, multiple turns are normal, and needing another response is not failure.
- **Completion-oriented** skills — specification, planning, artifact reviews and reconciliations, implementation, reporting — consume supplied and durable inputs and produce an outcome without ongoing conversation. They finish autonomously whenever safely possible. Asking is exceptional and justified only when the inputs are insufficient and proceeding would invent intent, exceed authority, or choose outside a granted freedom. A completion-oriented skill remains completion-oriented even when it occasionally discovers a missing human decision.
- **One-shot deliverable** skills consume an input and return a finished message or handoff. Reading, copying, or forwarding the result afterward does not turn the operation into a dialogue; their shape is input → finished message.

An explicit AFK invocation — "run AFK," "do not ask questions," "finish without me" — overrides the normal posture: the skill must not wait for input. A completion-oriented skill has an obligation that follows from this: when it is blocked under an AFK invocation on genuinely indispensable human judgment, a repository-writing operation emits a pending-decision bundle to the thread's `.pending-decisions/` and returns a concise terminal notification, rather than asking a question in chat or inventing the answer. A one-shot chat deliverable under an AFK invocation simply returns its result and needs no repository handoff. Whenever a skill does obtain a new human decision — attended or through a resolved bundle — it records that decision before acting on it.

## Composition

Skills compose one way only. A user-invoked entry point may invoke a model-invoked primitive; a primitive never invokes an entry point; and dependency cycles are forbidden. Dependencies are named explicitly in prose as `/skill-name` invocations, never as deep cross-folder Markdown imports. A caller retains ownership of its domain-specific inputs, paths, side effects, concurrency, and completion criteria; a primitive owns one bounded, reusable behavioral discipline.

A skill never reads another skill's `references/`. Invocation through `/skill-name` is the only permitted cross-skill coupling. Reading another skill's references reaches into its internals and couples the reader to another folder's layout; that boundary is absolute, and any shared passive material a skill needs lives in its own folder (see the shared-reference rule below).

The suite is authored and used as one coherently installed set. A skill assumes every dependency it names is present; a missing invoked skill is an installation error, not a branch the caller compensates for. No skill builds dependency detection, inline fallback, or a duplicated standalone implementation to cover an absent dependency.

## Invocation-role metadata

Two roles carry explicit metadata:

- **User-invoked entry points** own a complete user-visible operation. Each sets `disable-model-invocation: true` in `SKILL.md` and carries the synchronized policy `allow_implicit_invocation: false` under `policy:` in its local `agents/openai.yaml`. Its description is a concise human-facing summary rather than an automatic-routing trigger list.
- **Model-invoked primitives** omit both restrictions, remaining reachable by either the model or the user, and open their descriptions with the bounded caller precondition that must hold before the primitive acts.

The Claude and Codex settings must always agree: a skill is never user-only in one harness while implicitly invocable in the other. Changing a skill's role later means changing the pair together — for a promotion to a primitive, removing both restrictions and rewriting the description for model routing.

## When a primitive is extracted

A primitive is the exception, not the default. Extract one only when the behavior has at least two real consumers, or when it protects a particularly error-prone shared side effect that must be centralized to prevent drift. A primitive has a clear bounded contract, never starts a broad workflow by itself, and refuses to act without caller-supplied scope and authorization. The suite is not fragmented preemptively into micro-skills; speculative extraction that anticipates a second consumer instead of observing one is not justified.

## When a capability earns a separate skill

A new user-invoked skill is created only when an operation's purpose, durable output, or execution contract materially differs from an existing skill — not merely because the same operation appears in another workflow. Shared capabilities keep workflow-neutral names and behavior and are reused across workflows through documentation, never duplicated into workflow-prefixed variants. Capability-oriented names that describe the produced artifact are preferred over workflow-prefixed names, because they remain reusable by future workflows. A materially distinct output contract — a different durable artifact or a different set of side effects — is what warrants a separate skill.

## Reconciliation versus review

Every skill has one predetermined mutation contract; the user never chooses a behavior variant at invocation time, and no skill offers report-only, queue-only, or auto-fix mode switches.

- **Reconciliation** operations inspect a workflow artifact and are authorized to edit their declared target when a correction follows from authoritative existing decisions. They recheck supported repairs and route irreducible human intent into coherent `.pending-decisions/` bundles. They never modify their authority source to make the target appear consistent; a source fault becomes a pending human decision, and they produce no review report.
- **Review** operations inspect delivered work read-only and produce an independent assessment. They never edit the reviewed target and never silently turn the invocation into a repair pass. Their sole output is a findings bundle under `.pending-reviews/` when issues are found, and a concise pass in chat when clean.

Naming makes the category clear: a `reconcile-*` skill mutates its target from decisions, and a `review-*` skill assesses delivered work without touching it.

## No legacy awareness

A skill states its expected inputs and the thread structure it works with precisely, and contains no recognition logic for — and no mention of — superseded or foreign thread layouts. An input that does not match the skill's stated contract is the same situation as pointing the skill at any unrelated file: the agent notices the mismatch through ordinary judgment and asks the user for clarification, rather than following a special-case rule or half-adapting to an unfamiliar shape. The safeguard is the precision of each skill's stated input contract, not layout recognition.

## Shared references

Some passive reference material is genuinely shared by more than one skill. Because a skill never reads another skill's `references/`, each declaring skill ships its own physical copy — but those copies are generated, not hand-authored twice.

- Canonical shared files live once under `shared/references/` at the repository root.
- `shared/manifest.yaml` maps each declaring skill's path to the list of shared files it needs. The manifest is a deliberately restricted flat map of skill path to string list, so a dependency-free parser suffices.
- A sync script copies each canonical file into `references/shared/` inside each declaring skill, wiping and re-creating that folder on every run so stale copies disappear mechanically. Its deletion authority is confined to the generated `references/shared/` folder.

The generated copies under `references/shared/` are committed and flow into distribution unchanged, keeping every installed skill self-contained. They are never hand-edited: to change shared material, edit the canonical file under `shared/references/` and re-run the sync script.

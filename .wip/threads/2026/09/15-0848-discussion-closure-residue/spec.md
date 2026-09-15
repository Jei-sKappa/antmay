# Spec: Discussion closes on real forks and the spec carries the inferences

## Intended outcome

The `discussion` skill presents the user only real forks, with no limit on their number, and when none remains it closes with one substantive step: it says it sees no more real forks, lists every point it is holding back as a labelled bullet, and asks whether any should be promoted to a fork or the discussion can stop. Those points are not written to the log. The `spec` skill writes the spec fully with such points settled, marks each one inline where it is used, and lists all of them as bullets in a dedicated `## Inferences` section present in every spec. The two skills share the concept and its name, **inference**, and neither names the other. The `review-spec` skill treats an inference that is really a fork as a finding. The shared log-line format states the `assumption` type in the fixed vocabulary's terms. The generic "shall we keep going or finish here?" prompt leaves the discussion skill.

## Context

Reviewing the open issues against the redesigned suite found two with one root. In one, an agent ended a discussion by declaring a list of details "mechanical" and leaving them for the specification, which then made choices nobody had recorded. In the other, agents interrupt a discussion with a generic continue-or-finish prompt, either abandoning undecided points or asking whether to continue when nothing is left. The discussion in this thread settled that both are the closure step of the discussion skill, and that the material the discussion holds back must have a name and a visible home in the spec. `seed.md` holds the origin; `log.md` holds the eleven settled points; the thread's `glossary.md` fixes the four terms this work introduces or tightens.

The suite's own vocabulary was the obstacle: the log's `assumption` type, the points the discussion agent holds back, the spec's inline audit label, the spec's degrees of freedom, and the report's deviations all leaned on the word "assumption" or on definitions that overlapped. The thread's glossary delta resolves that into six terms with one meaning each, and this spec uses them: **decision** and **assumption** are user-settled log types; an **inference** is agent-settled and spec-pinned; a **degree of freedom** is a *how* the spec grants; a **judgment call** is an implementer's pick where the spec pins nothing; a **deviation** is an implementer's departure from something pinned, intent preserved.

## Scope

In scope, all under `suite/`:

- `skills/capture-discussion/discussion/SKILL.md` — the fork test, the closure step, the binding-test clause, and the removal of the generic continue-or-finish prompt.
- `skills/spec/spec/SKILL.md` — the inference as a third legal move of lossless authoring, the `## Inferences` obligation, the inline label, and the audit pass wording.
- `skills/review/review-spec/SKILL.md` — one readiness axis and one category for inferences.
- `shared/references/formats/log-line.md` — the `assumption` type's definition, then the sync into every skill that declares the file.
- The mechanical checks: `scripts/sync-shared-references.mjs`, `scripts/check-skill-text.mjs`, `scripts/check-marketplace-skills.mjs` all pass after the change.

Out of scope:

- `docs/glossary.md`. The thread's `glossary.md` merges into it when the thread closes; the implementation does not write it.
- `shared/references/formats/discussion-point.md`. The closure list is not a discussion point; it is the moment after the last one. *(Inference: the format is untouched because nothing in it describes closure.)*
- `skills/capture-discussion/resolve-pending-decisions/SKILL.md`. It works through a bundle's points and has no closure step to change; it receives the tightened `assumption` wording through the sync only.
- The implementation report format and the implement skills. The discussion left as a question, outside this thread, whether an implementer's judgment call belongs in the report's deviations section.
- `README.md`. What each skill expects and leaves behind does not change: the discussion still leaves log lines, drafts, and glossary entries; the spec still leaves `spec.md` and one event line.
- The CLI under `cli/`.

## Expected behavior

### The discussion skill

**Real forks only.** The body carries, as its own rule, the test that decides whether a point is a fork or an inference. A point is a **fork** when reasonable people could settle it differently and the answer would change what a reviewer checks or what the user experiences. A point is an **inference** when it follows from the settled points or has one plainly sensible answer, or when every admissible answer satisfies the settled points equally and the choice belongs to the implementer. Forks are presented one at a time, as they emerge, in the discussion-point format, with no limit on how many a discussion may raise. Inferences are held back. *(Inference: the test is worded as this three-way sort, mirroring the spec's eligibility bar for degrees of freedom, so both skills classify the same way.)*

**No generic continue prompt.** The discussion works through the forks it has identified without asking whether to continue. The only closure question is the one below, asked once, when the agent judges that no real fork remains.

**The closure step.** When the agent sees no more real forks, it says so and presents the points it is holding back as a bullet list. Each bullet carries one label: either the answer the agent would settle it with, or that the choice is best left to the implementer. The list is everything the agent holds back at that moment and never a sample; it is not an attempt to enumerate every inference a spec will contain, and the body says so in one sentence so the agent does not stall trying to be exhaustive. The message states that these answers are non-binding and that a point whose specific answer matters to the user is a fork to promote now. It then asks whether any bullet should be promoted or the discussion can stop. A promoted bullet is presented as a fork in the discussion-point format and settled as any other; the rest stay unlogged. The message names no next skill and does not hand off; the list itself says where the material goes.

**No log line for an inference.** The user's acceptance of the list means "this is not a fork", not agreement with the answer, so an inference is not a settled point and the discussion appends nothing for it. What the discussion writes stays exactly what it writes today: log lines for settled points, draft ADRs, and glossary entries.

**Binding test.** The body states in one clause that an inference never becomes an ADR: only a settled point is tested.

**Finish.** The Finish section keeps its current content. *(Inference: the Finish list already covers what settled, the drafts, the deferred branches, and the pointers; the closure step precedes it and adds nothing to report.)*

### The spec skill

**Third legal move.** Lossless authoring gains a third move beside marking a degree of freedom and queuing a decision: **pin it as an inference** when the specific follows from the settled points or has one plainly sensible answer. The bar on the first move and the routing of the second are unchanged. The order in which the three are tried is the spec author's judgment, guided by the same three-way test the discussion uses. The rule that a new decision the user never saw is forbidden stands; an inference is by definition not one, because either any reader would reach it from the settled material or the user was shown it and let it pass.

**The `## Inferences` obligation.** Every spec carries a `## Inferences` section, beside `## Degrees of freedom`, listing every inference as one bullet naming the inference and the passage it shapes. When there are none, the section says so explicitly rather than being omitted. The section carries both the inferences the discussion listed at closure and the ones the spec agent finds while writing, undistinguished; the latter normally outnumber the former, and on a fresh-session run all of them are the latter.

**Inline label.** Each inference is also marked inline at the point where the spec uses it, so a reader of that passage knows it was not user-settled. The label's exact form is a degree of freedom below.

**Audit pass.** The second direction of the audit labels an unsupported claim as an **inference** or as an **open question**; the word "assumption" leaves the audit pass, since inside the suite it now names a user-settled log type. Everything else in the pass is unchanged: never delete, never leave standing as settled, an open question blocks.

**Amendment pass.** Unchanged in rule. An inference later settled by the user is a passage the new material affects and is amended in place like any other, including its bullet in the section.

### The review-spec skill

**One axis.** The readiness axes gain **Inferences**: every item in the `## Inferences` section is really an inference, not a fork the spec settled on its own. An item that fails the fork test is a finding, tethered to downstream impact as every finding is. The category vocabulary gains `inference`.

### The log-line format

The `assumption` type's definition reads in the terms the thread's glossary fixes: something the user and the agent take as true without confirmation, which later work may need to revisit. The example line stays. The seven-type vocabulary is unchanged; no type is added or removed. After the edit the sync script runs, so `discussion`, `resolve-pending-decisions`, and `spec` carry the identical copy.

## Constraints

- **Authoring conventions bind every edit.** The bodies follow `suite/authoring/body-structure.md`: the fork test is written as the skill's own rule and not as a pointer to another skill's file; every skill-local pointer carries the `<skill_path>/` prefix; `per` never precedes a path; no body restates what a pointed file holds; the `## Inputs` shape is untouched.
- **No skill names another skill's role.** The discussion body does not mention `spec`, and the spec body does not mention `discussion`. The coupling is the shared term and its definition.
- **No repository leakage.** Issue numbers, thread paths, and this repository's organisation do not appear in any skill body or shared reference.
- **Every negative sentence passes the dead-concept test.** A sentence that only makes sense against the removed continue-or-finish prompt is not written; the positive rule replaces it.
- **The log vocabulary stays closed at seven types.** Inferences get no type, and no line is appended for one.
- **Generated copies are never hand-edited.** `formats/log-line.md` changes at its canonical path and is synced by `node scripts/sync-shared-references.mjs` run from `suite/`.
- **The text check passes.** `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs` run from `suite/` exit 0 after the change.
- **Nothing is committed.** The change lands on the working tree only.

## Inferences

- The three-way fork test is the wording both skills classify with, mirroring the spec's existing eligibility bar for degrees of freedom. Shapes the discussion's fork rule and the spec's third legal move.
- `discussion-point.md` is untouched, because nothing in it describes closure. Shapes the scope.
- The discussion's Finish section keeps its current content, because the closure step precedes it and adds nothing to report. Shapes the discussion's Finish behavior.
- `review-spec` gains one axis and one category rather than a separate procedure step, because its axes are already the unit each finding maps to. Shapes the review-spec behavior.
- `resolve-pending-decisions` needs no body change, because it has no closure step. Shapes the scope.

## Degrees of freedom

- The exact wording of the closure message, provided it carries every element `### The discussion skill` requires.
- The inline label form for an inference in spec prose, provided it is visibly a label and uses the word "inference".
- Whether the spec skill's amendment pass says in one sentence that a promoted inference is amended like any passage, or leaves "amend in place every passage the material affects" to cover it.
- The placement of the `## Inferences` obligation in the spec body: as a third numbered obligation under the existing acceptance-and-freedom section or as a section of its own, provided the heading the emitted spec must carry is `## Inferences`.

## Acceptance criteria

**FR-1 — The discussion presents only real forks and closes once.**
- AC-1.1 The discussion body states a test distinguishing a fork from an inference, in its own words, and instructs that only forks are presented as discussion points.
- AC-1.2 The discussion body contains no instruction to ask whether to keep going or finish at a sensed natural closure; a grep for "keep going" and "finish here" in the body returns nothing.
- AC-1.3 The discussion body contains one closure step, triggered when no real fork remains, that presents the held-back points as bullets, each labelled either with the answer the agent would settle it with or as left to the implementer.
- AC-1.4 The closure step states that the list is complete for that moment and not exhaustive of what a spec will contain, that the answers are non-binding, and that a point whose answer matters to the user is a fork to promote.
- AC-1.5 The closure step asks whether any bullet is promoted or the discussion stops, and a promoted bullet is presented in the discussion-point format.
- AC-1.6 The discussion body appends no log line for an inference: the list of what the skill writes is unchanged, and no instruction directs a write for a held-back point.
- AC-1.7 The binding-test section states that an inference never becomes an ADR.
- AC-1.8 The discussion body does not contain the string `spec` as a skill name, and does not direct the user to a next skill. *(Inference: the body may still mention `spec.md` as a thread file in its Inputs, which is not a skill name.)*

**FR-2 — The spec pins inferences visibly.**
- AC-2.1 The spec body's lossless-authoring rules name three legal moves for an unsettled specific: degree of freedom, inference, pending decision, with the inference move conditioned on the specific following from the settled points or having one plainly sensible answer.
- AC-2.2 The spec body requires a `## Inferences` section in every emitted spec, present even when empty, with one bullet per inference naming the inference and the passage it shapes.
- AC-2.3 The spec body requires each inference to be marked inline where it is used.
- AC-2.4 The audit pass labels unsupported claims as inference or open question; the word "assumption" does not appear in the spec body as an audit label.
- AC-2.5 The spec body does not contain the string `discussion` as a skill name.

**FR-3 — The review catches an inference that is a fork.**
- AC-3.1 The review-spec body lists an axis for inferences whose test is that each listed item is an inference and not a fork the spec settled alone.
- AC-3.2 The category vocabulary in the review-spec body includes `inference`.

**FR-4 — The log-line format states `assumption` in the fixed terms.**
- AC-4.1 The canonical `formats/log-line.md` defines `assumption` as something the user and the agent take as true without confirmation, which later work may need to revisit.
- AC-4.2 The vocabulary remains exactly seven types.
- AC-4.3 The copies under `discussion`, `resolve-pending-decisions`, and `spec` are byte-identical to the canonical file after the sync script runs.

**FR-5 — The mechanical gates hold.**
- AC-5.1 `node scripts/check-skill-text.mjs` exits 0 from `suite/`.
- AC-5.2 `node scripts/check-marketplace-skills.mjs` exits 0 from `suite/`.
- AC-5.3 `node scripts/sync-shared-references.mjs` reports no drift when run a second time.
- AC-5.4 No file under `docs/`, `README.md`, `cli/`, or `shared/references/formats/discussion-point.md` changes.
- AC-5.5 `git log` shows no new commit from the implementation.

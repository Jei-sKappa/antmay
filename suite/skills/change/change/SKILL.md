---
name: change
description: Author the thread's change document and its delta documents, and amend them in place on re-invocation.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Change

Author the thread's change document and every delta document under `delta/`, end to end, from what the thread settled. You gather the thread's context, sort each settled point to its home, draft the change document body and the delta documents that carry everything standing, audit the draft against what the thread actually settled, write the files, and append one `event` line to the thread's log. On a thread whose `change.md` already exists you run the amendment pass instead of authoring. You work straight from what the thread settled, without interviewing the user element by element. Writing the files and the log line is where you stop — do not stage, commit, or push.

A change document a downstream reader with no prior context can work from is one that says what the outcome is, what is in and out of scope, what binds it, what the change adds, replaces and removes, what the implementer must satisfy, what is deliberately left free, and what the authoring settled on its own — with every standing behavior and structure carried by a delta document and cited rather than restated.

## Inputs

Gather all of these before drafting; everything below works from what you gather here.

- The project's `AGENTS.md`, when the file exists — the project's standing guidance for agents working in it.
- `docs/glossary.md`, when the file exists — the project's fixed terms, to be used in everything you write.
- `docs/architecture/<module>.md` for each module the work touches, read via `/consult-descriptions` — how the system is structured now.
- `docs/product/<capability>.md` for each capability the work touches, read via `/consult-descriptions` — what the product does now.
- `docs/adr/` and `docs/pdr/`, read via `/consult-decisions` — the project decisions bearing on the thread's subject.
- The roadmap entry named by the seed frontmatter's `roadmap` mapping, when the seed carries one — the entry this thread answers: its sketch, its scope boundary and its planned behavior, found as the heading whose text is `roadmap.entry` in the index at `roadmap.path`.
- **The discussion that settled the design** — the primary input, in one of two accepted forms. When the same session ran the discussion, that **live conversation** is the form, and you author from it. Otherwise the form is the thread's **`log.md`**, the thread's memory, which is complete enough to author from; read it in full.
- The thread's `seed.md` — why the thread exists.
- The thread's `change.md`, when the file exists — the change document as it stands, which the run amends rather than authors anew.
- The thread's `delta/`, when present — the thread's delta of the project layer as it stands, which inside the thread takes precedence over the project records.
- The target file of each `edit` and `delete` delta document, when the run drafts or amends one, read at drafting time — the text an operation quotes exactly, and the file whose blob hash the document records.

These are the whole of what the change document rests on: the audit pass checks every claim in the draft against the conversation or the log, the seed, and the thread's delta, so no other material feeds it.

If the primary input cannot be resolved — this session did not run the discussion and `log.md` carries no entries, or the invocation names a source whose referent is unclear — that is a preflight failure, not an in-run decision: refuse before drafting, name what is missing or ambiguous and how to supply it, write nothing, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the gap and how to re-invoke. Never silently pick by recency.

## The change document

Author the body in the shape `<skill_path>/references/formats/change-document.md` defines. It covers the goal, the context, scope and non-scope, the constraints, the change, acceptance, degrees of freedom, inferences and the delta index; heading names and their order are yours to choose, and the whole reads end to end for a stranger with no prior context.

One rule governs every sentence you write into it: a sentence that describes standing behavior of the product or standing structure of the system is written in a delta document and cited from here, never written in the body. What stays in the body is what is thread-only — why this change, what it covers, what binds it, what the implementer builds, and how a reviewer will know it is right.

Four of the elements carry obligations beyond their shape.

**The change.** Name what the deltas add, replace and remove, each cited by its delta document path at the place it becomes operative, plus any one-off work no delta document can carry — a migration, a data fix, a backfill run once and never again.

**Acceptance.** A flat checklist of behavior statements, one per line, covering everything the implementer builds, what is obvious from the code included. Each statement is a concrete, checkable assertion — an observable outcome a reviewer or a test can verify pass or fail, not a vague aspiration — and every behavior this change settles is covered by at least one. A criterion carries no `FR-` prefix, no `AC-` prefix, no other identifier and no numbering, because a plan task, a report row and a review finding all reference a criterion by quoting it verbatim; write each statement so it survives being lifted word for word into those places.

**Degrees of freedom.** List the *hows* deliberately left to the implementer's free choice. The *what* is pinned; the listed *hows* are explicitly granted as open, which is what lets an adherence review tell "the plan deviated" apart from "the plan chose within granted freedom". If there are genuinely none, say so explicitly rather than omitting the element. A listed freedom must clear an eligibility bar: it is an implementation-level *how* where (a) every admissible choice satisfies all acceptance criteria unchanged, (b) no choice produces a user-visible behavioral difference the user would plausibly want to weigh in on, and (c) the choice is reversible later without revising the change document. Shorthand: if the choice would change what a reviewer checks or what the user experiences, it is not a degree of freedom — it is an unsettled decision, routed per `## Blocked`.

**Inferences.** An **inference** is a specific the thread did not settle that the authoring settles on its own, because it follows from the settled points or has one plainly sensible answer. List every inference the change document carries, one bullet each, naming the inference and the passage it shapes — whether the user already saw the point listed and let it pass or you found it while writing, with no distinction between the two. Mark each inference inline as well, at the exact place the text uses it, as a bracketed *(Inference: …)* note, so a reader of that passage knows it was not user-settled. If there are genuinely none, say so explicitly. An inference is neither a degree of freedom nor a settled decision: a freedom is a *how* left open to the implementer, while an inference is pinned; a decision was settled by the user, while an inference binds nothing until the change document pins it.

The delta index closes the body: every delta document of the thread by path with its type, so the whole standing surface this change touches is legible in one place.

## Draft the delta documents

Sort every settled point of the thread, one point at a time, by the routing table the `<skill_path>/references/formats/change-document.md` format carries. The table is what decides the home before you write the sentence anywhere, and the home is what decides whether the point becomes a delta document, a citation in the body, prose in the body, or nothing at all.

- A point recording a choice that had to overcome a named rejected alternative becomes a `create` delta document, under `delta/docs/adr/` when the choice settles how the system is structured or built and under `delta/docs/pdr/` when it settles what the product does or for whom, following the `<skill_path>/references/formats/decision-record.md` format. Draft it only when the decision test that format states holds against the log; file it by the question it answers rather than by how it is enforced, split a mixed point and test each half on its own, and assign the stem when you first write the document — from then on the stem never changes.
- A point describing built behavior the code does not make obvious becomes an `edit` delta document for `delta/docs/product/<capability>.md`, or a `create` when that target does not exist yet, following the `<skill_path>/references/formats/product-behavior.md` format.
- A point describing built structure no single file makes obvious becomes an `edit`, or a `create` when the target is absent, for `delta/docs/architecture/<module>.md`, following the `<skill_path>/references/formats/architecture-description.md` format.
- A term the discussion fixed, which reaches you as a `decision` log line stating the term and its meaning, becomes an `edit` or a `create` for `delta/docs/glossary.md`, following the `<skill_path>/references/formats/glossary.md` format.
- A point describing behavior the thread settled but this change does not build gets no delta document at all: its home is the roadmap entry that will build it, and the change document names that entry.

Every delta document follows the `<skill_path>/references/formats/delta-document.md` format. For an `edit` or a `delete`, read the target at drafting time: that read is what lets an operation quote the target's existing text exactly, and it is where the document's recorded hash comes from, taken with `git hash-object <target>` on the working tree. A `create` targets a file that does not exist, so it has nothing to read and records no hash.

A delta document the user asked for directly is drafted the same way, without the decision test — the request is what settles the point.

Cite each delta document from the change document by path, and list all of them in the delta index. Where the body cites a decision record, a description or a roadmap entry instead, cite it by the form its kind fixes, as set out in `<skill_path>/references/instructions/read-and-cite-the-project-layer.md`.

## Lossless authoring

The change document must commit to **no decision** the user did not see and accept in what the thread settled — the conversation or the log, the seed, and the thread's delta — **unless it explicitly marks the point a degree of freedom or pins it as an inference.** The unit of this bar is a decision — never a sentence: the authoring freely elaborates settled decisions into prose, structure, and derived acceptance criteria. Elaboration is allowed and expected; introducing a new decision the user never saw is forbidden. An inference is by definition not one: either any reader would reach it from the settled material, or the user was shown it and let it pass.

When forward-designing surfaces a specific the thread did not settle, there are exactly three legal moves — never silently bake it in:

1. **Mark it a degree of freedom** — if the specific passes the eligibility bar above, record it there as a *how* left open to the implementer, so it is visibly granted rather than smuggled in as a pinned commitment.
2. **Pin it as an inference** — if the specific follows from the settled points or has one plainly sensible answer, settle it, mark it inline, and list it among the inferences, so it is visibly agent-settled rather than passed off as user-settled.
3. **Queue it as a decision** — otherwise it is human intent the thread never settled: emit a pending-decisions bundle per `## Blocked` and report the run blocked, so the decision is made before it is committed.

Which move to try first is your judgment, guided by one test. A specific reasonable people could settle differently, whose answer would change what a reviewer checks or what the user experiences, is a decision to queue. One that follows from the settled points or has one plainly sensible answer is an inference. One where every admissible answer satisfies the settled points equally and the choice belongs to the implementer is a degree of freedom.

Context worth flagging that is neither intent nor freedom lives in the change document body as a stated constraint or risk note — information, not a question.

Pinning an undiscussed decision into an acceptance criterion or a constraint as if it were settled is the failure this prevents.

## Audit pass

Authoring runs one audit pass over the draft, after drafting and before anything is written.

Walk the primary input claim by claim — the conversation when you authored from it, otherwise the log — and confirm three things of each claim. That it landed somewhere: a settled point with no home in the change document and no delta document is one the draft is missing. That it landed in the home the routing table gives it: a point passing the decision test has a delta document under `delta/docs/adr/` or `delta/docs/pdr/`, and a point describing standing behavior or standing structure has one under `delta/docs/product/` or `delta/docs/architecture/`. And that the body is clean of it where the table sends it elsewhere: no sentence describing standing behavior of the product or standing structure of the system sits in the change document body.

Then read the draft back the other way. Anything the change document or a delta document states that the conversation or the log, the seed, and the thread's delta do not support is labelled inline, at the exact place it appears, as an **inference** or as an **open question**, and an inference so labelled is listed among the inferences. Such a claim is never deleted, and it is never left standing as though it were settled.

The change document is not complete while an open question remains. An open question you can answer from the gathered inputs is answered, and its label goes with the answer. One you cannot answer yourself is a human decision: queue it per `## Blocked` and mark it inline pointing at the bundle.

## Amendment pass

When `change.md` already exists at the thread root, the run amends it and the thread's delta documents together. Author nothing new.

The material for the pass is the live conversation when this session holds one; otherwise it is the `log.md` entries after the last `event` line stating that the change document was authored or amended. Those entries are exactly what settled since the change document last stood current, and a point settled after the change document exists reaches the thread through this pass alone.

Amend in place every passage the material affects and every delta document it affects, routing each new point exactly as authoring does: keep the superseded text, mark it superseded, and annotate it with the date and the reason it changed. An inference the user has since settled is such a passage, and its bullet among the inferences is amended with it. A new point whose home is a delta document the thread does not have yet gets one drafted now, cited from the body and added to the delta index. Before amending an `edit` or a `delete`, read its target again: if the target has changed since the document was drafted, re-record the hash with `git hash-object <target>` and re-quote any operation whose exact text moved. Leave every other passage and every unaffected delta document untouched — what the new material does not touch is not rewritten, re-worded, or re-derived.

Amending in place under these rules, with one line appended to `log.md` by following `<skill_path>/references/instructions/append-log-line.md`, recording the change, is the one way the change document and its delta documents change once they are authored — whether this skill performs the amendment or the user asks the agent to amend them directly.

## Procedure

1. **Preflight before any drafting (substantive execution).** A preflight failure writes nothing and follows `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED`, naming the reason and how to re-invoke — never a pending bundle — refuse when the primary input cannot be resolved per `## Inputs`.

2. **Gather the inputs.** Read everything under `## Inputs` now, in that order. That picture is what keeps the change document from contradicting a project record or something the thread has already settled.

3. **Author or amend.** If the thread root holds a `change.md`, run the `## Amendment pass`. Otherwise sort every settled point per `## Draft the delta documents`, draft each delta document from its target, and draft the body per `## The change document`. Honor the lossless constraint (`## Lossless authoring`) for any specific the thread did not settle. Adapt length to what the thread warrants — a tight change document is better than a padded one.

4. **Audit the draft.** On an authoring run, run the `## Audit pass` before writing.

5. **Write the artifacts.** Write `change.md` at the thread root — literally that name, with no frontmatter — and each delta document at its mirrored path under the thread's `delta/`, creating the folders it needs as you go. References within the thread are thread-relative (`log.md`, `delta/docs/pdr/<stem>.md`), never repo-rooted or absolute; references to anything in the project are repo-relative (`docs/product/<capability>.md`, `.work/roadmaps/<index>.md`).

6. **Append the log line.** Follow `<skill_path>/references/instructions/append-log-line.md` with exactly one `event` line stating that the change document was authored or amended and from which form of the primary input. This line is the position the next amendment pass starts after, so every authoring and every amendment appends one.

7. **Confirm.** Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and `Change document written: change.md` after authoring, or `DONE` and `Change document amended: change.md` after an amendment, and nothing before it — no preamble, no summary, no closing remark.

You write exactly three things: `change.md` at the thread root, the delta documents under the thread's `delta/`, and one line appended to the thread's `log.md`. Nothing else you touch is written — `docs/adr/`, `docs/pdr/`, `docs/product/`, `docs/architecture/`, `docs/glossary.md`, the roadmap index, and every file a delta document targets are read here and never written.

## Blocked

This path is reachable only after preflight has passed and forward-designing from otherwise-valid inputs has begun — substantive execution. Invocation and input-resolution failures are preflight refusals (`## Procedure` step 1), not this path. It applies whenever a human decision is genuinely indispensable to a sound change — one you cannot settle yourself from the gathered inputs, an open question the audit pass left standing included. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat.

Finish everything safely derivable first, then follow `<skill_path>/references/instructions/emit-pending-decisions.md` with yourself as the producer, `change.md` as the target, and the originating user request. Then stop with a concise notification of where the bundle was written and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and `pending decisions at <bundle path>`.

An unnoticed conflict between what the thread settled and a project decision record or a project glossary term is one of these decisions: classify it as `/consult-decisions` instructs, and queue it rather than overriding the project record.

A blocked run still writes `change.md` as complete as the settled inputs allow — every element fully elaborated, each blocked specific marked inline at its exact location pointing at the pending bundle — together with every delta document the settled inputs already derive, and appends its `event` line. The only permitted gaps are those marked ones tied to queued decisions.

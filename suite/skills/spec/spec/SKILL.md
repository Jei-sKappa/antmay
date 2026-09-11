---
name: spec
description: Author a thread's design truth into a handoff-grade spec.md from the discussion's live conversation or the thread log, and amend an authored spec in place on re-invocation; use when a thread's design has settled enough to be written down, or when a later change must land in the spec that already exists.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.2.0
---

# Spec

Author the thread's single design truth, end to end. You gather the thread's context, draft a spec body that covers all seven required semantic-contract elements plus the two spec obligations, audit the draft against what the thread actually settled, write the single thread-root `spec.md`, and append one `event` line to the thread's log. On a thread whose `spec.md` already exists you run the amendment pass instead of authoring. You work straight from what the thread settled, without interviewing the user element by element. Writing the file and its log line is where you stop — do not stage, commit, or push.

A handoff-grade spec is one a downstream reader with no prior context can read alone and know what to build: what the outcome is, what is in and out of scope, how it must behave, what binds it, what is deliberately left free, and how a reviewer will know it is right.

## Inputs

Gather all of these before drafting; everything below works from what you gather here.

- `docs/adr/` — the project ADR catalog, listed with the command in `references/formats/adr.md`; open the records relevant to the thread's subject. Authoritative.
- `docs/glossary.md` — the project's terms. Authoritative.
- **The discussion that settled the design** — the primary input, in one of two accepted forms. When the same session ran the discussion, that **live conversation** is the form, and you author from it. Otherwise the form is the thread's **`log.md`**, the thread's memory, which is complete enough to author from; read it in full. Material.
- The thread's `seed.md` — why the thread exists. Authoritative for intent.
- The thread's `adr/` and `glossary.md` — the thread's delta of the project layer, authoritative within the thread. The spec cites each record by stem where it is operative and does not restate it.

These are the whole of what the spec rests on: the audit pass checks every claim in the draft against the conversation or the log, the seed, and the thread's delta, so no other material feeds the spec.

If the primary input cannot be resolved — this session did not run the discussion and `log.md` carries nothing past its header, or the invocation names a source whose referent is unclear — that is a preflight failure, not an in-run decision: refuse before drafting, name what is missing or ambiguous and how to supply it, write nothing, and end with `Outcome: REFUSED — <the gap and how to re-invoke>`. Never silently pick by recency.

## Semantic contract

The emitted spec MUST cover all SEVEN of the following elements in its body, regardless of the section names used:

1. **Intended outcome** — what this spec, when implemented, produces for the user.
2. **Context** — why this is being built; what came before; what triggered the spec.
3. **Scope / non-scope** — the boundary statement, INCLUDING what is explicitly out.
4. **Expected behavior** — the observable behaviors a future executor needs.
5. **Constraints** — tech, repo, harness, and safety constraints that bind the implementation.
6. **Explicit decisions** — settled trade-offs INLINED into the body where they are operative (in scope, in constraints, in expected behavior, in acceptance). When one of the thread's ADRs carries the settled decision, cite that record by its stem at the inline location where it becomes operative — e.g. `(per adr/2609081420-queue-worker-exports)` — rather than copying its text. Thread-local design that no ADR carries is written out in full, the thread's direction included.
7. **Acceptance guidance** — how a reviewer will know the implementation is right (see `## Acceptance guidance and degrees of freedom`).

The seven elements MAY be presented as a copy-paste template OR interleaved into a freeform structure appropriate to the input — section names and ordering are yours to choose. What is not yours to choose: every one of the seven must appear, the two obligations below must appear, and the spec must read as handoff-grade.

There is no mandatory `## Decisions` heading. A separate decisions section is redundant clutter — settled decisions belong inlined into the elements they govern, each carrying its ADR stem where a record holds it. Do not add such a section to satisfy an implicit template.

## Acceptance guidance and degrees of freedom

Two obligations beyond the seven elements make downstream plan autonomy safe rather than hopeful:

1. **Machine-checkable acceptance criteria (wherever the work carries a design decision).** Express the acceptance guidance as machine-checkable acceptance criteria following the FR/AC + coverage + traceability model:
   - **FR/AC** — enumerate functional requirements as `FR-<id>` and, under each, one or more acceptance criteria as `AC-<id>.<n>`, each phrased as a concrete, checkable assertion — an observable outcome a reviewer or a test can verify pass/fail, not a vague aspiration.
   - **Coverage** — every expected behavior in the spec body is covered by at least one AC; nothing observable is left without a check.
   - **Traceability** — each AC traces back to the requirement (and, where relevant, the settled decision) it enforces, so a reviewer can follow each check to its origin.

   This is what lets an automated adherence review clear the downstream plan without the human re-reading it. For trivial work with no design decision the criteria may be lighter prose, but write machine-checkable criteria whenever the work carries a design decision.

2. **A `## Degrees of freedom` section (every spec).** List the *hows* deliberately left to the implementer's free choice. The *what* is handoff-grade and pinned; the listed *hows* are explicitly granted as open. This section is what lets an automated adherence review distinguish "the plan deviated from the spec" from "the plan chose within granted freedom." If there are genuinely no degrees of freedom, say so explicitly rather than omitting the section.

   A listed freedom must clear an eligibility bar: it is an implementation-level *how* where (a) every admissible choice satisfies all acceptance criteria unchanged, (b) no choice produces a user-visible behavioral difference the user would plausibly want to weigh in on, and (c) the choice is reversible later without revising the spec. Shorthand: if the choice would change what a reviewer checks or what the user experiences, it is not a degree of freedom — it is an unsettled decision, routed per `## Blocked`.

## Lossless authoring

The spec must commit to **no decision or assumption** the user did not see and accept in what the thread settled — the conversation or the log, the seed, and the thread's `adr/` and `glossary.md` — **unless the spec explicitly marks it a degree of freedom.** The unit of this bar is a decision or an assumption — never a sentence: a spec freely elaborates settled decisions into prose, structure, and derived acceptance criteria. Elaboration is allowed and expected; introducing a new decision or assumption the user never saw is forbidden.

When forward-designing surfaces a specific the thread did not settle, there are exactly two legal moves — never silently bake it in:

1. **Mark it a degree of freedom** — if the specific passes the `## Degrees of freedom` eligibility bar, record it there as a *how* left open to the implementer, so it is visibly granted rather than smuggled in as a pinned commitment.
2. **Queue it as a decision** — otherwise it is human intent the thread never settled: emit a pending-decisions bundle per `## Blocked` and report the run blocked, so the decision is made before it is committed.

Context worth flagging that is neither intent nor freedom lives in the spec body as a stated constraint or risk note — information, not a question.

Pinning an undiscussed decision into expected behavior or a constraint as if it were settled is the failure this prevents.

## Audit pass

Authoring runs one audit pass over the draft, after drafting and before the file is written.

Walk the primary input claim by claim — the conversation when you authored from it, otherwise the log — and confirm that each claim landed somewhere in the spec. A settled point that has no home in the draft is one the spec is missing.

Then read the draft back the other way. Anything the spec states that the conversation or the log, the seed, and the thread's delta do not support is labelled inline, at the exact place it appears, as an **assumption** or as an **open question**. Such a claim is never deleted, and it is never left standing as though it were settled.

A spec is not complete while an open question remains. An open question you can answer from the gathered inputs is answered, and its label goes with the answer. One you cannot answer yourself is a human decision: queue it per `## Blocked` and mark it inline pointing at the bundle.

## Amendment pass

When `spec.md` already exists at the thread root, the run amends it. Author nothing new.

The material for the pass is the live conversation when this session holds one; otherwise it is the `log.md` entries after the last `event` line stating that the spec was authored or amended. Those entries are exactly what settled since the spec last stood current.

Amend in place every passage that material affects: keep the superseded text, mark it superseded, and annotate it with the date and the reason it changed. Leave every other passage untouched — a passage the new material does not touch is not rewritten, re-worded, or re-derived.

Amending in place under these rules, with one line appended to `log.md` per `references/formats/log-line.md` recording the change, is the one way the spec changes once it is authored — whether this skill performs the amendment or the user asks the agent to amend the spec directly.

## Procedure

1. **Preflight before any drafting (substantive execution).** Resolve the thread: work inside one thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`; if `cwd` already sits inside a thread root, that is the thread. A preflight failure writes nothing and ends `Outcome: REFUSED — <reason and how to re-invoke>`, never a pending bundle — refuse when no thread exists yet (a thread must be opened before a spec can be written; do not create the thread or its seed yourself), when several thread roots exist and which is active is ambiguous (never silently pick the most recent stamp), or when the primary input cannot be resolved per `## Inputs`.

2. **Gather the inputs.** Read everything under `## Inputs` now, in that order. That picture is what keeps the spec from contradicting a project record or a record the thread has already settled.

3. **Author or amend.** If the thread root holds a `spec.md`, run the `## Amendment pass`. Otherwise draft the body: cover all seven semantic-contract elements, inline settled decisions where they are operative and cite the thread ADRs that carry them by stem, and add the two obligations. Honor the lossless constraint (`## Lossless authoring`) for any specific the thread did not settle. Keep the spec readable end-to-end by a stranger with no prior context, and adapt length to what the thread warrants — a tight spec is better than a padded one.

4. **Audit the draft.** On an authoring run, run the `## Audit pass` before writing.

5. **Write the artifact.** Write the single file `docs/threads/<thread>/spec.md` — literally that name at the thread root, with no frontmatter. Within-thread references in the body are thread-relative (e.g. `log.md`, `adr/<stem>.md`), never repo-rooted or absolute; cross-thread and project-level references are repo-relative (`docs/adr/<stem>.md`, `docs/threads/<other>/…`).

6. **Append the log line.** Append exactly one `event` line to the thread's `log.md`, formatted per `references/formats/log-line.md`, stating that the spec was authored or amended and from which form of the primary input:

   ```sh
   printf '%s\n' '- (event) spec authored from the conversation' >> docs/threads/<thread>/log.md
   ```

   Use the shell append (`>>`) of a single line; never open `log.md` with a file-editing tool. This line is the position the next amendment pass starts after, so every authoring and every amendment appends one.

7. **Confirm.** End with exactly this line, and nothing before it — no preamble, no summary, no closing remark: `Outcome: DONE — Spec written: spec.md` after authoring, or `Outcome: DONE — Spec amended: spec.md` after an amendment.

You write exactly two things: `spec.md` at the thread root, and one line appended to the thread's `log.md`. Nothing else you touch is written — the thread's `adr/` and `glossary.md`, `docs/adr/`, and `docs/glossary.md` are read here and never written.

## Blocked

This path is reachable only after preflight has passed and forward-designing from otherwise-valid inputs has begun — substantive execution. Invocation, thread-resolution, and input-resolution failures are preflight refusals (`## Procedure` step 1), not this path. It applies whenever a human decision is genuinely indispensable to a sound spec — one you cannot settle yourself from the gathered inputs, an open question the audit pass left standing included. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Do not invent the intent and do not stall waiting in chat.

Finish everything safely derivable first, then hand the open decision(s) to `/emit-pending-decisions`, giving it:

- `/spec` as the producing skill.
- `spec.md` as the target.
- The originating user request.
- One point per open decision, each stating what the decision blocks, why you could not derive the answer from the gathered inputs, and the evidence you weighed — in your own words. Add a free-text suggestion to a point only when you see an immediate fix.

Then stop with a concise notification of where the bundle was written, whose final line is exactly `Outcome: BLOCKED — pending decisions at <bundle path>`.

An unnoticed conflict between what the thread settled and a project ADR or a term in `docs/glossary.md` is one of these decisions: queue it rather than overriding the project record. The rule, and what makes a contradiction intentional instead, is stated in full in `references/formats/adr.md`.

A blocked run still writes `spec.md` as complete as the settled inputs allow — every section fully elaborated, each blocked specific marked inline at its exact location pointing at the pending bundle — and appends its `event` line. The only permitted gaps are those marked ones tied to queued decisions.

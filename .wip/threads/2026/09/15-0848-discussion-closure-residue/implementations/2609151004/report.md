# Implementation report

Plan: none

## Outcome

Completed. The run implemented `spec.md` in full on the working tree, with no commit, as the spec's Constraints and AC-5.5 require. All five functional requirements are in place: the `discussion` skill presents only real forks and closes once with a labelled inference list; the `spec` skill pins inferences as a third legal move, marks them inline, and lists them in a mandatory `## Inferences` section; `review-spec` gains an Inferences axis and an `inference` category; the log-line format defines `assumption` in the thread's fixed terms and its three generated copies are in sync; every mechanical gate exits 0.

## Changes

All under `suite/`:

- `shared/references/formats/log-line.md` — `assumption` now reads "something the user and the agent take as true without confirmation, which later work may need to revisit"; example line and the seven-type vocabulary unchanged. Synced copies rewritten under `skills/capture-discussion/discussion/references/formats/`, `skills/capture-discussion/resolve-pending-decisions/references/formats/`, and `skills/spec/spec/references/formats/`.
- `skills/capture-discussion/discussion/SKILL.md` — new `## Forks and inferences` section carrying the three-way fork/inference test as the skill's own rule; forks presented one at a time with no limit, inferences held back and never logged. Procedure step 4 presents only forks and holds inferences for step 7. Step 7 replaces the generic continue-or-finish prompt with the single closure step: no more real forks, the complete labelled bullet list (agent's answer or left to the implementer), stated as non-binding, a point whose answer matters is a fork to promote, promote-or-stop question, promoted bullet through the discussion-point format, no next skill named. Binding test gains "Only a settled point is tested; an inference never becomes an ADR." Opening paragraph no longer names the `spec` skill. Write boundary and Finish untouched.
- `skills/spec/spec/SKILL.md` — obligations go from two to three; section renamed `## Acceptance guidance, degrees of freedom, and inferences`; new obligation 3 requires `## Inferences` in every spec (one bullet per inference naming it and the passage it shapes, present even when empty, discussion-listed and found-while-writing undistinguished) and an inline *(Inference: …)* mark at the point of use. Lossless authoring names three legal moves — degree of freedom, inference, pending decision — with the inference move conditioned on following from the settled points or having one plainly sensible answer, states that an inference is by definition not a new decision, and gives the three-way test as the ordering guide. Audit pass labels unsupported claims as **inference** or **open question**. Amendment pass says a since-settled inference and its bullet are amended in place.
- `skills/review/review-spec/SKILL.md` — new **Inferences** readiness axis (each listed item is really an inference and not a fork the spec settled alone; a fork is a finding because a planner would build on a decision nobody made); category vocabulary gains `inference`.

## Verification

Run from `suite/` after all edits:

- `node scripts/check-skill-text.mjs` — OK, 109 files, no hit (AC-5.1).
- `node scripts/check-marketplace-skills.mjs` — OK, 18 skills (AC-5.2).
- `node scripts/sync-shared-references.mjs` run a second time — the same seven files remain modified and nothing else, so no drift (AC-5.3); `cmp` confirms the three `log-line.md` copies byte-identical to the canonical file (AC-4.3).
- `git status` — only the four skill/format files and three generated copies changed; nothing under `docs/`, `README.md`, `cli/`, or `shared/references/formats/discussion-point.md` (AC-5.4). HEAD unchanged; no commit made (AC-5.5).
- Grep checks on the discussion body: "keep going" and "finish here" absent (AC-1.2); the backticked skill name `spec` absent, only `spec.md` remains (AC-1.8); the fork test, "no more real forks", "never a sample", "non-binding", the promotion path, and "an inference never becomes an ADR" each present once (AC-1.1, 1.3, 1.4, 1.5, 1.7); the "You write exactly three things" write boundary is not in the diff (AC-1.6).
- Grep checks on the spec body: "exactly three legal moves", the `## Inferences` obligation, and "Mark each inference inline" present (AC-2.1–2.3); `**assumption**` as an audit label absent — the word survives only in the lossless-authoring bar "no decision or assumption the user did not see", where it names the user-settled log type (AC-2.4); the backticked skill name `discussion` absent; the two pre-existing unbackticked uses in `## Inputs` mean the conversation (AC-2.5).
- Grep checks on review-spec: the **Inferences** axis bullet and the `inference` category present (AC-3.1, 3.2).
- `log-line.md`: the new `assumption` definition present; exactly seven type bullets (AC-4.1, 4.2).

## Deviations

- No commit was made — departs from the implement skill's default one-commit-per-task cadence — because the spec's Constraints state "Nothing is committed. The change lands on the working tree only", AC-5.5 checks for it, and the project's root memory forbids committing unless explicitly asked; the spec's instruction was treated as the explicit Git instruction the skill's override clause honours.
- The discussion body's opening sentence "written afterwards, when the user invokes `spec`" was rewritten to "written afterwards from what this discussion settles" — departs from the spec's Scope list, which does not name that sentence — because AC-1.8 forbids the string `spec` as a skill name anywhere in the body and the pre-existing sentence violated it.
- The obligation section in the spec body was renamed to `## Acceptance guidance, degrees of freedom, and inferences` — within the degree of freedom the spec grants on placement — so the heading stays honest about holding three obligations; the element-7 pointer was updated to match.

## Remaining concerns

- The discussion body's Peer framing still says "identify the exact assumption or value judgment causing the split" in the ordinary English sense. The spec did not ask for it to change, so it stands, but the fixed vocabulary now reserves "assumption" for the user-settled log type.
- The spec body's degrees-of-freedom shorthand still routes a reviewer-visible choice straight to `## Blocked`. This is correct under the new three-way test (such a choice is a fork), but a reader may expect the shorthand to mention the inference move; it does not, because an inference is by definition not reviewer-visible.
- The repository-leakage grep found two pre-existing `.wip/` mentions (the discussion's roadmap-index input and the spec's step 5 path example). They predate this run and are outside its scope.

## Follow-ups

- The question the thread left open — whether an implementer's judgment call belongs in the report's `## Deviations` section, given a deviation must name what it departs from — is unaddressed here by design and needs its own thread.
- On thread close, `close-thread` merges the four terms in the thread's `glossary.md` into `docs/glossary.md`; the suite bodies now use those terms.

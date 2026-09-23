# Rename the change document back to spec, and mark other threads as history

## Goal

Give the thread's design document back the name "spec", because "change" is too generic a word. Also stop agents from reading other threads as if they described what holds now.

## Context

The artifact-model rework renamed the spec to the change document (`change.md`, the `change` and `review-change` skills). Its reason was that readers took "spec" for standing truth. Since then, the rework's other decisions have removed the grounds for that reading. Criteria carry no identifiers, and every standing behavior lives in the thread's delta and is only cited. Meanwhile "change" collides with the ordinary word everywhere it appears (`log.md`). The rule about other threads was first placed in the shared read-and-cite instruction alone. The first implementation found that no skill reads that instruction's read order at the start of a run, so the rule was restated in every skill's inputs (`log.md`).

The suite side of this work is already delivered, in `implementations/2609230710/report.md` and `implementations/2609230716/report.md`. What remains is the project layer, which only this delta changes.

## Scope and non-scope

In scope:
- the suite, the root documents, the glossary and the method's product behavior, all brought to the name "spec";
- the other-threads rule, in the shared instruction and in every thread-reading skill's inputs.

Out of scope:
- `cli/`, which is on hold and is left untouched even where it drifts;
- every existing thread's artifacts, which are history and keep the words they were written with. *(Inference: history is not rewritten; the rework thread's own `spec.md` already carries the old name.)*

## Constraints

- `cli/` is not touched (`AGENTS.md`, "The CLI is on hold"). The rename brings the suite back toward the names `cli/README.md` already uses, so the realignment pass has less to do.
- **Spec Driven Development** stays the name of the practice.
- The project layer changes only through this delta, landed by `close-thread`.

## The change

- The design document is `spec.md`, authored by `spec` and reviewed by `review-spec`, and its format is `formats/spec.md`. The decision and its rejected alternative are recorded in `delta/docs/pdr/2609230721-thread-design-document-is-the-spec.md`.
- The glossary redefines **spec** as the thread's design document and retires **change document**. Every row that named the old document or the `change` skill names the spec instead, and the **thread artifact** row adds that another thread is read only when named. All of this is in `delta/docs/glossary.md`. *(Inference: the thread-artifact row is the glossary's natural home for the history rule.)*
- The method's product behavior names the `spec` and `review-spec` skills and the spec, and gains the statement that every skill that reads a thread treats any other thread as history. Both are in `delta/docs/product/method.md`.
- The rule that another thread is history closes the `## Inputs` of every skill that gathers thread inputs, and the shared read-and-cite instruction keeps its canonical wording. The placement and its rejected alternatives are recorded in `delta/docs/adr/2609230721-thread-reading-rule-in-every-skill-inputs.md`.
- The suite, `README.md`, `docs/documentation-rules.md`, the marketplace manifest and the editor scopes are already swept (commit `2ca9403`). No one-off work remains beyond landing the delta.

## Acceptance

- `suite/skills/spec/spec/SKILL.md` exists with `name: spec`, and `suite/skills/review/review-spec/SKILL.md` exists with `name: review-spec`; no `change` or `review-change` skill folder remains.
- `suite/shared/references/formats/spec.md` is the spec format, every skill that reads it carries a generated copy at `references/formats/spec.md`, and no `change-document.md` copy remains.
- `.claude-plugin/marketplace.json` lists `./skills/spec/spec` and `./skills/review/review-spec` and neither old path.
- Outside `cli/` and `.work/`, no tracked file contains "change document", `change.md`, `review-change` or `skills/change`.
- `docs/glossary.md` defines **spec** as `spec.md`, the thread's design of one change, and marks **change document** as leaving the vocabulary.
- `docs/product/method.md` names `spec` and `review-spec` as the skills that write and review the spec.
- `docs/product/method.md` states that every skill that reads a thread treats any other thread as history and reads it only when the user or the thread's seed names it.
- `read-and-cite-the-project-layer.md` states that any other thread is history, read only when the user or this thread's seed names it.
- The same sentence closes the `## Inputs` of `discussion`, `resolve-pending-decisions`, `spec`, `plan-brief`, `plan-strict`, `check-plan`, `implement`, `implement-plan`, `implement-plan-with-subagents`, `review-spec`, `review-implementation`, `review-code`, `close-thread` and `roadmap`.
- `docs/pdr/2609230721-thread-design-document-is-the-spec.md` and `docs/adr/2609230721-thread-reading-rule-in-every-skill-inputs.md` exist after close.
- `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs` pass from `suite/`.

## Degrees of freedom

None. The suite side is built, and the delta carries literal text.

## Inferences

- Existing threads' artifacts are not rewritten — shapes the scope and non-scope.
- The glossary's **thread artifact** row carries the history rule — shapes the glossary delta and the change.
- The PDR files the naming as a product decision, since the name is what users see and type; the placement of the rule is an ADR, because it concerns how the suite is built — shapes the two decision records.

## Delta index

- `delta/docs/glossary.md` — edit
- `delta/docs/product/method.md` — edit
- `delta/docs/pdr/2609230721-thread-design-document-is-the-spec.md` — create
- `delta/docs/adr/2609230721-thread-reading-rule-in-every-skill-inputs.md` — create

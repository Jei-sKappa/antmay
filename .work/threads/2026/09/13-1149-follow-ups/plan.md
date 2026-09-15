# Plan: Follow-ups — instructions, model-invoked skills, `.wip/` threads, and the deletions

Source: spec.md

## Objective and context

Reorganise the skill suite under `suite/` so that every piece of text an agent reads sits in exactly one kind of place — skill bodies hold only what makes each skill itself, reusable acts live in shared `instructions/`, artifact shapes live in `formats/` files that all follow one skeleton, and two model-invoked skills (`consult-adrs`, `consult-glossary`) give any agent the project's decisions and terms. Delete the primitives group, the recipes, `whats-next`, `finish`, `suite/method.md`, and `suite/skill-authoring.md`; create `suite/authoring/`, `docs/documentation-rules.md`, and `docs/working-with-threads.md`; reduce both `AGENTS.md` files to pointers plus essentials; move every thread of this repository to `.wip/threads/yyyy/mm/dd-hhmm-slug/`; and close with a subagent sweep of every body. The CLI under `cli/` is not edited.

Before opening any task file, read `spec.md` in full and the decision records it cites in `decisions.md` (DR1–DR18). The spec's `## Expected behaviour` is the contract each task realises; the spec's `## Acceptance guidance` (AC-1.1 … AC-11.1) is what each task's verification checks. Task briefs cite both by their identifiers.

Facts the whole plan rests on:

- **Sequence.** Shared references first (formats, then instructions), then the skill tree and registrations, then the four body groups, then the maintainer documents, then the thread migration, and the sweep last — on bodies in their final shape, as the spec requires.
- **Paths change at task 10.** Until the migration task runs, this thread's root is `docs/threads/260913114934Z-follow-ups/`. From the end of task 10 onward it is `.wip/threads/2026/09/13-1149-follow-ups/`, and so are this plan folder and this run's implementation folder. Task 10 states the hand-off; task 11 and the run's own report writes use the new root.
- **Commit boundaries.** Each task is one commit under the run's per-task cadence; the migration (task 10) is therefore its own commit, as the spec requires. If the invocation overrides the cadence and the run does not commit, the implementation report states these boundaries instead, naming the migration as one.
- **`docs/glossary.md` and `docs/adr/` are out of scope.** The spec places them outside this thread's writes (close-thread lands them). Two spec checks would otherwise sweep them up — AC-8.2 (`docs/threads` / `docs/roadmaps` grep) and AC-9.5 (`method.md` grep) — so every verification in this plan that runs those greps excludes `docs/glossary.md`. The thread's glossary delta (task 9) redefines every project term whose current row names an old path or a retired concept, so close-thread's merge clears the rows; the header paragraph of `docs/glossary.md`, which names `suite/method.md` and `suite/skill-authoring.md`, is not a term and stays for close-thread or a follow-up — the implementation report lists it under follow-ups.
- **No `docs/adr/` and no `docs/roadmaps/` exist today.** The migration moves thread folders only; there is no roadmap index to move and no closing line to rewrite.
- **Shared-reference sync.** Every task that edits `suite/shared/` runs `node scripts/sync-shared-references.mjs` from `suite/` before its verification, and never hand-edits a synced copy under a skill's `references/`.
- **Register.** Shipped content (`suite/skills/`, `suite/shared/references/`) is written to the invoked agent in any project: no decision IDs, no thread paths of this repository, no explanation of how this repository is organised. Maintainer documents and `AGENTS.md` are written to whoever works on this repository. `README.md` is written to an external user.

## Global Constraints

- Nothing under `cli/` is edited (per `decisions.md` DR14).
- Never commit unless the maintainer asks; the implementation reports the intended commit boundaries, including the migration as its own commit (repository rule; DR18).
- Never hand-edit a generated copy under a skill's `references/`; edit the canonical source and run `node scripts/sync-shared-references.mjs`.
- `node scripts/check-marketplace-skills.mjs` passes after the group changes.
- Every document and skill body describes the current state, never the diff: no sentence whose only referent is a design this thread removed.
- Shipped content contains no reference to this repository's organisation, decision IDs, or thread paths of this repository.
- Every skill still ships `agents/openai.yaml` with the interface block; the two harness declarations never diverge.
- Conventional Commits scopes: a change confined to one skill uses that skill's folder name; cross-module or root changes omit the scope.
- The order of work matters for the sweep: it runs last, on bodies in their final shape (per `decisions.md` DR16).

## Tasks

1. **Bring every format file to the skeleton and add `thread.md` and `glossary.md`** — restructure the six formats to title / paragraph / `## Shape` / `## Rules`, strip behaviour out of them, point every path at `.wip/`, and write the two new formats. → `plan-tasks/01-formats-skeleton-and-new-formats.md`
2. **Create the `instructions/` shared-reference kind** — write the six instruction files from the primitives and the inline blocks, declare them in the manifest, sync. → `plan-tasks/02-instructions-folder.md`
3. **Reshape the skill tree and its registrations** — create `model-invoked/consult-adrs` and `consult-glossary`, delete `primitives/`, `finish`, `whats-next`, and `recipes/`, rename `finish-navigate/` to `close/`, set every version to `0.0.0`, and realign manifest, marketplace, and commit scopes. → `plan-tasks/03-skill-tree-and-registrations.md`
4. **Rewrite the `capture-discussion` bodies** — `discussion`, `open-thread`, `open-ticket`, `resolve-pending-decisions`: consult pointers, no thread resolution, log writes through the instruction, thread creation through the instruction, short descriptions. → `plan-tasks/04-bodies-capture-discussion.md`
5. **Rewrite the `spec`, `plan`, and `roadmap` bodies** — `spec`, `plan-brief`, `plan-strict`, `check-plan`, `roadmap`: consult pointers, no thread resolution, instruction pointers for the log line, pending decisions, and the terminal outcome, `.wip/` paths, short descriptions. → `plan-tasks/05-bodies-spec-plan-roadmap.md`
6. **Rewrite the `implement` bodies** — `implement`, `implement-plan`, `implement-plan-with-subagents`: drop the continuation-run mode and every log write, point at the report and pending-decision instructions, no thread resolution, short descriptions. → `plan-tasks/06-bodies-implement.md`
7. **Rewrite the `review` and `close` bodies** — `review-spec`, `review-implementation`, `review-code`, `close-thread`: pending-review through the instruction, close-thread with no move and no log line, consult pointers, no thread resolution, short descriptions. → `plan-tasks/07-bodies-review-and-close.md`
8. **Replace `skill-authoring.md` with `suite/authoring/` and delete `method.md`** — five maintainer files, one concern each, carrying every rule the decisions settle. → `plan-tasks/08-authoring-folder.md`
9. **Rewrite the repository documents and draft the glossary delta** — `README.md`, root `AGENTS.md`, `suite/AGENTS.md`, `CONTRIBUTING.md`'s pointer, the two new `docs/` documents, and this thread's `glossary.md`. → `plan-tasks/09-repository-documents-and-glossary-delta.md`
10. **Migrate every thread to `.wip/threads/`** — move all thread folders to the year/month layout with `git mv`, rewrite the references that must resolve, update `.gitignore`, and state the commit boundary. → `plan-tasks/10-migrate-threads.md`
11. **Sweep every body and skill-local reference, then verify the whole change** — subagents partitioned by group report every hit by file, line, and class before any edit; resolve the hits; run every acceptance check of the spec. → `plan-tasks/11-sweep-and-final-verification.md`

# Plan: Redesign the Antmay method and skill suite from the Leitspace field report

Source: spec.md

## Objective and context

Execute `spec.md` end to end: retire ten skills, add two, rewrite every remaining skill under `suite/skills/` around a thread whose single design truth is `spec.md`, whose memory is `log.md`, whose project-level decisions are ADR files, and whose plans and implementations live in stamped folders; replace the shared format references; move the method's text into `suite/`; and turn this repository's `docs/` into the project layer. When every task is done, the suite, the suite's method overview, the distribution files, and the root documents describe the redesigned method as the current state.

The spec is the authority for every rule. Task briefs restate the rules a task realizes so an implementer can work from the brief alone, but where a brief and `spec.md` disagree, the spec wins and the brief is corrected. `decisions.md DR<N>` citations in the briefs point at this thread's own records, which keep their `DR<N>` shape because the thread was opened under the previous method (spec `## Scope and non-scope`).

The `cli/` module is out of scope and is not edited by any task. `cli/src/pipeline/documentation.test.ts` and `cli/README.md`'s stage table may fail against the redesigned suite; that is accepted (decisions.md DR1). Existing threads under `docs/threads/` are never edited.

## Choices this plan fixes

The spec leaves these to the implementer (`## Degrees of freedom`). The plan fixes them so every task uses the same names:

- **Closing skill:** `close-thread`, at `suite/skills/finish-navigate/close-thread/`. **Plan check:** `check-plan`, at `suite/skills/plan/check-plan/`. Both are user-invoked, completion-oriented entry points. Their Conventional Commits scopes are `close-thread` and `check-plan`.
- **`update-implementation-report`** keeps its name.
- **Method overview:** `suite/method.md` (user-facing). **Developer-facing material:** `suite/skill-authoring.md`, beside `suite/AGENTS.md`.
- **Shared format references** under `suite/shared/references/formats/`: `log-line.md`, `adr.md`, `pending-decision-bundle.md`, `roadmap-index.md`, `implementation-report.md`, plus the existing `discussion-point.md`. The three recipe references under `suite/shared/references/recipes/` stay as `whats-next`'s synced orientation material and are rewritten. `repository-conventions.md` and `trackers/github.md` are untouched.
- **`log.md` header:** the single line `# Thread log`.
- **Plan and implementation folder names:** `<yymmddhhmm>` is the folder's creation time in UTC at minute resolution. The `-<slug>` suffix is appended when the invocation names a purpose, or when a folder with that stamp already exists.
- **Seed metadata for a thread opened from a roadmap entry:** two lines, `Roadmap: docs/roadmaps/<yymmddhhmm>-<slug>.md` and `Entry: <entry-slug>`, always together.
- **Implementation report header:** `# Implementation report`, then one line `Plan: plans/<yymmddhhmm>[-<slug>]/` or `Plan: none`. The deviations section is headed `## Deviations`.
- **Pending-decision point fields:** `Blocked:`, `Why undecidable:`, `Evidence:`, optional `Suggestion:`.
- **Closing line the closing skill writes beneath a roadmap entry heading:** `Closed: <archive folder name> — <one-line outcome>`.
- **ADR catalog command:** the single shell command fixed in `plan-tasks/02-shared-format-references.md`, carried only by `formats/adr.md`.
- **`## Inputs` leading items, identical in every skill that has the section:**
  1. `docs/adr/` — the project ADR catalog, listed with the command in `references/formats/adr.md`; open the records relevant to the target. Authoritative.
  2. `docs/glossary.md` — the project's terms. Authoritative.
- **Versions:** every rewritten skill gets a minor version bump in its frontmatter; new skills start at `0.1.0`.

## Conventions every task follows

- **Current state, never the diff.** No skill body or document written under this plan contains a negation or contrast whose only referent is the replaced design (no "no longer", "anymore", "unlike before", "previously", "instead of `decisions.md`").
- **`## Inputs` shape.** A skill that reads any file carries a section headed exactly `## Inputs`: a list, each item a path with one clause stating what it is for and whether it is authoritative or material; the two fixed leading items above come first, then the thread files; a skill with one primary input names it and its accepted forms in the same section; the procedure starts from the gathered state and repeats no read. A skill that reads nothing carries no such section.
- **Write boundary inline.** Every skill states in its own body what it writes and that it writes nothing else it touches; skills other than `close-thread` state that they read but never write `docs/adr/` and `docs/glossary.md`.
- **Log appends.** Any skill that settles a point appends one line to `log.md` with a shell append (`>>`) of a single line, formatted per `references/formats/log-line.md`, the moment the point settles and before acting on it, and never opens `log.md` with a file-editing tool.
- **Skill format.** Frontmatter keeps `name`, `description`, `metadata.author`, `metadata.version`; `disable-model-invocation: true` on every entry point, omitted on primitives. Every skill ships `agents/openai.yaml` with an `interface:` block; entry points add `policy.allow_implicit_invocation: false`. No skill instructs loading another skill for rules; an entry point may invoke a primitive as `/skill-name`.
- **Terminal outcome** is preserved on every completion-oriented entry point: `REFUSED` before any artifact is written, `BLOCKED` with a pending bundle or a diagnosis, `DONE` otherwise.
- **Standing gates**, run from `suite/` after every task that touches `suite/`: `node scripts/check-marketplace-skills.mjs` exits 0, and `node scripts/sync-shared-references.mjs` run twice leaves the working tree unchanged between the two runs.
- **Skill-local references** a skill cites use the full skill-relative path (for example `references/formats/adr.md`).
- **No commits.** No task stages, commits, or pushes.

## Global Constraints

- **CLI staleness is accepted** (per decisions.md DR1). No decision in this spec is constrained by the CLI's stage catalog, target resolution, or outcome protocol; `cli/README.md`'s stage table and `documentation.test.ts` may fail until a later thread.
- **Describe the current state, never the diff.** Every document and skill body written under this spec describes the redesigned method with no negation or contrast whose only referent is the replaced design.
- **Conventions are the enforcement.** No hook, script, or permission mechanism is introduced; DR3 forbids shipping a log-append script and DR9 forbids a listing script or index file.
- **Skill format.** Skills keep the existing `SKILL.md` frontmatter conventions (`name`, `description`, `metadata`, `disable-model-invocation: true` on every user-invoked entry point, omitted on primitives). No skill instructs loading another skill for rules; an entry point may still invoke a primitive by name.
- **Terminal-outcome protocol and preflight refusals are preserved** for every completion-oriented skill, the closing skill and the plan check included: `REFUSED` before any artifact is written, `BLOCKED` with a pending bundle, `DONE` otherwise.
- **Write authority** as stated per skill: only the thread-opening operation writes `seed.md`; any settling skill appends `log.md`; the discussion, `resolve-pending-decisions`, and other settling skills write the thread's `adr/` and `glossary.md`; the spec skill, `resolve-pending-decisions`, and any other settling skill amend `spec.md`, and the discussion never does; plan skills and the plan check write under `plans/`; implementation skills write under `implementations/` and living documentation; the closing skill alone writes `docs/adr/`, `docs/glossary.md`, a roadmap index entry under `docs/roadmaps/`, and performs the archive move; the `roadmap` skill alone creates an index file.
- **Vocabulary.** `docs/glossary.md` in this repository is the naming authority; every new term introduced by this spec is defined there in the same change.
- **Commits.** Nothing in this spec authorizes a commit; the implementer follows the repository's Conventional Commits rules when the user asks.

## Tasks

1. **Retire the ten skills and their distribution entries** — remove the retired skill folders and their group folders, and drop them from `marketplace.json`, the root `README.md`, and the commit scopes. → `plan-tasks/01-retire-skills.md`
2. **Author the shared format references and rewrite the sync manifest** — add the five formats, remove the two retired references and their orphan copies, and map every reading skill to the formats it needs. → `plan-tasks/02-shared-format-references.md`
3. **Rewrite the thread-opening skills** — `allocate-thread` creates `seed.md` and `log.md`; `open-thread` and `allocate-thread` accept a roadmap index path and entry slug; `open-ticket` gains `## Inputs`. → `plan-tasks/03-thread-opening-skills.md`
4. **Rewrite `discussion`** — read the log once and the spec when present, append log lines, write draft ADRs and glossary entries with confirmation, raise conflicts, write no spec. → `plan-tasks/04-discussion.md`
5. **Rewrite `spec` and `review-spec`** — author from the conversation or the log with an audit pass, amend in place on re-invocation, append the spec `event` line, cite thread ADRs. → `plan-tasks/05-spec-and-review-spec.md`
6. **Rewrite the pending-decision skills and `emit-pending-review`** — reshape the bundle, resolve points live into log lines, spec amendments, and draft ADRs, and name the implementation folder a review targets. → `plan-tasks/06-pending-decisions-and-review-bundles.md`
7. **Rewrite `plan-brief` and `plan-strict`** — write into a new `plans/<stamp>[-<slug>]/` folder on every invocation from the spec or a referenced input. → `plan-tasks/07-plan-skills.md`
8. **Create `check-plan`** — the completion-oriented plan check that corrects a plan folder in place from the spec and queues what it cannot fix. → `plan-tasks/08-check-plan.md`
9. **Rewrite `update-implementation-report` and `implement`** — one `report.md` per implementation folder with a plan header and a deviations section; `implement` creates its folder, keeps `.runs/`, and queues contradictions. → `plan-tasks/09-implementation-report-and-implement.md`
10. **Rewrite `implement-plan` and `implement-plan-with-subagents`** — execute the newest or a named plan folder into a new implementation folder, honour earlier reports, and append log lines only from the orchestrator. → `plan-tasks/10-plan-executors.md`
11. **Rewrite `review-implementation` and `review-code`** — target the newest or a named implementation folder, read its report and the plan it names, write findings only. → `plan-tasks/11-review-implementation-and-code.md`
12. **Rewrite `roadmap`** — author the project-level index at `docs/roadmaps/` with slug-headed entries. → `plan-tasks/12-roadmap.md`
13. **Create `close-thread`** — the completion-oriented closing skill that checks, lands ADRs, merges the glossary, updates the roadmap entry, appends the closing event, and archives. → `plan-tasks/13-close-thread.md`
14. **Rewrite `finish`, `whats-next`, and the recipe references** — inspect and advise from the new layout and recommend `close-thread`. → `plan-tasks/14-finish-whats-next-and-recipes.md`
15. **Write the suite's method overview and developer material, remove the `docs/` reference** — `suite/method.md`, `suite/skill-authoring.md`; delete `docs/README.md`, `docs/thread-model.md`, `docs/skill-authoring.md`, `docs/recipes/`. → `plan-tasks/15-suite-method-text.md`
16. **Rewrite the repository layer and run the whole-change sweep** — `docs/glossary.md`, root `AGENTS.md`, root `README.md`, `.gitignore`, `suite/AGENTS.md`, then every acceptance-criteria grep and both scripts. → `plan-tasks/16-repository-layer-and-sweep.md`

# Spec: Follow-ups — instructions, model-invoked skills, `.wip/` threads, and the deletions

## Intended outcome

The skill suite under `suite/` is reorganised so that every piece of text an agent reads sits in exactly one kind of place: a skill body holds only what makes that skill itself, reusable acts live in shared **instruction** files, artifact shapes live in **format** files that all follow one skeleton, and two **model-invoked** skills give any agent the project's decisions and terms. The primitives group, the recipes, two unused skills, the lifecycle document, the archive concept, and the thread-resolution step are gone. Threads live under a hidden `.wip/` folder in a year/month tree, and every existing thread of this repository is migrated there. The repository's documents are split by audience into shipped content, the README, and maintainer documentation, with both `AGENTS.md` files reduced to pointers plus essentials. The CLI is deliberately untouched.

## Context

The previous thread implemented a set of failure-mode fixes across the suite. Reviewing the result, the maintainer found the format files inconsistent and mixed with behaviour, the "primitive" concept misnamed and mostly unnecessary, instructions in completion-oriented skills that presume a present user, verbose method documents that drift with every skill change, and several shipped pieces (recipes, `whats-next`, `finish`, semver versions) that nobody uses. The discussion recorded in `decisions.md` (DR1–DR18) settled how each is resolved and added the structural decisions this spec elaborates. `seed.md` holds the original list.

The CLI under `cli/` was designed before the suite reached its current shape. It hard-codes thread paths and names skills this thread deletes, and its documentation check holds its stage table to the published skill list. It is left behind on purpose (per `decisions.md` DR14).

## Scope

In scope, all under `suite/` plus the repository-level files named below:

- The shared reference folder: the format skeleton, the new `instructions/` kind, the new `thread.md` and `glossary.md` formats, the ADR and log-line formats reduced to format only.
- Every skill body and skill-local reference: primitive invocations replaced by instruction pointers, thread-resolution steps removed, log writes restricted, the continuation-run mode removed, the body sweep, versions set to `0.0.0`.
- The `skills/` groups: `primitives/` deleted, `model-invoked/` created with `consult-adrs` and `consult-glossary`, `finish-navigate/` renamed `close/`.
- Deletions: `shared/references/recipes/`, `whats-next`, `finish`, `suite/method.md`, `suite/skill-authoring.md` (replaced by `suite/authoring/`).
- Repository documents: `README.md`, root `AGENTS.md`, `suite/AGENTS.md`, `CONTRIBUTING.md` only where it gains a pointer, new `docs/documentation-rules.md` and `docs/working-with-threads.md`, `.claude-plugin/marketplace.json`, `.vscode/settings.json`, `shared/manifest.yaml`.
- The migration of every existing thread from `docs/threads/` to `.wip/threads/`, with reference rewrites.
- This thread's `glossary.md`, drafting the vocabulary delta for `close-thread` to merge.

Out of scope:

- Anything under `cli/`: source, tests, `cli/README.md`, `cli/AGENTS.md`. Its check is expected to fail after this thread until a `[contract]` follow-up thread realigns it (per `decisions.md` DR14). The pre-existing rows naming `reconcile-*` and `archive-thread` skills belong to that follow-up too.
- Reinstalling the maintainer's local copies of the skills.
- Any change to a skill's substantive procedure beyond what the decisions name: the sweep removes and relocates text, it does not redesign how a skill works.
- `docs/adr/` and `docs/glossary.md`: written only by `close-thread` when this thread closes.

## Expected behaviour

### Shared reference kinds

**Formats.** Every file under `shared/references/formats/` follows one skeleton (per `decisions.md` DR15): the title `# <Artifact> format`; one paragraph stating what the artifact is, where it lives, and its identifier if it has one; `## Shape` holding a fenced skeleton with placeholders, or the folder tree when the artifact is a folder; `## Rules`, one rule per bullet. No other second-level heading exists. Vocabulary an artifact fixes (the log's seven entry types) is a rule with its enumeration inline. Commands, procedures, and policies never appear in a format file.

Concretely:

- `adr.md` keeps file naming and identifier, location as status, frontmatter, and body. Its `## Citing`, `## Catalog`, and `## Conflicts` sections leave: catalog and conflicts move into `consult-adrs` (per `decisions.md` DR8); citing is already stated in the root documentation and is dropped here.
- `log-line.md` keeps the header, the one-line entry shape, the seven types, and the append-only property. Its append mechanics move into `instructions/append-log-line.md` (per `decisions.md` DR5).
- `implementation-report.md` drops the rule about being rewritten in place (per `decisions.md` DR3).
- `roadmap-index.md`, `pending-decision-bundle.md`, `discussion-point.md` are restructured to the skeleton; `discussion-point.md`'s "Discipline" is its `## Rules`. `roadmap-index.md`'s closing-line rule names the thread by its path relative to `.wip/threads/` (per `decisions.md` DR12, DR13), and the index lives at `.wip/roadmaps/<yymmddhhmm>-<slug>.md` (per `decisions.md` DR10).
- New `thread.md` (per `decisions.md` DR9, DR13): the thread as an artifact at `.wip/threads/yyyy/mm/dd-hhmm-slug/`, its identifier being that path relative to `.wip/threads/`, two same-minute threads differing in slug, and every file and folder a suite skill reads or writes inside it — `seed.md`, `log.md`, `spec.md`, `adr/`, `glossary.md`, `plans/`, `implementations/`, `.pending-decisions/`, `.pending-reviews/` — with what each holds in one line. A closed thread stays in place; its `adr/` drafts and glossary terms have moved into the project layer, and nothing else marks closure (per `decisions.md` DR12).
- New `glossary.md` (per `decisions.md` DR9): the glossary table shape shared by `docs/glossary.md` and a thread's `glossary.md`, and the rule that a thread's glossary is authoritative inside that thread.

**Instructions.** A new folder `shared/references/instructions/` holds self-contained procedures for one act each, written in the imperative to whoever performs it, naming no skill (per `decisions.md` DR7). They are declared in `shared/manifest.yaml` and synced exactly like formats. The minimum set:

| File | Act | Declared by |
|---|---|---|
| `create-thread.md` | allocate `.wip/threads/yyyy/mm/dd-hhmm-slug/`, write `seed.md` from supplied fields, create header-only `log.md` | `open-thread` |
| `append-log-line.md` | the single-line shell append of one entry, never a file-editing tool, one writer per session | `discussion`, `resolve-pending-decisions`, `spec` |
| `emit-pending-decisions.md` | queue open human decisions as a `.pending-decisions/` bundle | every skill that queued them through the primitive |
| `emit-pending-review.md` | write a `.pending-reviews/` bundle of validated findings | `review-spec`, `review-implementation`, `review-code` |
| `write-implementation-report.md` | write the implementation folder's `report.md` once, at the terminal outcome, from the run's outcome material | `implement`, `implement-plan`, `implement-plan-with-subagents` |
| `emit-terminal-outcome.md` | end a completion-oriented run with the `Outcome:` line | every completion-oriented skill |

`create-thread.md` is a shared instruction, not a skill-local reference: `decisions.md` DR7, recorded after DR1, makes readership irrelevant to placement and names thread creation as an act that qualifies, so DR7 governs here. An instruction file carries only what the performer does; the caller-precondition-and-refuse blocks the primitives opened with are dropped (per `decisions.md` DR1). Beyond the six, any block in an existing body that passes DR7's review-time test — it still reads correctly with the surrounding skill's name and purpose removed — is extracted into an instruction under the same conventions.

The `trackers/` folder and `repository-conventions.md` are unchanged.

### Skill bodies

**Structure.** Every body holds three kinds of content and nothing else (per `decisions.md` DR2, DR7): what the agent must know at invocation, inline; conditional pointers, read only when the named situation holds; step-based pointers, read when the procedure reaches the step. What stays inline is what makes the skill that skill: its posture, its inputs, its write boundary, the order of acts, and the judgment between them. Every pointer cites a full skill-relative path.

**Inputs.** Every `## Inputs` section opens by pointing at `/consult-adrs` and `/consult-glossary` in place of the catalog command and the glossary path (per `decisions.md` DR8).

**Primitive invocations.** No body names `/allocate-thread`, `/emit-pending-decisions`, `/emit-pending-review`, or `/update-implementation-report`; each such invocation becomes a pointer to the synced instruction at the same step (per `decisions.md` DR1).

**Thread resolution.** No body carries a step or sentence about resolving the active thread, checking the working directory, or choosing among thread roots. The thread is the folder holding the artifact the invocation names; an invocation that names no resolvable artifact is an ordinary input ambiguity handled per the skill's posture (per `decisions.md` DR6).

**Log writes.** Exactly `discussion`, `resolve-pending-decisions`, and `spec` append to `log.md`, each via the `append-log-line.md` pointer. The three implement skills carry no log write and no instruction about a decision settled with the user during the run; `close-thread` carries no closing log line (per `decisions.md` DR5).

**Implement skills.** The continuation-run mode is removed from `implement`, `implement-plan`, and `implement-plan-with-subagents`: no input naming the newest implementation folder, no paragraph on reusing one, no sentence on a continuation run appending to progress. Every invocation allocates its own folder and is its only writer; the report is written once at the terminal outcome (per `decisions.md` DR3).

**`close-thread`.** Lands ADRs into `docs/adr/`, merges glossary terms into `docs/glossary.md`, writes the roadmap closing line naming the thread by its path relative to `.wip/threads/`, and leaves the folder in place. No move, no rename, no archive (per `decisions.md` DR12).

**`roadmap`.** Its sentence naming `finish` and `whats-next` is removed (per `decisions.md` DR14).

**`open-thread`.** Its line about persisting no recipe name is removed (per `decisions.md` DR14); it points at `create-thread.md` where it invoked the primitive.

**Versions.** Every `SKILL.md` frontmatter reads `version: 0.0.0` (per `decisions.md` DR14).

**Descriptions.** A user-invoked skill's description is one short plain phrase saying what the skill does; a model-invoked skill's description is precise and complete about when to invoke it, at whatever length that takes (per `decisions.md` DR16). No body carries "when to use" prose.

**The sweep.** After every structural change above has landed, a sweep partitioned by skill group across subagents reads every body and skill-local reference in full and reports each hit with file, line, and class before any edit (per `decisions.md` DR4, DR16). Classes: posture mismatch; dead-concept negation; restated guarantee; skill-independent block inline; routing prose in the body; repository leakage. A hit is removed or replaced with the positive instruction it guarded, and nothing beyond the hit is rewritten.

### Skill groups and registrations

After this thread the groups are exactly: `capture-discussion/` (`discussion`, `open-thread`, `open-ticket`, `resolve-pending-decisions`), `close/` (`close-thread`), `implement/` (three skills), `model-invoked/` (`consult-adrs`, `consult-glossary`), `plan/` (three skills), `review/` (three skills), `roadmap/` (`roadmap`), `spec/` (`spec`). `primitives/`, `finish-navigate/`, `whats-next`, and `finish` do not exist (per `decisions.md` DR1, DR14).

**Model-invoked skills** (per `decisions.md` DR8) omit `disable-model-invocation` and the `policy` block in `agents/openai.yaml`, carrying the interface block alone. `consult-adrs` prints the catalog of `docs/adr/` (stem, name, description), opens the records relevant to the work at hand, and states the conflict rule: a contradiction between the work's material and a project ADR or glossary term is intentional when the thread's `adr/` holds a draft naming that ADR in `supersedes` or the thread's `glossary.md` redefines the term; every other contradiction is put to the user by an interactive agent or queued as a pending decision by a completion-oriented one, and never resolved by overriding the project record. `consult-glossary` reads `docs/glossary.md`, writes the fixed term rather than a synonym, and treats the thread's own `glossary.md` as authoritative inside that thread. Every user-invoked skill keeps `disable-model-invocation: true` and `policy.allow_implicit_invocation: false`.

**Registrations.** `.claude-plugin/marketplace.json` lists every skill folder at its new path and none of the deleted ones. `.vscode/settings.json`'s commit scopes drop `allocate-thread`, `emit-pending-decisions`, `emit-pending-review`, `update-implementation-report`, `whats-next`, `finish` and add `consult-adrs`, `consult-glossary`, sorted. `shared/manifest.yaml` drops the deleted skills' entries, declares instructions and the new formats for the skills that need them, and `node scripts/sync-shared-references.mjs` followed by a clean working tree shows the synced copies match. Stale generated copies under a skill's `references/` that the manifest no longer declares are deleted by hand.

### Thread location and migration

Threads live at `.wip/threads/yyyy/mm/dd-hhmm-slug/` and roadmap indexes at `.wip/roadmaps/` (per `decisions.md` DR10, DR13). `docs/` holds `adr/` and `glossary.md` only, plus the two maintainer documents below.

Every existing thread folder, this one included, moves to its new path with the leaf derived from the old stamp: `YYMMDDHHMMSSZ-slug` → `20YY/MM/DD-HHMM-slug` (so `260913114934Z-follow-ups` → `2026/09/13-1149-follow-ups`). Every reference to a thread by its old folder name or old path outside a thread, and every parent reference in a seed, is rewritten to the new path; thread-internal text is otherwise untouched (per `decisions.md` DR18). `docs/threads/` ceases to exist. The move lands as one commit of its own — noting the repository rule that nothing is committed unless the maintainer asks, so the implementation prepares the move and states the commit boundary rather than committing.

### Documents

**Deleted:** `suite/method.md` (per `decisions.md` DR9), `shared/references/recipes/` (per `decisions.md` DR14), `suite/skill-authoring.md` (replaced, per `decisions.md` DR17).

**Three kinds** (per `decisions.md` DR11). Shipped content is never cited as this repository's documentation. `README.md` is for an external user. Maintainer documentation is referenced from the `AGENTS.md` files.

**`README.md`:** drops `## Recipes` and `## Primitives`; keeps `## Installation` and `## Terminal outcomes`; gains a short overview of the thread folder and the project layer without restating any format's rules; its skill index carries one short prose line per skill saying what it expects and what it leaves behind (per `decisions.md` DR9); gains a `## Model-invoked skills` section for the two new skills; the `Finish & Navigate` group section becomes `Close`; links every skill by its new nested path; links to `CONTRIBUTING.md` and the maintainer documents in a contributing section.

**`docs/documentation-rules.md`** (new): the three-kind rule with the audience of each; "describe the current state, never the diff" with its test; "document only durable, properly scoped information". These move out of the root `AGENTS.md`.

**`docs/working-with-threads.md`** (new): how this repository runs on the suite it ships: threads under `.wip/threads/` in the year/month layout, roadmap indexes under `.wip/roadmaps/`, the project layer under `docs/`, that `/consult-adrs` and `/consult-glossary` are how an agent reads project decisions and terms, and which skills to reach for. It points at the README for the skill index and carries no catalog command of its own.

**`suite/authoring/`** (new, per `decisions.md` DR17), replacing `skill-authoring.md`, all in the maintainer register, each rule in one file:

- `skill-roles.md` — user-invoked and model-invoked skills and the category's definition (useful to an agent in any situation, whether or not an entry point is running); the metadata in both harnesses and the rule that they never diverge; the description rule per role; when a capability earns a separate skill; naming.
- `interaction-posture.md` — the postures; the terminal outcome and that only skills emitting it mention it; internal progress and local return contracts.
- `body-structure.md` — section headings; the three-part body (DR2); the instruction rule with its design-time and review-time tests and the inline guard (DR7); no legacy awareness; the dead-concept test and the sweep's six classes (DR4, DR16); what a review may do.
- `shared-references.md` — the manifest and sync contract; the format skeleton (DR15); the instruction kind and its register (DR7); the rule that a skill never reads another skill's files.
- `side-effects.md` — write authority and inline write boundaries; the filesystem-deletion rule; temporary workspaces.

Where a current rule spans two of these, it goes in the file of the concern under which a maintainer consults it, and the other file may point at it in one line but never restates it. The version-bump rule does not survive.

**`AGENTS.md`, root and suite** (per `decisions.md` DR11): each holds a paragraph saying what the repository or module is, the layout tree, one pointer line per maintainer document, and only the rules that must be obeyed before reading anything else. The root file's authoritative-documents table drops `suite/method.md` and lists `README.md`, `suite/authoring/`, `CONTRIBUTING.md`, the two `docs/` documents, and the `AGENTS.md` files. The root file states in one line that the CLI lags the suite and is realigned in a follow-up thread, so an agent does not attempt to fix it piecemeal (elaborating `decisions.md` DR14). The "Keep the CLI stage support reference current" rule stays as written; the follow-up thread is where it is next honoured. `suite/AGENTS.md`'s layout tree shows the eight groups and the `instructions/` folder and names no primitive. The update rules, the `CLAUDE.md` symlink note, and the marketplace-array warning stay, the last because it is a before-anything-else rule.

### Glossary delta

This thread's `glossary.md` (thread root, per `formats/glossary.md`) records: **instruction** (a shared reference holding a self-contained procedure for one act, written to whoever performs it, naming no skill); **model-invoked skill** (a skill the model may invoke at its own discretion because it is useful in any situation, whether or not an entry point is running); the thread's location and identifier (`.wip/threads/yyyy/mm/dd-hhmm-slug/`, identified by that path relative to `.wip/threads/`); the roadmap index location; and the retirement of **primitive**, **caller**, **caller-authorization block**, **recipe**, **Quick / Standard / Roadmap**, **step**, **process shape**, the **recipe vs pipeline** contrast, and **archive**. The **pipeline** and **stage** entries are left for the CLI follow-up thread to redefine on their own terms; this thread does not edit them (elaborating `decisions.md` DR14's boundary).

## Constraints

- Nothing under `cli/` is edited (per `decisions.md` DR14).
- Never commit unless the maintainer asks; the implementation reports the intended commit boundaries, including the migration as its own commit (repository rule; DR18).
- Never hand-edit a generated copy under a skill's `references/`; edit the canonical source and run `node scripts/sync-shared-references.mjs`.
- `node scripts/check-marketplace-skills.mjs` passes after the group changes.
- Every document and skill body describes the current state, never the diff: no sentence whose only referent is a design this thread removed.
- Shipped content contains no reference to this repository's organisation, decision IDs, or thread paths of this repository.
- Every skill still ships `agents/openai.yaml` with the interface block; the two harness declarations never diverge.
- Conventional Commits scopes: a change confined to one skill uses that skill's folder name; cross-module or root changes omit the scope.
- The order of work matters for the sweep: it runs last, on bodies in their final shape (per `decisions.md` DR16).

## Acceptance guidance

**FR-1 Formats follow the skeleton** (DR15)
- AC-1.1 Every file under `shared/references/formats/` has exactly two H2 headings, `## Shape` then `## Rules`, and an H1 of the form `# <Artifact> format`.
- AC-1.2 No format file contains a fenced `sh` block or the words "Catalog", "Conflicts", "Appending", or "Citing" as headings.
- AC-1.3 `formats/thread.md` and `formats/glossary.md` exist and name every path listed under "Shared reference kinds".
- AC-1.4 `formats/implementation-report.md` contains no rule about rewriting or merging an existing report (DR3).

**FR-2 Instructions exist and replace the primitives** (DR1, DR5, DR7)
- AC-2.1 `shared/references/instructions/` contains at least the six files named in the table, each with no occurrence of a skill name and no precondition-and-refuse block.
- AC-2.2 `grep -rE '/(allocate-thread|emit-pending-decisions|emit-pending-review|update-implementation-report)\b' suite/skills` returns nothing.
- AC-2.3 Every skill that previously invoked a primitive declares the corresponding instruction in `shared/manifest.yaml` and points at its synced path in the body.
- AC-2.4 `suite/skills/primitives/` does not exist.
- AC-2.5 Every completion-oriented skill declares `emit-terminal-outcome.md` and points at it at its final step.

**FR-3 Model-invoked skills** (DR8)
- AC-3.1 `skills/model-invoked/consult-adrs/SKILL.md` and `skills/model-invoked/consult-glossary/SKILL.md` exist, omit `disable-model-invocation`, and their `agents/openai.yaml` has no `policy` block.
- AC-3.2 `consult-adrs` contains the catalog command and both halves of the conflict rule; `consult-glossary` states the fixed-term rule and thread-glossary precedence.
- AC-3.3 Every `## Inputs` section in the suite opens with pointers to `/consult-adrs` and `/consult-glossary`, and no body contains the awk catalog command.
- AC-3.4 Every other `SKILL.md` carries `disable-model-invocation: true` and its `agents/openai.yaml` carries `policy.allow_implicit_invocation: false`.

**FR-4 Log writers** (DR5)
- AC-4.1 Exactly `discussion`, `resolve-pending-decisions`, and `spec` mention appending to `log.md`; the implement skills and `close-thread` contain no `log.md` write and no "settled with the user during the run" text.

**FR-5 Thread resolution removed** (DR6)
- AC-5.1 No `SKILL.md` contains "Resolve the thread", "Resolve the active thread", "cwd", or "most recent stamp".

**FR-6 Continuation mode removed** (DR3)
- AC-6.1 The three implement skills contain no input or sentence about continuing, carrying on, or resuming a previous implementation folder; each states that every invocation allocates its own folder.

**FR-7 Groups, deletions, registrations** (DR14)
- AC-7.1 The groups under `suite/skills/` are exactly the eight listed; `finish-navigate/`, `whats-next/`, `finish/` do not exist.
- AC-7.2 `shared/references/recipes/` does not exist; `grep -ri recipe suite README.md AGENTS.md` returns nothing.
- AC-7.3 `node scripts/check-marketplace-skills.mjs` passes; `.vscode/settings.json` scopes match the skill leaf names exactly.
- AC-7.4 `grep -h 'version:' suite/skills/*/*/SKILL.md | sort -u` yields only `version: 0.0.0`.
- AC-7.5 Running `node scripts/sync-shared-references.mjs` leaves the working tree unchanged, and no skill's `references/` holds a file the manifest does not declare unless it is hand-authored and cited by that skill's body.

**FR-8 Thread location and migration** (DR10, DR12, DR13, DR18)
- AC-8.1 `docs/threads/` does not exist; every former thread is at `.wip/threads/20YY/MM/DD-HHMM-slug/` with its files intact.
- AC-8.2 `grep -rn 'docs/threads\|docs/roadmaps' --exclude-dir=cli --exclude-dir=.wip --exclude-dir=node_modules .` returns nothing.
- AC-8.3 Every seed that referenced another thread resolves to an existing folder under `.wip/threads/`.
- AC-8.4 No file under `suite/` or the repository documents contains "archive" in the sense of thread archival.
- AC-8.5 `close-thread` states that the folder stays in place and lists no move among its writes.

**FR-9 Documents** (DR9, DR11, DR17)
- AC-9.1 `suite/method.md` and `suite/skill-authoring.md` do not exist; `suite/authoring/` contains exactly the five named files.
- AC-9.2 `docs/documentation-rules.md` and `docs/working-with-threads.md` exist and are linked from the root `AGENTS.md`; `suite/AGENTS.md` links each file under `suite/authoring/`.
- AC-9.3 `README.md` has no `Recipes` or `Primitives` heading, has a model-invoked skills section, and every skill link resolves to an existing `SKILL.md`; each skill entry contains an expects/leaves line.
- AC-9.4 Each `AGENTS.md` is under 80 lines and contains no rule that also appears in full in a maintainer document.
- AC-9.5 `grep -rn 'method.md' . --exclude-dir=cli --exclude-dir=.wip --exclude-dir=node_modules` returns nothing.

**FR-10 Sweep** (DR4, DR16)
- AC-10.1 A sweep report exists in this thread's implementation folder's `.runs/`, listing every hit by file, line, and class, one section per skill group.
- AC-10.2 Every listed hit is resolved in the final bodies; a manual spot-read of three bodies finds no sentence of the six classes.
- AC-10.3 Every user-invoked skill's description is a single short phrase; each model-invoked skill's description states its invocation condition.

**FR-11 Glossary delta**
- AC-11.1 This thread's `glossary.md` exists, follows `formats/glossary.md`, and carries the additions and retirements listed under "Glossary delta".

## Degrees of freedom

- Exact wording throughout, provided every stated rule is present and no removed concept is named.
- The internal structure of an instruction file (headings or none), provided it is imperative, names no skill, and covers one act.
- Whether the migration is performed by a script or by hand, and whether a helper script is kept; the mapping is fixed.
- The order in which the structural changes land and how they are grouped into commits, except that the migration is its own commit and the sweep runs last.
- Which additional blocks beyond the six named instructions are extracted, provided each passes the DR7 review-time test and is reported.
- The one-line summaries of each thread file inside `formats/thread.md`.
- The prose of the README's overview and expects/leaves lines.
- Whether the sync script needs any change to support `instructions/`; it copies arbitrary relative paths today, so likely none.

## Risks and notes

- The CLI's `npm run check` will fail after this thread, by decision. The follow-up `[contract]` thread realigns paths, deleted skills, the two `cli/` documents, and the pre-existing `reconcile-*`/`archive-thread` rows.
- The maintainer's locally installed `discussion` skill predates the suite's current version and writes `decisions.md`; this thread's records live there. The suite's `spec` reads `log.md` or the live conversation; nothing in this spec depends on that mismatch.
- Migration renames appear as moves in Git history only if done with `git mv` or detected by rename similarity; either is acceptable.

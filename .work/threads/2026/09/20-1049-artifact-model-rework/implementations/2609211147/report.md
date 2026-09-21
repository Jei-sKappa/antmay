# Implementation report

Plan: plans/2609211007/

## Outcome

The reworked artifact model the thread's `spec.md` projects is built. All fifteen plan
tasks completed, in index order, each reviewed in two independent lanes before it was
committed; nothing was skipped, blocked, or found already satisfied. The baseline was
`fcdb63c`, and the change spans 146 files across fifteen commits.

Every durable kind of information now has one home, one lifecycle, one drafter, one
landing and one citation form:

- **The project layer** gained its new kinds — decision records in `docs/adr/` and
  `docs/pdr/` under one shared format, product behavior in `docs/product/`,
  architecture description in `docs/architecture/` — with two model-invoked consult
  skills, `consult-decisions` and `consult-descriptions`, replacing `consult-adrs` and
  the retired `consult-glossary`.
- **The citation rule and the seven-step read order** are stated once, in
  `suite/shared/references/instructions/read-and-cite-the-project-layer.md`, and every
  entry-point skill opens its `## Inputs` with the project layer in that fixed order.
- **The thread** is now `change.md` plus a `delta/` folder of literal delta documents
  mirroring their targets' project-layer paths; the thread's `spec.md`, `adr/` and
  root `glossary.md` are gone from the model.
- **The skills** were renamed and rewritten: `spec` → `change`, `review-spec` →
  `review-change`; `discussion` and `resolve-pending-decisions` write only the log;
  the plan skills work from the change document and quote criteria verbatim; the three
  implement skills carry a closed deny-list write boundary and a commit provenance
  rule; `review-implementation` reads the report's new `## Acceptance` table and runs
  a thread-reference search; `close-thread` lands the delta through six ordered steps.
- **The roadmap entry** is the one home of behavior that is settled but not built, and
  **the implementation report** is the one home of traceability.
- **This repository adopted the model in its own documents**: `docs/product/method.md`
  and `docs/architecture/suite.md` were written directly (the bootstrap the plan index
  provides for), `docs/working-with-threads.md` was removed, and `README.md`,
  `CONTRIBUTING.md`, both `AGENTS.md` files, `docs/documentation-rules.md` and the
  affected authoring documents follow.

Nothing under `cli/` was touched and `docs/glossary.md` was never edited; both are
byte-identical to the baseline. The thread's `glossary.md` rows land at close.

## Changes

- `suite/shared/references/formats/` — added `decision-record.md`,
  `product-behavior.md`, `architecture-description.md`, `delta-document.md` and
  `change-document.md`; removed `adr.md`; rewrote `thread.md` around `change.md` and
  `delta/`; narrowed `glossary.md` to the project glossary; fixed the closing event in
  `log-line.md`; added the `Planned behavior:` block and its rules to
  `roadmap-index.md`; added the mandatory `## Acceptance` table to
  `implementation-report.md`.
- `suite/shared/references/instructions/` — added
  `read-and-cite-the-project-layer.md` and `search-for-thread-references.md`; updated
  `write-implementation-report.md`, `emit-terminal-outcome.md` and
  `emit-pending-review.md`.
- `suite/skills/model-invoked/` — `consult-adrs` renamed to `consult-decisions` and
  rewritten; `consult-descriptions` added; `consult-glossary` deleted.
- `suite/skills/` — `spec/spec` renamed to `change/change` and `review/review-spec` to
  `review/review-change`, both rewritten; all sixteen entry-point bodies reworked or
  at minimum re-opened with the fixed read order.
- `suite/shared/manifest.yaml` and every affected skill's mirrored `references/`
  copies, re-synced by `suite/scripts/sync-shared-references.mjs`.
- `suite/authoring/` — `body-structure.md`, `skill-roles.md`, `interaction-posture.md`
  and `side-effects.md`, each only where it named a retired skill, the `## Inputs`
  opening pair, or the write-boundary map.
- Registration — `.claude-plugin/marketplace.json`, `.vscode/settings.json` scopes,
  and the `README.md` skill index.
- Repository documents — `docs/product/method.md` (new),
  `docs/architecture/suite.md` (new), `docs/working-with-threads.md` (removed),
  `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `suite/AGENTS.md`,
  `docs/documentation-rules.md`.

## Verification

Each task's own verification block ran in full, with `fcdb63c` substituted wherever a
brief wrote the planning-time baseline `fe83a4f`. The default `grep` on this machine is
a `ugrep` wrapper honouring `--ignore-files`, which was found to mask hits in ignored
paths; from that point on every negative sweep was re-run with `/usr/bin/grep`.

- **Standing gates** — `node scripts/sync-shared-references.mjs`,
  `node scripts/check-marketplace-skills.mjs` and `node scripts/check-skill-text.mjs`,
  run from `suite/`, all exit 0 after every task, and were re-confirmed by the
  orchestrator immediately before each of the fifteen commits. Final state: 18 skills,
  146 files walked, sync idempotent.
- **Whole-change sweeps** (task 15, over the finished tree, all clean): no file under
  `suite/`, `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `docs/documentation-rules.md`,
  `docs/product`, `docs/architecture`, `.claude-plugin`, `.vscode` or `.github` names
  `spec.md`, `review-spec`, `consult-adrs`, `consult-glossary` or the binding test; no
  retired thread file (`adr/`, a thread-root `glossary.md`) is named; no `FR-`/`AC-`
  identifier survives except as the thing not to write; no format defines a `status`,
  `lifecycle` or `kind` key on a project-layer file and no skill states a record-count
  threshold; `suite/authoring/` differs only in the four permitted files.
- **Invariants** — `git diff --quiet fcdb63c -- cli/` and
  `git diff --quiet fcdb63c -- docs/glossary.md` pass at every task and at the end; the
  orchestrator re-ran both independently after the final task.
- **Byte-identity check** — the `AGENTS.md` files are durable working memory paragraph
  in `docs/documentation-rules.md` is byte-identical to the baseline.
- **Non-mechanical reads** performed where a brief required one: the three new formats
  against the format skeleton; the `change` body read as a fresh agent handed a settled
  log; the four capture-discussion bodies against the dead-concept test;
  `close-thread`'s checks and writes against the spec's `### Landing` order;
  `docs/product/method.md` against the built-only admission rule. Every factual claim
  in the two new description documents was cross-checked against the suite on disk.

**Not run:** the CLI's own gate (`cli check`, `cli lint`, `cli scenarios`). `cli/` is
on hold and byte-identical to the baseline; `cli check` is expected to fail, which is
recorded under `## Follow-ups` rather than repaired.

Two tasks needed one fix iteration each before both lanes passed. Task 05 was corrected
for an unsorted scopes array and for writing the artifact as a bare "change" against the
thread glossary. Task 14 was corrected for a factual error stating that the roadmap
index is edited in place through the `roadmap` skill, which that skill explicitly
refuses to do.

## Deviations

- **`suite/authoring/body-structure.md` was edited in task 01** — departs from
  `spec.md` `## This repository's adoption`, which permits `suite/authoring/` to differ
  only where it names a retired skill or the `## Inputs` opening pair — because the
  task's own verification forbids any surviving `formats/adr.md` reference and that
  document used it twice as its illustrative pointer example. The minimal resolution
  was taken: the example paths were renamed and no rule changed.
- **`suite/AGENTS.md` was edited in task 02** — departs from that task's `Files
  modified` list — because its own sweep over `suite/` could not otherwise pass. Two
  skill names on the layout line changed and nothing else.
- **`docs/documentation-rules.md` and `AGENTS.md` were edited in task 14** — departs
  from that task's `Files modified` list — because its `working-with-threads` sweep
  spans `docs/` and `AGENTS.md`. One pointer line in each was swapped; task 15 then
  completed both files as its own brief directs.
- **Five files beyond task 15's five were edited** — authorised by that task's step 6
  "fixed at its source" clause — to clear sweep failures and stale retired terms:
  `suite/authoring/skill-roles.md`, the canonical `emit-terminal-outcome.md` and
  `emit-pending-review.md`, and two `agents/openai.yaml` short descriptions.
- **`## The change document` and `## Draft the delta documents` in the `change` skill
  restate what the change-document format holds** — departs from
  `suite/authoring/body-structure.md`'s no-leak rule — because the task's steps
  prescribe that content inline and its verification greps the body for it.
- **The routing table's eighth row reads "no method-owned home"** rather than the
  spec's `### Routing` cell "out of scope of this thread" — departs from that section's
  verbatim text — because shipped content must be project-free; the wording comes from
  the thread's `log.md`.
- **The consult skills' listing commands use `find … | while read`** rather than a
  glob loop — the spec's `## Degrees of freedom` leaves them free — because a bare glob
  aborts under zsh's `nomatch` instead of exiting 0 on an absent folder, as the task
  required.

## Remaining concerns

- The `<review-specific category>` placeholder in `emit-pending-review.md` was reworded
  because task 15's sweep pattern `review-spec` lacks a word boundary and matches that
  substring. Task 06 had identified the same hit as a false positive and left it. The
  reword is accurate, but the underlying defect is the plan's pattern, and the original
  wording could be restored if a later sweep is tightened to `\breview-spec\b`.
- `suite/shared/manifest.yaml` declares
  `instructions/read-and-cite-the-project-layer.md` for `review-implementation` and for
  `close-thread`, and neither body cites it —
  `suite/authoring/shared-references.md` forbids declaring a file a skill does not use.
  No mechanical gate detects it.
- The closed deny-list write boundary in the three implement skills does not admit
  `.pending-decisions/` at the thread root, although each `## Blocked` writes a bundle
  there. The spec's own `## Skills whose roles change` row carries the same closed list,
  so this is a question about the design rather than a transcription slip;
  `suite/authoring/side-effects.md` resolves it in practice through its
  temporary-workspaces carve-out.
- `docs/architecture/suite.md` restates `suite/AGENTS.md` near-verbatim on distribution
  and the gates. Defensible under `docs/documentation-rules.md`, since the audiences
  differ, but it is a maintenance coupling.
- `suite/AGENTS.md`'s skill-group tree is hand-maintained and no check verifies it
  against `suite/skills/`; it is correct now but will drift silently on the next rename.
- Plan-text defects encountered and resolved in favour of each task's verification,
  recorded so a later plan does not repeat them: task 06's `review-spec` sweep and task
  15's `spec\.md` sweep both lack word boundaries; task 07's brief called a step
  "unchanged" while its own grep forbade the text that step contained; task 08's brief
  asked the `roadmap` skill to name the whole project layer as read-and-never-written
  although the roadmap index is itself part of the project layer and is that skill's one
  write; task 15's step 7 listed an `adr/` CLI drift item that does not exist in `cli/`.
- `open-thread` composes seeds from an entry's sketch and scope boundary only, and now
  misses the entry's planned behavior that task 08 introduced.
- The spec's `## The project layer` preamble carries the same loose roadmap-index
  wording that was corrected as a factual error in `docs/product/method.md`.

## Follow-ups

**CLI drift.** Nothing under `cli/` was touched, per the repository's CLI-on-hold rule.
A single `[contract]` realignment thread should absorb all of the following:

- The stage catalog and stage ids name the retired skills: `cli/src/pipeline/catalog.ts`
  defines `spec` and `review-spec` stages, `cli/src/pipeline/stage-id.ts` lists both in
  its stage-id union, and `catalog.test.ts` and `stage-id.test.ts` assert the same
  names. The suite now ships `change` and `review-change`.
- Thread paths in target resolution and composition still name `spec.md`:
  `cli/src/pipeline/catalog.ts` (`specFile`, `specTarget`, the `when-spec-present` rule
  for `plan-brief`), `cli/src/pipeline/targets.ts`, `cli/src/pipeline/composition.ts`,
  and their tests. The thread now holds `change.md` and `delta/` and no `spec.md`.
- The executor's Git boundary selectors still allow `spec.md` rather than `change.md`
  and `delta/`; a `change` stage needs `change.md` plus the whole `delta/` subtree in
  its allowed set, and the commit-subject templates still read `spec`.
- `cli/README.md`'s stage-support table and artifact-state prose describe a thread
  holding `spec.md` and list `review-spec` among supported stages. The root `AGENTS.md`
  rule to keep that table current is suspended while the CLI is on hold, so this is
  recorded rather than edited.
- `cli/src/pipeline/documentation.test.ts` reads this repository's root `README.md` and
  `cli/README.md` to hold the stage-support table to the published skill list. The
  README skill index and the skill names both changed, so this test now fails and the
  `cli check` CI job fails with it until the realignment thread lands.
- Pre-existing drift older than this thread, noted so the pass is scoped once: the
  catalog and `cli/README.md` name `reconcile-spec` and `reconcile-plan` stages for a
  `suite/skills/reconcile/` group the suite does not hold, and `cli/README.md` shows a
  thread root of `docs/threads/` rather than `.work/threads/`.

**Suite follow-ups.**

- Resolve the two unused `read-and-cite-the-project-layer.md` manifest declarations,
  either by pointing at the instruction from the place that uses the citation form or by
  dropping the declarations and deleting the two orphaned mirrored copies.
- Decide whether the implement skills' deny-list boundary should admit
  `.pending-decisions/` explicitly, and align the spec if so.
- Give `open-thread` the entry's planned behavior when composing a seed.
- Consider a mechanical check over `suite/AGENTS.md`'s skill-group tree, which no gate
  verifies today.

**Thread follow-up.** The thread's `glossary.md` rows have not landed; they merge into
`docs/glossary.md` when `close-thread` runs, which is also when the retired **spec**,
**binding test** and `consult-adrs` rows leave the project glossary.

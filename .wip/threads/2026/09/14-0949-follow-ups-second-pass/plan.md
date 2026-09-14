# Plan: Follow-ups second pass — pointers, inputs, and the reference files

Source: spec.md

## Objective and context

Sweep every skill body and every shared reference file under `suite/` so that skill-local pointers carry the literal `<skill_path>/` prefix, the project decision and glossary files open every `## Inputs` list as inputs read via the consult skills, every Inputs item has one shape with its presence stated and no trailing tag, every reference pointer reads as a directive with nothing of the pointed file restated around it, every exit of every completion-oriented body goes through `emit-terminal-outcome.md`, `log-line.md` regains its types overview, the three indented fences go flush left, and a new script `suite/scripts/check-skill-text.mjs` holds the mechanical part of that in place from CI. No skill's procedure changes; `cli/` is not touched.

Before opening any task file, read `spec.md` in full and `decisions.md` (DR1–DR9). The spec's `## Expected behaviour` is the contract each task realises; its `## Acceptance guidance` (AC-1.1 … AC-9.3) is what each task's verification checks. Task briefs cite both by identifier.

Facts the whole plan rests on:

- **Sequence.** Canonical formats first, then canonical instructions, each followed by a sync; then the bodies in four groups; then the authoring documents; then the check script, its wiring, and the whole-tree verification. The spec fixes this order under `## The sweep itself`; the order of bodies inside a group is free.
- **Base commit.** `$BASE` in every verification block is the commit the run started from — `9ad8686` (`docs(follow-ups-second-pass): spec`) when this plan was written. Comparisons against it hold whether or not earlier tasks were committed, because no task edits a `SKILL.md` outside its own group.
- **Sync.** Every task that edits `suite/shared/references/` runs `node scripts/sync-shared-references.mjs` from `suite/` before its verification and never hand-edits a copy under a skill's `references/`. The hand-authored skill-local references (`worked-example.md`, `reviewer-policy.md`, `code-quality-reviewer.md`, `plan-compliance-reviewer.md`, `supplied-ticket.md`) are not synced and are edited directly, for the pointer prefix only; `worked-example.md` holds no `references/` pointer and is left alone. `open-ticket`'s `repository-conventions.md` and `trackers/github.md` are synced copies declared in `shared/manifest.yaml`, whose canonical files hold no `references/` pointer, so they are never hand-edited and nothing changes in them.
- **Register.** Shipped content (`suite/skills/`, `suite/shared/references/`) is written to the invoked agent in any project: no decision identifiers, no thread paths of this repository, no explanation of how this repository is organised. The `DR<N>` identifiers this plan cites never appear in a body or a reference file.
- **The prefix is literal.** `<skill_path>/` is written exactly so, angle brackets included, before every path inside the skill's own folder — in bodies and inside shared reference files alike. Project paths (`docs/adr/`, `docs/glossary.md`, `.wip/…`, thread files) stay bare.
- **The two vocabularies.** `implement-plan-with-subagents` defines skill-local reply tokens and lane verdicts (`DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_CONTEXT`, `PASS`, `ISSUES`). Those are its own return contract and are untouched by this sweep. What leaves the bodies is the literal `Outcome:` line and any enumeration of the three terminal tokens as a vocabulary; naming one token as the parameter at an exit stays.
- **The twelve declarers** of `emit-terminal-outcome.md` in `shared/manifest.yaml` — `spec`, `plan-brief`, `plan-strict`, `check-plan`, `implement`, `implement-plan`, `implement-plan-with-subagents`, `review-spec`, `review-implementation`, `review-code`, `roadmap`, `close-thread` — are the bodies whose exits change. The four `capture-discussion` bodies and the two model-invoked bodies have no exits to change.
- **The sixteen Inputs bodies** are every `SKILL.md` except `consult-adrs` and `consult-glossary`.
- **Early-life sentence.** Only `discussion` carries one. The spec leaves other bodies to the implementer's judgment; this plan settles it as none, because no other body is normally invoked while the thread holds only `seed.md` and a header-only `log.md`. Record a departure from this in the implementation report.
- **Standing gate.** `node scripts/check-marketplace-skills.mjs` runs from `suite/` in every task; no skill is added, removed, or renamed, so it passes throughout.

## Global Constraints

- No skill's substantive procedure changes: posture, inputs, write boundary, order of acts, and the judgment between them stay as they are. A reviewer comparing a body before and after should find only the wording and structure this spec names.
- The format skeleton in `shared-references.md` is not relaxed (per `decisions.md` DR6): third-level headings under `## Shape` are the only structural addition, and only in `log-line.md`.
- Generated copies under a skill's `references/` are never hand-edited; the canonical source changes and the sync script runs.
- The new script uses only `node:` built-ins and runs from `suite/`, like the two existing scripts.
- `cli/` is not touched, and its documentation check is not expected to pass until its own follow-up thread.
- Commits follow Conventional Commits; a change spanning modules omits the scope. Nothing is committed unless the maintainer asks.
- The root `AGENTS.md` rule on the CLI stage-support table is not triggered: no skill's invocation posture, accepted inputs, durable outputs, or side-effect boundaries move.

## Tasks

1. **Canonical formats: the types overview and flush-left fences** — restructure `log-line.md`'s `## Shape` and `## Rules` around a `### Types` subheading, de-indent the fences in three format files, sync. → `plan-tasks/01-canonical-formats.md`
2. **Canonical instructions: prefixed directive pointers and the every-exit sentence** — prefix and rephrase the four instruction→format pointers, add the one sentence to `emit-terminal-outcome.md`, sync. → `plan-tasks/02-canonical-instructions.md`
3. **Sweep the `capture-discussion` and model-invoked bodies** — `discussion`, `open-thread`, `open-ticket`, `resolve-pending-decisions`, `consult-adrs`, `consult-glossary`, plus `supplied-ticket.md`: prefix, project-layer inputs, one Inputs shape, directive pointers. → `plan-tasks/03-bodies-capture-discussion-and-model-invoked.md`
4. **Sweep the `spec`, `plan`, and `roadmap` bodies** — `spec`, `plan-brief`, `plan-strict`, `check-plan`, `roadmap`: the same four rules plus every exit through the terminal-outcome instruction. → `plan-tasks/04-bodies-spec-plan-roadmap.md`
5. **Sweep the `implement` bodies** — `implement`, `implement-plan`, `implement-plan-with-subagents`, plus the three hand-authored reviewer references: the same five rules, with the skill-local reply tokens left alone. → `plan-tasks/05-bodies-implement.md`
6. **Sweep the `review` and `close` bodies** — `review-spec`, `review-implementation`, `review-code`, `close-thread`: the same five rules, with the authority-anchor ranking kept in prose. → `plan-tasks/06-bodies-review-and-close.md`
7. **State the rules in the authoring documents** — `body-structure.md`, `shared-references.md`, `interaction-posture.md` carry the prefix, the project-layer inputs, the Inputs shape, the directive rules, the heading/path distinction, and the every-exit sentence. → `plan-tasks/07-authoring-documents.md`
8. **Write and wire the text check, then verify the whole tree** — `suite/scripts/check-skill-text.mjs`, its CI step, its mention in `CONTRIBUTING.md` and `suite/AGENTS.md`, and the full acceptance run. → `plan-tasks/08-text-check-and-wiring.md`

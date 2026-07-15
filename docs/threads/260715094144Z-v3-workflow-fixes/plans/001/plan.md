# Plan: V3 workflow fixes — apply the seed-discussion decisions to the skill suite

Source: seed/discussions/260715102305Z-v3-skill-review-notes-decision-log.md

## Objective and context

Apply the seventeen settled decisions (P1–P17) from the seed decision log to the V3 skill suite in this repository. The log is the contract: every task below cites the decisions it implements. Two decisions require no change (P6 — `create-thread` stays a primitive; P16 — the implementation report stays a singleton) beyond the rename P8 applies. P5 was revised by P7 and is implemented in its P7 form (formats as shared references, no `record-decision` primitive).

Plan-level facts the implementer needs before opening any task file:

- The working tree is this repository itself; all paths in task files are repo-relative from the repo root.
- Copies under any skill's `references/shared/` are GENERATED. Never hand-edit them: edit the canonical source under `shared/references/` and run `node scripts/sync-shared-references.mjs`.
- Per repo convention, bump the `version:` frontmatter of every skill meaningfully changed; task 07 owns the sweep.
- This plan deliberately compiles from a decision log rather than a spec (owner's instruction); the log's `Decision:` fields are authoritative. Where a task's wording and the log disagree, the log wins.

## Global Constraints

- "never write instructions that delete, empty, or erase user filesystem content into a skill unless the user explicitly asks, with the sole exception of pending-queue consumption" (P14)
- "The razor must not creep: the remaining five primitives (`allocate-thread`, `emit-pending-decisions`, `emit-pending-review`, `update-implementation-report`, `append-roadmap-feedback`) are genuinely behavioral and stay skills." (P7)
- "Runtime bodies stay SILENT about deletion — no 'never delete' clause and no 'you may delete' clause" (P14)
- The source states no further plan-wide constraints; per-decision constraints are cited inside each task.

## Tasks

1. **Update the canonical V3 convention docs** — encode P1, P7, P8, P11, P12, P13, P14, P15, P17 in `docs/project/v3/` so every later task implements against written convention. → `tasks/01-canonical-docs-conventions.md`
2. **Create the format shared references and dissolve `discussion-point`** — `formats/discussion-point.md` (with P10 amendments) and `formats/decision-record.md`; rewire `discussion`, `resolve-pending-decisions`, `emit-pending-decisions`; remove the primitive. → `tasks/02-format-shared-references.md`
3. **Rename `create-thread` → `allocate-thread` and rewrite all primitive descriptions** — folder, frontmatter, callers, registries; P9 description template on all five primitives. → `tasks/03-allocate-thread-and-primitive-descriptions.md`
4. **Overhaul the `spec` skill's contract** — seven elements, degrees-of-freedom bar, unified blocked protocol with fullest-derivable emission, section removals. → `tasks/04-spec-skill-contract.md`
5. **Unify the blocked protocol across the remaining completion-oriented skills** — plans, propose, merge, reconciles, reviews, roadmap and misc; plan-strict worked-example extraction. → `tasks/05-completion-skills-blocked-protocol.md`
6. **Overhaul the implement trio** — unified blocked protocol, bounded failed-commit loop, roadmap-feedback extraction, run-workspace persistence and naming. → `tasks/06-implement-trio-overhaul.md`
7. **Run the suite-wide mechanical sweeps** — `## Procedure` rename, `agents/openai.yaml` interface blocks everywhere, version bumps, registry and doc consistency. → `tasks/07-suite-wide-sweeps.md`

# Plan: Project V3 workflow cutover

This plan compiles the approved Project V3 cutover spec into 39 sequential, independently dispatchable tasks. Executed in order, they migrate the skill suite to V3 (renames, retirements, six new model-invoked primitives, nine new user-invoked skills, deep rewrites, retained-skill alignment), create the canonical `docs/project/v3/` documentation, build the shared-reference sync tooling, update every derived repository file, and regenerate the Raycast manifest — leaving V1/V2 documentation and pre-V3 threads untouched.

Source: specs/001/spec.md

**Authority.** The spec plus the decision-log records it cites are the contract. The decision log is `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` (64 append-only records; `P<N>` citations in this plan refer to it). The spec's "How to read the decision log — supersession map" identifies which records are dead; never re-derive an obsolete decision from the log. The spec's Degrees of freedom section grants the implementer the *hows* (prose, wording, template phrasing, version values, script internals, slug schemes, git mechanics, README presentation); everything else is pinned.

**Path resolution.** Thread-relative paths in this plan (`specs/001/spec.md`, `seed/discussions/…`) resolve against this plan's thread root, `docs/threads/260711150919Z-v3-workflow-kinds/`. All other paths (`skills/…`, `docs/project/…`, `shared/…`, `scripts/…`) are repo-root-relative.

**Verification environment.** This repository has no build, test, or lint pipeline. Verification is filesystem inspection, `grep`/`git` commands, and reading the named file against the stated rule. Node is available for the two sync scripts.

**Skill-body hygiene.** Every task that creates or rewrites a `SKILL.md` carries a binding "Skill-body hygiene" block (four rules: only-what-the-executing-agent-needs, no repo-internal concept leaks, removal-by-silence, state-each-rule-once) and checks it in that task's acceptance criteria. These are quality expectations within the spec's Degrees of freedom #1; where they appear to conflict with a pinned contract, the spec wins.

## Global Constraints

- **Conventions-first**: no evaluator, CLI, obligation graph, contract lockfile, enforcement, or machine-authoritative state anywhere in the deliverables; the P64 script is the only executable code shipped (P10, P64). Absence of a bundle or artifact never proves an operation ran unless that artifact is the operation's declared durable output (P36, P46).
- **Clean cutover, no compatibility**: no V1/V2 branches inside skills, no legacy skill distribution, no old-thread migration; `docs/workflow/v1/` and `docs/workflow/v2/` and all pre-V3 threads are not modified (P14). This design thread stays structurally V2; its own artifacts (including this spec) follow V2 conventions (P14).
- **No residual V2 vocabulary in active skills**: no tiers, ledgers, lineage folders, frontmatter status latches, artifact versions, `.wip/`, durable review records, or mention of earlier thread layouts (P51, P63).
- **P50 boundary**: implementation skills' execution and commit mechanics are out of bounds beyond the enumerated migrations.
- **Metadata synchronization**: a skill must never be user-only in one harness and implicitly invocable in the other (P48).
- **Composition rules**: one-way invocation only, named via `/skill-name` prose; no cycles; no cross-skill `references/` reads (P29, P55).
- **Concurrency safety**: temporary bundle and run-directory allocation must be safe for concurrent producers — unique paths, never a shared singleton (P33, P36, P40).
- **Existing repo conventions stand where V3 does not supersede them**: leaf directory name matches frontmatter `name:`; `metadata.author`/`metadata.version` frontmatter with semver bumps on meaningful change and new skills starting at `1.0.0`; marketplace alphabetical order with deprecated last; the Raycast manifest is generated, never hand-edited; deliverable skills keep their no-preamble rule.
- **Lossless boundary for skill rewrites**: rewrites encode the cited decisions; retained skills change only what P51 names unless a direct V3 contradiction is discovered.

## Tasks

1. **Restructure the skill tree** — perform every rename, promotion, and retirement move so the tree has its final V3 shape. → `tasks/01-restructure-skill-tree.md`
2. **Primitive: discussion-point** — create the canonical discussion-point primitive. → `tasks/02-primitive-discussion-point.md`
3. **Primitive: emit-pending-decisions** — create the pending-decision bundle emitter. → `tasks/03-primitive-emit-pending-decisions.md`
4. **Primitive: emit-pending-review** — create the review findings-bundle emitter. → `tasks/04-primitive-emit-pending-review.md`
5. **Primitive: create-thread** — create the normalized thread-creation primitive. → `tasks/05-primitive-create-thread.md`
6. **Primitive: update-implementation-report** — create the singleton-report merge primitive. → `tasks/06-primitive-update-implementation-report.md`
7. **Primitive: append-roadmap-feedback** — create the roadmap-feedback append primitive. → `tasks/07-primitive-append-roadmap-feedback.md`
8. **Rewrite open-thread** — V3 thread genesis delegating creation to `/create-thread`. → `tasks/08-rewrite-open-thread.md`
9. **Rewrite discussion** — live interview writing `D<N>` records to the singleton `decisions.md`. → `tasks/09-rewrite-discussion.md`
10. **New skill: resolve-pending-decisions** — the interactive bridge that consumes pending-decision bundles. → `tasks/10-new-resolve-pending-decisions.md`
11. **Rewrite propose** — thread-root `proposal.md` with no V2 machinery. → `tasks/11-rewrite-propose.md`
12. **Rewrite reconcile-proposal** — convert the renamed review skill to the reconciliation contract. → `tasks/12-rewrite-reconcile-proposal.md`
13. **Rewrite spec** — thread-root `spec.md` with no V2 machinery. → `tasks/13-rewrite-spec.md`
14. **New skill: reconcile-spec** — lossless, additive-free decision-fidelity reconciliation. → `tasks/14-new-reconcile-spec.md`
15. **Rewrite review-spec** — read-only handoff-quality review emitting pending-review bundles. → `tasks/15-rewrite-review-spec.md`
16. **Rewrite plan-brief** — the one-screen plan succeeding plan-loose. → `tasks/16-rewrite-plan-brief.md`
17. **Rewrite plan-strict** — thread-root `plan.md` plus `plan-tasks/` with no V2 machinery. → `tasks/17-rewrite-plan-strict.md`
18. **Rewrite reconcile-plan** — convert the renamed review skill to plan-spec reconciliation. → `tasks/18-rewrite-reconcile-plan.md`
19. **New skill: roadmap** — roadmap authoring emitting `roadmap.md` and eager `roadmap-feedback.md`. → `tasks/19-new-roadmap.md`
20. **New skill: reconcile-roadmap** — roadmap decision-fidelity reconciliation. → `tasks/20-new-reconcile-roadmap.md`
21. **New skill: review-roadmap** — read-only decomposition-handoff review. → `tasks/21-new-review-roadmap.md`
22. **New skill: materialize-roadmap-threads** — idempotent child-thread materialization. → `tasks/22-new-materialize-roadmap-threads.md`
23. **Author the canonical workflow templates** — the three seed-ready `## Suggested workflow` sources under `shared/references/`. → `tasks/23-author-canonical-workflow-templates.md`
24. **Shared-reference sync tooling** — `shared/manifest.yaml`, `scripts/sync-shared-references.mjs`, and the generated committed copies. → `tasks/24-shared-reference-sync-tooling.md`
25. **Migrate implement** — V3 paths, run workspace, singleton report; commit mechanics preserved. → `tasks/25-migrate-implement.md`
26. **Migrate implement-plan** — same migration for the plan executor. → `tasks/26-migrate-implement-plan.md`
27. **Migrate implement-plan-with-subagents** — same migration preserving the subagent orchestration. → `tasks/27-migrate-implement-plan-with-subagents.md`
28. **Rewrite review-implementation and review-code** — strictly read-only delivered-work reviews with shared authority anchors. → `tasks/28-rewrite-review-implementation-and-review-code.md`
29. **Rewrite merge-artifacts** — explicit candidate paths, root artifacts, singleton decision log. → `tasks/29-rewrite-merge-artifacts.md`
30. **Rewrite finish** — the advisory delivery handoff. → `tasks/30-rewrite-finish.md`
31. **Rewrite whats-next** — the evidence-based read-only advisor. → `tasks/31-rewrite-whats-next.md`
32. **Rewrite archive-thread** — explicit-intent archival with the pending-state warning. → `tasks/32-rewrite-archive-thread.md`
33. **Align the retained skills** — open-ticket's passive-tracker wording plus metadata and vocabulary alignment for the seven others. → `tasks/33-align-retained-skills.md`
34. **Author docs/project/v3 core documents** — `README.md`, `thread-model.md`, `skill-authoring.md`. → `tasks/34-author-project-docs-core.md`
35. **Author the three workflow documents** — `workflows/quick.md`, `standard.md`, `roadmap.md`. → `tasks/35-author-workflow-docs.md`
36. **Update marketplace, VS Code scopes, and .gitignore** — the mechanical derived files. → `tasks/36-update-marketplace-vscode-gitignore.md`
37. **Update the root README** — workflow table and final skill index. → `tasks/37-update-root-readme.md`
38. **Update AGENTS.md** — the V3 ruleset pointer and revised repository conventions. → `tasks/38-update-agents-md.md`
39. **Regenerate Raycast and verify the cutover** — run the Raycast generator and execute the full acceptance sweep. → `tasks/39-regenerate-raycast-and-verify.md`

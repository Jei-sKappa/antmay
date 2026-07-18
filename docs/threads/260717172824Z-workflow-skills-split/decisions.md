# Decision log — workflow-skills-split

## DR1: Split into two repositories via in-place rename plus a fresh reusable repo

Context: The repository currently hosts both workflow-bound skills and context-agnostic reusable skills. The boundary is clean — the reusable set is exactly four whole groups (`documentation`, `handoff`, `research`, `support`, 8 skills total), with zero invocation or shared-reference coupling across the boundary; everything else (30 skills, `docs/`, `shared/`, `scripts/`, and the future orchestration CLI) is workflow-side. The owner is the only consumer today, so breaking the existing `Jei-sKappa/skills` install path costs nothing. A hard requirement is that the workflow repository preserve the full existing git history; the reusable repository has no such requirement and may start fresh. The CLI will only orchestrate the skills as an external consumer — the skills must keep working when invoked directly by a person — so both sets remain independently installable skill collections regardless of how they are partitioned.

Decision: Split into two repositories. Rename the current repository in place to a new workflow-dedicated name (name to be decided separately), which preserves its full git history, issues, and stars with no git surgery. In the renamed workflow repository, remove the four reusable groups and their `README.md`, `.claude-plugin/marketplace.json`, and commit-scope registrations; it keeps the 30 workflow skills, `docs/`, `shared/`, `scripts/`, and becomes the home of the future CLI. Separately, create a brand-new repository named `skills`, seeded from scratch with the 8 reusable skills and its own minimal README and marketplace registration.

Rationale: An in-place rename satisfies the history requirement with zero git surgery, unlike extracting workflow history into a new repo via `git filter-repo`, which rewrites hashes for a worse result. Because the owner is the sole consumer, the GitHub rename-redirect hazard (existing `Jei-sKappa/skills --skill <name>` references silently resolving to a reusable-only repo) has no teeth, so keeping the historied repo on the workflow side and starting the reusable repo fresh is safe. Starting the reusable repo from scratch matches the owner's view that those skills carry less accumulated design thought. The reusable skills' past commits naturally remain in the workflow repo's history after their folders are deleted, which is expected and does not undermine the record of sustained work.

## DR2: Remove the open-ticket skill entirely

Context: `capture-discussion/open-ticket` creates a remote tracker ticket so an idea has a work-item home before or instead of a local thread. It has never been used. It is a leaf in the invocation graph — no other skill invokes `/open-ticket` — so its only references are its registration entries in `README.md` and `.claude-plugin/marketplace.json`. It sits in the workflow-side `capture-discussion` group, so under DR1 it would otherwise stay in the workflow repository.

Decision: Remove the `open-ticket` skill entirely rather than carrying it into either repository. Delete `skills/capture-discussion/open-ticket/` and its `README.md`, `.claude-plugin/marketplace.json`, and commit-scope registrations.

Rationale: The skill has never been used, and removing it now eliminates an open placement question (its tracker-facing nature made its workflow-vs-reusable classification a judgment call) before the split rather than carrying dead weight forward. Removal is clean because nothing invokes it. If a tracker-entry capability is wanted later, it can be reintroduced deliberately.

## DR3: Remove the Raycast extension

Context: The repository ships a Raycast extension under `raycast-extension/` that turns each skill into a paste-ready prompt, derived from `skills/**/SKILL.md` via a sync script. The owner used it early on but no longer does and does not find it valuable. Under DR1's split it would otherwise need dual-source handling or an arbitrary assignment to one of the two repositories.

Decision: Remove the Raycast extension. Delete the `raycast-extension/` folder and the `README.md` section documenting it.

Rationale: It is unused and provides little value, and removing it eliminates the question of how a derived, single-source-of-truth extension should behave across a two-repository split. It is standalone derived tooling with no runtime coupling to any skill, so removal is clean. It can be recreated from the skill sources later if wanted.

## DR4: Name the workflow repository `antmay`

Context: DR1 settled that the current repository is renamed in place to a new workflow-dedicated name, leaving the fresh reusable repository as `skills`, but deferred the actual workflow-repo name. That name is the last blocker to acting on the split.

Decision: Name the workflow repository `antmay`. This is the name the current repository is renamed to under DR1, and the identity under which the workflow skill suite, its documentation, and the future orchestration CLI live.

Rationale: Chosen by the owner. It does not collide with the reusable `skills` repository and gives the workflow suite a distinct product identity of its own.

## DR5: Authoring conventions and structure carried into the new `skills` repo

Scope: the fresh `skills` repository created under DR1

Context: DR1 creates a brand-new `skills` repository seeded from scratch with the 8 reusable skills (four whole groups: `documentation`, `handoff`, `research`, `support`). The current `AGENTS.md` mixes workflow-specific conventions (group-as-workflow-stage framing, primitives, thread model, shared-references tooling, V3 conventions) with generic skill-authoring rules the reusable skills still depend on: `SKILL.md` frontmatter format and versioning, the `agents/openai.yaml` universal interface block, marketplace/README registration, "describe the current state, never the diff", and "deliverable skills — no preamble" (whose four named skills — `meta-prompting`, `consult-the-expert`, `report-to-the-owner`, `brief-the-recipient` — are all reusable). Because the two repositories share no files, the reusable repo must carry its own authoring doc.

Decision: The new `skills` repository gets its own `AGENTS.md` derived from the current one by copying it and removing all workflow-specific content, keeping only the generic skill-authoring rules the reusable skills depend on. Beyond `AGENTS.md`, the repo carries a `README.md` and the files needed to manage the plugins (its own `.claude-plugin/marketplace.json` and equivalents) — and nothing workflow-specific. The reusable skills keep their existing 4-group structure and the one-plugin-per-group marketplace pattern; "start from scratch" means fresh git history and a trimmed authoring doc, not reorganizing the skills themselves.

Rationale: The generic authoring conventions are what keep the reusable skills maintainable and consistent, so they must travel with the skills rather than be left behind in `antmay`. Deriving the reusable `AGENTS.md` by subtraction from the existing one preserves the proven rules while shedding everything that only makes sense for the thread workflow. Keeping the existing group structure costs nothing and matches the conventions the skills already follow, so no reorganization is warranted.

## DR6: `antmay` docs carry a one-line pointer to the companion `skills` collection

Scope: `antmay` repository documentation

Context: After the split, `antmay`'s documentation catalog must drop the four reusable groups (`documentation`, `handoff`, `research`, `support`). That trim is mechanical: strike "handoff, research, and support operations" from `docs/project/v3/README.md:7`, and remove the four groups from the root `AGENTS.md` Layout and "When adding a new skill" sections and the marketplace plugin list. There is zero invocation coupling — no workflow skill invokes a reusable one — so the documented workflows are complete without any reusable skill, yet those skills remain generally useful alongside the workflow (e.g. reaching for `brief-the-recipient` after finishing a thread). A separate question is whether `antmay`'s docs should acknowledge the companion `skills` repository at all.

Decision: `antmay`'s documentation stays otherwise self-contained but carries a single prose pointer — one line in `README.md` — noting that a separate general-purpose `skills` collection exists as an optional companion for context-agnostic skills. No workflow doc invokes or depends on a reusable skill; the pointer is purely a discoverability signpost.

Rationale: The one-line pointer costs nothing, aids discoverability, and matches the framing of `antmay` as the reference repository — silently omitting the sibling collection would under-serve its readers. A prose "see also" introduces no architectural coupling (the no-coupling rule governs invocation and shared references, not documentation cross-links), so it does not weaken the boundary the split establishes.

## DR7: Retire the V1/V2/V3 workflow-versioning nomenclature

Scope: `antmay` repository — project documentation and `AGENTS.md`

Context: The repository's workflow rules have been developed across internally numbered versions V1, V2, and V3, with V3 as the active ruleset. On disk only `docs/project/v3/` exists as project documentation; the V1/V2 rulesets have no canonical docs, yet `AGENTS.md` still carries grandfathering language ("V1 remains grandfathered", "V2 remains authoritative", "Never migrate or mix workflow versions inside a thread"). Fourteen historical threads under `docs/threads/` were authored under these rulesets and their artifacts reference them. As the project is prepared for publication, a reader opening the repository has no use for which internal version produced the current rules. DR1 preserves the full git history — including these threads — as the record of sustained work, so retiring the nomenclature must not remove that record.

Decision: Retire the V1/V2/V3 versioning nomenclature and present a single, unversioned current workflow. Concretely: flatten the de-versioned project docs (the contents of `docs/project/v3/` become the unversioned project docs — proposed target `docs/project/`) and retitle them away from "Project V3" toward the workflow's own identity; strip the V1/V2/V3 grandfathering and "never mix workflow versions" framing from `AGENTS.md`, so the current rules read as simply "the workflow". The 14 historical threads and all their internal artifacts are left untouched — they remain a dated record of what was decided under the rules of their time and are not rewritten to scrub version mentions. Only the active project docs and `AGENTS.md` shed the version labels.

Rationale: The internal version numbering is build-time archaeology with no value to a reader of the published repository, and collapsing to one current workflow simplifies the mental model for both users and the future CLI. Keeping the historical threads and their artifacts intact preserves the sustained-work record that DR1 deliberately retained, so retiring the labels reinforces the publication goal without undercutting DR1. Not rewriting old thread artifacts avoids pointless churn and keeps the historical record faithful.

## DR8: Reset skill version baselines for publication — `antmay` at 0.1.0, `skills` at 1.0.0

Scope: `metadata.version` in every `SKILL.md`, and the "new skills start at …" authoring rule, in both repositories

Context: As part of preparing for publication, the assorted `metadata.version` values accumulated during development are reset to fresh baselines. The workflow suite in `antmay` is an interdependent system still being actively reshaped, while the reusable skills moving to the fresh `skills` repository (DR1, DR5) are individually bounded and self-contained. Semver semantics: `0.x` promises no stability and permits free iteration, whereas `1.0.0` commits to stability where breaking changes require a major bump.

Decision: Reset all `antmay` workflow skills to `0.1.0`, and start all reusable skills in the new `skills` repository at `1.0.0`. Align each repository's authoring rule accordingly: `antmay`'s `AGENTS.md` states new skills start at `0.1.0`; the `skills` repo's `AGENTS.md` states new skills start at `1.0.0`. The "bump version on any meaningful change" rule is unchanged in both.

Rationale: `0.1.0` is the idiomatic initial-development baseline — public but explicitly pre-stable — which matches the intent to publish `antmay` while continuing to polish and reshape it freely, without forcing a major bump on every breaking change; `0.1.0` rather than `0.0.1` avoids underselling skills that are already refined. The reusable skills are bounded and unlikely to churn, so committing them to a stable `1.0.0` carries little risk and presents them as ready-to-use. Differing baselines are coherent because the two repositories are at genuinely different stability stages.

## DR9: Concrete fate of the versioned doc trees under `docs/`

Scope: supersedes the doc-location specifics of DR7 — `docs/` tree in `antmay`

Context: DR7 assumed on-disk that only `docs/project/v3/` existed and that V1/V2 had no doc sets, and proposed flattening the de-versioned docs to `docs/project/`. That premise was factually wrong: the repository also contains full grandfathered doc-set trees at `docs/workflow/v1/` and `docs/workflow/v2/`, and the active set is `docs/project/v3/` (`README.md` points readers at all three). Retiring the version nomenclature therefore has to decide the fate of two real doc trees, not just prose labels.

Decision: Delete the `docs/workflow/v1/` and `docs/workflow/v2/` grandfathered doc sets outright, and move the active `docs/project/v3/` set up to the root of `docs/` as the single unversioned workflow doc set — so `docs/` directly holds `README.md`, `thread-model.md`, `skill-authoring.md`, and `workflows/`, alongside the untouched `docs/threads/`. Remove the now-empty `docs/workflow/` and `docs/project/` folders. Retitle the moved docs away from "Project V3" toward the workflow's own identity, and update every in-repo reference to the old `docs/project/v3/…` and `docs/workflow/v{1,2}/…` paths (in `AGENTS.md`, `README.md`, and the moved docs' own cross-links) to the new root-level `docs/…` paths. The 15 threads under `docs/threads/` and their artifacts remain untouched per DR7, even where they reference the old version paths.

Rationale: The deletion realizes DR7's "treat V1/V2/V3 as if they never existed" for the doc trees that actually embody those versions, and DR1's preserved git history still holds the removed trees if ever needed. Moving the active set to the root of `docs/` gives the single current workflow the plainest possible home and removes the version-scented `project/`/`workflow/` container names. This is recorded as a superseding decision because it corrects DR7's factual premise and changes its proposed target path from `docs/project/` to `docs/`.

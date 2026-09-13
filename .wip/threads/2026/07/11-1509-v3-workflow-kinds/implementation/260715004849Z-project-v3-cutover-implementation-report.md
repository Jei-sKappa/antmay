# Implementation report — Project V3 workflow cutover

## Source

Plan `plans/001/` (index `plans/001/plan.md`, 39 tasks), compiled from `specs/001/spec.md`. Executed end-to-end through the plan-driven multi-subagent orchestrator; every implementer and reviewer subagent ran on Opus per the invocation.

## Outcome

All 39 plan tasks completed. 38 commits landed on branch `v3` (range `463b062..HEAD`, first cutover commit `9315ab8`, last `dc51ea0`); task 39 was a verification-only sweep that produced no committable diff. Every task passed its two-lane gate (plan-compliance + code-quality) before commit; three tasks took one code-quality fix iteration each, all re-reviewed clean.

The repository now offers Project V3 as the active ruleset for new threads:

- **Skill suite** — the final 15-group `skills/workflow/` tree with 38 active skills (32 user-invoked entry points + 6 model-invoked primitives) and a 7-skill `skills/deprecated/` set. Renames/retirements done as history-preserving `git mv` (task 1); six primitives added (tasks 2–7); deep rewrites of `open-thread`, `discussion`, `propose`, `spec`, `plan-strict`, the three implement skills, `review-{spec,implementation,code}`, `merge-artifacts`, `finish`, `whats-next`, `archive-thread` (tasks 8–32); nine new user-invoked skills; retained-skill alignment (task 33).
- **Invocation-role metadata** — every user-invoked skill carries `disable-model-invocation: true` plus `agents/openai.yaml` with `policy.allow_implicit_invocation: false`; the six primitives carry neither. Verified synchronized across both harnesses (AC-2.1–2.5, zero findings).
- **No residual V2 vocabulary** — case-insensitive sweeps for `.wip`, `ledger.md`, `status.approved`, `status.implemented`, `record-verdict`, and word-boundary `tier`/`ledger` return nothing across all `skills/workflow/` files including references and `agents/`.
- **Canonical documentation** — `docs/project/v3/` (`README.md`, `thread-model.md`, `skill-authoring.md`, `workflows/{quick,standard,roadmap}.md`), tasks 34–35.
- **Shared-reference sync system** — `shared/references/workflows/*`, `shared/manifest.yaml`, `scripts/sync-shared-references.mjs` (the only executable code shipped), with committed byte-identical generated copies under `open-thread` and `roadmap` (task 24). Deterministic and idempotent; deletion authority structurally confined to `references/shared/`.
- **Derived files** — `.claude-plugin/marketplace.json`, `.vscode/settings.json` scopes, `.gitignore` workspace rules, root `README.md`, `AGENTS.md` (tasks 36–38), and the regenerated (gitignored) Raycast manifest (task 39). Marketplace matches disk exactly, plugins alphabetical with deprecated last; scopes equal the on-disk leaf set.
- **Non-interference** — `git diff 463b062..HEAD` touches nothing under `docs/workflow/v1/`, `docs/workflow/v2/`, or any pre-existing thread other than this one (AC-15.1 confirmed).

## Verification

Verification is filesystem/grep/git inspection (this repo has no build/test/lint pipeline). Every task ran its own verification block before commit. The closing task (39) re-ran the whole-change acceptance sweep, and the orchestrator independently re-ran the critical gates:

- AC-1.1 (name matches folder + `metadata.author` + semver) — no findings across all `skills/workflow/*/*/SKILL.md`.
- AC-1.2 / AC-1.3 — retired/moved paths absent; `skills/deprecated/` is exactly the seven.
- AC-1.4 — fixed-string sweep rc=1; word-boundary `tier`/`ledger` rc=1.
- AC-2.1–2.5 — metadata pair present on all 32 entry points, absent on all 6 primitives; no `interaction:` key.
- AC-12.1/12.5 — `JSON-OK`, `MARKETPLACE-MATCHES-DISK`, `ORDER-OK`, `SCOPES-OK`.
- AC-12.4 — `.gitignore` carries the three workspace rules; legacy `.wip/` retained.
- AC-13.4/13.6 — sync script idempotent (no second-run diff); copies byte-identical to canonical sources; not gitignored.
- AC-14.1/14.2 — Raycast generator ran unmodified (exit 0), output lists the new groups and 45 skills; `assets/skills.json` still gitignored and hand-unedited.
- AC-15.1 — no modifications under `docs/workflow/v1|v2` or other threads.

Counts confirmed: 38 active skills, 6 primitives, 7 deprecated.

## Deviations and judgment calls

- **`merge-artifacts` (task 29) — dropped the V2 `<!-- CONFLICT: -->` in-body conflict-marker mechanism.** The V3 record/queue model resolves every genuine human choice terminally (attended: ask and append a `D<N>` record to `decisions.md`; AFK: emit a `/emit-pending-decisions` bundle and stop), so no unresolved divergence persists in-body for an inline marker to hold. The reviewer independently assessed this as sound and required by the contract, not lost behavior. This is a behavioral change from the prior skill worth noting for anyone who relied on the marker convention.
- **`open-ticket` (task 33) — removed the stale claim that the thread-opening skill posts a one-time backlink comment.** V3's passive-tracker rule (no workflow operation comments on a ticket without an explicit user request) and the rewritten `open-thread` (which performs no tracker writes) make that claim obsolete. Wording-only; `open-ticket`'s own behavior (create exactly one ticket, return its URL) is unchanged.
- **Three tasks took one code-quality fix iteration each** (all resolved and re-reviewed clean, listed here so the change history is legible): task 8 (`open-thread` correction window re-delegated to `/create-thread`, orphaning the first thread folder — fixed to fold corrections into the single delegation call); task 23 (canonical templates used `/propose` slash-form inconsistently — normalized to bare `propose`, since these templates are copied verbatim into every seed); task 35 (`workflows/quick.md` used "spine", repo-internal V2 grouping vocabulary — replaced with "core path").
- **Non-blocking concerns carried forward** (minor, reviewer-judged not worth a fix cycle): task 9 (`discussion`) and task 15 (`review-spec`) each restate one rule across two sections; task 20 (`reconcile-roadmap`) restates the clean-pass-no-file rule across two sections; task 24 sync script carries three trivial notes — a residual symlink vector outside the trusted-repo threat model, a redundant defense-in-depth guard clause, and a comment-vs-behavior nuance on where an in-list YAML anchor is rejected (it still errors and syncs nothing). None affect behavior.

## Surprises

- The `throwaway-prototyping.md` reference file named in task 33's known-vocabulary-hit list already used a `/tmp` disposable location, not `.wip/` — the known-hit was stale, so no change was needed there.

## Problems hit

None. No task reached `BLOCKED` or `NEEDS_CONTEXT`; no fix loop failed to converge; every commit succeeded.

## Follow-ups

- No new follow-ups were discovered during implementation that require routing. The spec's own out-of-scope items — archival-link repair/rewrite, the future public rebaseline, and dependency-aware installation — remain owned by their designated future work, not opened here.
- The minor duplicated-guidance nits in `discussion`, `review-spec`, and `reconcile-roadmap` (see Deviations) are optional future-polish candidates for a fresh authoring pass; they are non-blocking and were deliberately not fixed to avoid disproportionate fix cycles.
- This report is task-scoped review's starting point: the per-task gates checked each diff against its own task, not the change as a whole. A broader review against the spec's acceptance criteria and the reviewer-read-only criteria (prose fidelity of the docs, exact primitive-description wording) is the expected next step.

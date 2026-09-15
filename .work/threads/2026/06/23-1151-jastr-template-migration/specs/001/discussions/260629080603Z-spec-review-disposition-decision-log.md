# Decision log — jastr migration spec review findings (specs/001/spec.md)

Thread: docs/threads/260623115129Z-jastr-template-migration/
Target: specs/001/spec.md
Subject: disposing the findings raised in the spec review of the jastr template migration spec (review: specs/001/reviews/260629074402Z-jastr-migration-spec-review.md). Records the substantive resolutions; the review's accept/reject disposition itself is stamped in the review's own frontmatter and cross-links here.

## P1: Finding 1 — how the migration handles the three skills' `references/` folders

Point: Finding 1 — how the migration handles the three skills' `references/` folders.

What you need to know: Three of the 29 skills carry a `references/` folder whose files their `SKILL.md` body links to, resolved relative to the skill directory: `research/afk-exploration/references/` (4 files: pre-mortem-analysis, red-team-adversarial, socratic-questioning, throwaway-prototyping), `research/the-librarian/references/` (3 files: stock, consult, research), `implement/implement-plan-with-subagents/references/` (2 files: plan-compliance-reviewer, code-quality-reviewer). The bodies link them as plain text — e.g. `the-librarian` says "Instructions in `references/consult.md`", `implement-plan-with-subagents` says "loads the reviewer prompt at `references/plan-compliance-reviewer.md` (resolved relative to this skill's directory)", `afk-exploration` says "`<skill-base>/references/pre-mortem-analysis.md`". These are not jastr includes — they are runtime-resolved files the agent loads on demand (progressive disclosure), and the Raycast sync embeds their content into its manifest. The spec is currently silent on them (neither in-scope nor non-scope mentions them; FR-7's content gate is per-`SKILL.md` via `git diff`; FR-10 enumerates `SKILL.md` paths and registries but not these files). The P4 smoke test used a single flag-free template with no references, so the pattern was never exercised against them. The original proposed resolution was to leave `references/` hand-authored in place at `skills/.../references/`, untouched; the user proposed instead authoring them inside the catalog so the build script materializes them, anticipating future native jastr support.

Decision: Reference files are authored in the catalog at `.jastr/workflow/templates/<skill>/references/`, co-located with `TEMPLATE.md`. The generation script, after generating each `SKILL.md`, mirrors that template's `references/` folder into `skills/workflow/<phase>/<skill>/references/`. Mirror semantics (not copy-only): files removed from the template's `references/` are deleted from the skill's `references/`, so `.jastr/` is the single source of truth and no orphan can linger. The script's `--check` verifies both `SKILL.md` freshness (jastr's own `--check`) and that each `skills/.../references/` is an exact byte-identical mirror of its template's `references/` with no orphan files. Because copying is lossless (no renderer reformatting), the one-time migration relocates the 9 files into the catalog and the round-tripped `skills/.../references/*` must be byte-identical to the pre-migration originals (empty `git diff`) — a stricter gate than the `SKILL.md` content-preservation rule. Reference files are never inlined into `SKILL.md` (verified). The body links stay as verbatim `references/<name>.md` text. AGENTS.md states the uniform rule: nothing under `skills/workflow/` is hand-edited; the entire skill folder (`SKILL.md` + any `references/`) is materialized from `.jastr/workflow/templates/<skill>/`. If jastr later gains native template-adjacent asset emission, the custom copy step is dropped and the structure already matches.

Rationale: The user's catalog-authored approach beats the original leave-in-place proposal on source-of-truth grounds: leave-in-place created a confusing dual rule (in the same skill folder, `SKILL.md` is generated-never-touch while `references/` would be hand-edited-in-place — a maintenance footgun), whereas catalog-authoring makes the whole `skills/workflow/` tree uniformly generated and nothing under it hand-edited. Verified mechanically sound: a `references/` subfolder inside a template dir is inert to jastr — `validate` passes, `generate --mode=inline` succeeds, the link is preserved as plain text, and the reference content is not inlined (progressive disclosure preserved). The lossless byte-identical copy gives these files a cleaner, stricter correctness gate than `SKILL.md`. The future-proofing is a genuine bonus rather than speculation because the source-of-truth uniformity pays off today regardless. The user confirmed mirror semantics, noting `skills/` is a generated tree (safe to delete) with git as the safety net.

## P2: Finding 2 — AC-3.2 and the Context drift metrics depend on a gitignored tool

Point: Finding 2 — AC-3.2 and the Context drift metrics depend on a gitignored tool.

What you need to know: `temp/skill_header_stats.py` is gitignored and untracked (confirmed: `git check-ignore` → ignored; `git ls-files` → not tracked). Yet two parts of the spec lean on it: the Context section quantifies the whole problem from its output ("49 section headers shared, 18 drift candidates, Commit Policy in 20…"), and AC-3.2 is a machine-checkable assertion that requires re-running `temp/skill_header_stats.py --drift` over the regenerated tree. A fresh checkout or a different agent has neither the tool nor a way to reproduce the Context numbers — a tier-3 machine-checkable AC silently resting on an untracked artifact. AC-3.1 ("no reconciled section appears as inline prose in more than one template") is already tool-independent and carries the core assertion on its own; AC-3.2 is the tool-dependent confirmation layered on top.

Decision: Commit the drift tool into the tracked tree — move `temp/skill_header_stats.py` to `scripts/skill_header_stats.py` (alongside the existing `scripts/` tools and the new `scripts/generate-skills.sh`), and repoint the spec's Context and AC-3.2 at that tracked path. Add tracking the drift-analysis tool as an explicit precondition in the spec's scope.

Rationale: The implementer needs the tool regardless — applying the P10 reconcile-vs-keep judgment depends on the tool's drift-candidate list, and verifying reconciliation (AC-3.2) re-runs it; leaving it gitignored means a fresh agent cannot find the drift candidates the whole reconciliation effort is built on. Committing it fixes the reproducibility hole and hands the implementer the instrument; `temp/` is throwaway scratch while `scripts/` is the natural home. The lighter alternative (keep it untracked, drop AC-3.2 in favor of the tool-independent AC-3.1, soften Context) was rejected because it costs the implementer the tool and leaves Context non-reproducible.

## P3: Finding 3 — `.jastr/config.yml` is left soft, with no acceptance assertion

Point: Finding 3 — `.jastr/config.yml` is left soft, with no acceptance assertion.

What you need to know: Expected behavior §1 currently says "A `.jastr/config.yml` may exist but is minimal or empty under the C approach," and no AC under FR-1 asserts anything about it. The review flags that whether jastr requires `config.yml` for a group — and what minimal content it needs — is left for the implementer to discover at runtime. This is settled definitively: both smoke tests (the P4 end-to-end test and the references test) created a working group with no `config.yml` at all — `jastr validate workflow/<id>` and `jastr generate agent-skill … --mode=inline` both succeeded. So `config.yml` is not required for a grouped template under inline generation.

Decision: Replace the soft "may exist but is minimal or empty" wording with a firm pin: under the C approach the catalog ships without a `.jastr/config.yml` — there are no variants to register and templates prefer no inputs, so there is nothing for it to hold; it is optional and omitted. Add a one-line AC under FR-1 asserting the catalog validates and generates with no `config.yml` present. If a future C→B upgrade introduces variants, `config.yml` is added at that point (out of scope here).

Rationale: The requirement is resolved by a proven fact (a grouped template generates and validates with no `config.yml`), removing a runtime guess from an otherwise machine-checkable tier-3 spec. Shipping an empty/placeholder `config.yml` was considered and rejected as needless — under C there is nothing for it to contain.

## P4: Finding 4 — rebaseline-versioning framing, and the underlying versioning decision

Point: Finding 4 — the rebaseline-versioning item, and the underlying decision that dissolves it.

What you need to know: Finding 4 is a framing nit: the Unresolved-questions preamble says items "do not block emission or implementation," but the rebaseline-versioning item says the bump "must be confirmed with the owner before the first regen is committed" — and committing the rebaseline is implementation, so the two are in mild tension. The clean fix is to settle the underlying question rather than reword the tension. That question: on the one-time rebaseline, where every file carries at least a benign-formatting diff, does P7's "bump on non-empty git diff" mean (i) bump all 29 (literal reading), or (ii) bump only skills whose content actually changed via a drift-reconciliation, treating a formatting-only diff as a non-bumping editorial normalization?

Decision: Option (ii) — bump only content-changed skills — and refine P7's trigger so the bump fires on a content change, not a raw byte diff. This piggybacks on the P6 per-hunk diff review: a skill is version-bumped iff its reviewed diff contains a category-(a) reconciliation (content) hunk; a skill whose diff is entirely category-(b) benign formatting is not bumped. Expected behavior §8 and AC-8.1 are restated so one rule ("content change → bump") covers both the one-time rebaseline and steady state. The rebaseline-versioning Unresolved item is deleted (it is now decided), and the "must be confirmed with the owner before the first regen is committed" gate is dropped entirely — the owner approved this approach in this discussion, so retaining a confirmation gate would needlessly block the implementer on an already-granted approval.

Rationale: `metadata.version` exists to tell consumers a skill's meaning changed; bumping it for pure renderer formatting (YAML key reorder, blank-line normalization) falsely signals a behavior change in a migration that is deliberately consumer-invisible (P1, P6). Option (ii) is a cleaner statement of P7's own avoid-over-bumping intent and reuses the P6 classification at no extra cost. Option (i) was rejected because "the file changed on disk" is not "the skill changed." A third option — bump all 29 to mark the "now generated" transition — was rejected because it conflates internal tooling provenance with consumer-facing content versioning, and the transition is deliberately invisible to consumers. The owner's approval here removes any need for a downstream confirmation gate.

---

The records below dispose the **pre-mortem / red-team review** of the same spec (`specs/001/reviews/260629102650Z-jastr-migration-spec-premortem-review.md`). That pass empirically cleared the two highest-risk assumptions — FR-7 is humanly practical (the hardest skill's real diff was a single YAML-wrap hunk) and consumer tooling tolerates `.jastr/` (Raycast sync, default `npx skills add`, and a real isolated install all ignored it and copied byte-identical) — and surfaced one blocker plus three issues and a nit, all accepted below.

## P5: Pre-mortem Finding 1 (blocker) — reconciliation matrix gate before the rebaseline

Point: The all-at-once rebaseline has no auditable gate forcing a per-drift-candidate reconcile/keep decision before sections are extracted into shared partials; FR-7's git-diff review is the only check, and a false-merge of a semantically-different section can pass as a deliberate reconciliation.

What you need to know: The spec states the reconcile-only-incidental principle (RD P10) but does not require an explicit, reviewable decision per drift candidate before the 29 files are rebaselined. The pre-mortem proved with real `--bucket workflow --bodies --diff` data that several high-similarity sections are semantically different, not incidental: `Lineage Folder and Filename` (plan has no frontmatter / no version vs spec defines approval+implemented latches), `Tier Awareness` (proposal is tier-3-only and escalates the ledger vs plan is tier>=1 and compiles upstream rigor vs plan-strict adds strict-specific language), `Disposition Frontmatter` (review-code fixes in a fresh implementation pass vs review-plan needs owner-approved spec amendment vs review-implementation carries extra lineage in `## References`), and the implement trio (shared headings, different subagent topology). Each is a false-merge that would silently change runtime instructions while looking like a category-(a) reconciliation under FR-7.

Decision: Accept. The spec requires a reconciliation matrix produced and reviewed before any skill is rebaselined: every drift candidate from `scripts/skill_header_stats.py --drift --bucket workflow` listed with decision (partial | keep-specific), reason (incidental | artifact-noun | semantic), affected skills, and expected version-bump set. A section may be extracted into a shared partial only if the matrix classifies it `partial` for an incidental/artifact-noun reason. The matrix is a pinned requirement (a new FR/AC), but its physical home is a degree of freedom — it is produced at plan time (a plan section or a dedicated reconciliation record reviewed before the rebaseline).

Rationale: This front-loads the exact P10 judgment the spec currently defers entirely to implementation, turning the migration's central risk (silently corrupting a skill) into an explicit, reviewable artifact created before any damage rather than a post-hoc diff classification. Pinning the matrix while leaving its location free keeps the spec owning the what without dictating the where (matrix-at-plan-time accepted by the owner).

## P6: Pre-mortem Finding 2 (issue) — drift gate scoped to the active workflow skills

Point: The Context drift metrics and AC-3.2 use an unscoped tool run that analyzes 32 skills including the out-of-scope deprecated ones, so the spec's own numbers do not match its migration scope.

What you need to know: `scripts/skill_header_stats.py --drift` (unscoped) reports 49 shared / 18 drift candidates across 32 SKILL.md files; `--bucket workflow` reports 44 shared / 19 drift candidates across the 29 active skills (and adds `## Finish` as a candidate). The spec quotes the unscoped 49/18 in Context and AC-3.2 reruns the unscoped command, contradicting P9 (deprecated out of scope). Per-section counts (Commit Policy 20, Immutability 15, Disposition Frontmatter 5, Tier Awareness 4, Lineage 4) are already workflow-scoped and unchanged.

Decision: Accept. Pin `--bucket workflow` everywhere the drift gate applies (Context, §3, AC-3.2), update the aggregate metrics to 44 shared / 19 drift candidates, and state that deprecated skills are intentionally excluded from the drift gate.

Rationale: Aligns the spec's metrics and its machine-checkable AC with its own stated scope (P9), removing the "numbers don't match, re-litigate scope mid-migration" failure mode the pre-mortem flagged.

## P7: Pre-mortem Finding 3 (issue) — destructive-operation safety rails on the references mirror

Point: Mirror-delete is a destructive operation with no pre-flight guard; a mis-mapped or omitted catalog `references/` folder could delete tracked runtime reference files before anything proves the script is operating on the intended directory.

What you need to know: Nine tracked runtime reference files are load-bearing (the-librarian routes to references/{stock,consult,research}.md; afk-exploration resolves four method references; implement-plan-with-subagents loads two reviewer prompts by relative path). The spec leaves output-path discovery to the implementer and requires mirror-delete; AC-12 only catches deletion after the fact.

Decision: Accept. Add safety-rail requirements: the script deletes only inside `skills/workflow/<phase>/<skill>/references/` after realpath containment checks; it fails (writing nothing) if a currently reference-bearing skill has no catalog `references/` directory on the first migration; it fails on an ambiguous skill-id→phase mapping; and `--check` reports orphan/missing references without mutating.

Rationale: Defensive programming for a destructive step — prevents the "mirror delete wiped runtime references" obituary by refusing to act on an unproven target rather than detecting the loss afterward.

## P8: Pre-mortem Finding 4 (issue) — JASTR_BIN inline-capability preflight

Point: The generation script can silently produce wrong output if pointed at a stale or mis-invoked jastr binary.

What you need to know: The stale `jastr-dev` on PATH rejects `--mode=inline`; worse, even the correct binary silently emits a router wrapper (telling consumers to run `jastr run …`, violating the distribution model) and exits 0 if `--mode=inline` is omitted. FR-4/FR-11 catch this only after the fact.

Decision: Accept. The generation script must preflight before writing any output and fail unless `$JASTR_BIN --version` reports `6674fd3` or later and `generate agent-skill --help` exposes `--mode`.

Rationale: A cheap fail-fast guard against a real footgun (the stale binary is on the author's PATH now) that would otherwise corrupt a whole batch into router wrappers.

## P9: Pre-mortem Finding 5 (nit) — supported consumer-tooling check, and tooling-tolerance question resolved

Point: The supported consumer-surface check must be pinned to the normal install path, and the spec's open "tooling tolerance of `.jastr/`" question is now answered.

What you need to know: With a scratch `.jastr/` present, Raycast sync (globs `skills/**/SKILL.md`) succeeded and emitted no `.jastr` path; default `npx skills add . --list` ignored `.jastr/`; a real isolated install copied only the skill folder + its references byte-identically. Only `npx skills add --full-depth` found 289 stray SKILL.md files repo-wide (none under `.jastr/`).

Decision: Accept. Define the supported consumer check as the default registry/install path (not `--full-depth`) in AC-10.3, and remove the now-resolved "tooling tolerance of `.jastr/`" Unresolved question (it is verified in the spec's favor).

Rationale: The empirical evidence resolves the open question favorably and prevents a misleading `--full-depth` result from being read as a tooling failure.

## P10: Pre-mortem evidence — top-of-body partial blank-line hygiene

Point: The "template bodies start cleanly" constraint does not cover the blank line that a partial placed at the top of a body can introduce.

What you need to know: The pre-mortem's first extraction copied the blank line after the original frontmatter into the body partial; because inline mode emits exactly one separator blank then the body verbatim, that produced an extra blank line below the closing `---`. It was avoidable by making the partial start at the H1, but it shows partial leading whitespace needs its own hygiene rule.

Decision: Accept. Extend the clean-body constraint to cover partials used at the top of a body, and add an AC that emitted output has exactly one blank line after the frontmatter and that no top-of-body partial introduces an extra leading blank.

Rationale: Closes a formatting-correctness gap that the per-skill FR-7 review would otherwise have to catch by eye on every file; a machine-checkable blank-line assertion is cheaper and deterministic.

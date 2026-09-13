---
status:
  disposed: 260629114815Z
  disposition: accepted
  rationale: specs/001/discussions/260629080603Z-spec-review-disposition-decision-log.md
---

# Pre-mortem review - jastr migration spec

## References

- Spec under review: `specs/001/spec.md`
- Genesis decisions P1-P10: `seed/discussions/260628151324Z-rendering-distribution-model-decision-log.md`
- Review-disposition decisions P1-P4: `specs/001/discussions/260629080603Z-spec-review-disposition-decision-log.md`
- Standard spec review just disposed: `specs/001/reviews/260629074402Z-jastr-migration-spec-review.md`
- Seed: `seed/seed.md`
- jastr inline contract: `.library/sources/Jei-sKappa_jastr/docs/threads/260627210636Z-generate-full-skill-body/specs/001/spec.md`
- jastr repo rules: `.library/sources/Jei-sKappa_jastr/AGENTS.md`
- Runtime suite and registries: `skills/workflow/**`, `AGENTS.md`, `.claude-plugin/marketplace.json`, `raycast-extension/scripts/sync-skills-to-raycast.mjs`
- Scratch proof created for this review: `.jastr/workflow/templates/implement-plan-with-subagents/TEMPLATE.md`, `.jastr/workflow/partials/implement-plan-with-subagents-body.md`, `.jastr/workflow/templates/implement-plan-with-subagents/references/*`, `temp/jastr-premortem/implement-plan-with-subagents.SKILL.md`

## Verdict

**Not ready to approve as written.** The renderer/tooling assumptions mostly held: an inline template of the hardest skill validated and generated, default `npx skills add` ignored `.jastr/`, and Raycast sync tolerated the new top-level catalog. The migration still has one approval-blocking failure mode: the spec delegates too much semantic judgment to the all-at-once implementation and the final `git diff` review, while the real drift data contains high-similarity sections whose differences are semantic.

The actual hard-skill proof does **not** show renderer formatting drowning review. After fixing a scratch partial to start at the H1, the 265-line generated output differed from the committed 263-line skill only by YAML line wrapping of the long `description`. FR-7 is humanly practical for renderer noise. The risk is not formatting volume; the risk is a reviewer accepting a bad "canonical" partial because the spec does not require a per-section reconcile/keep rationale before the 29 files are rebaselined.

Three-month obituaries:

- **The suite got subtly worse.** `Tier Awareness`, `Lineage Folder and Filename`, or `Disposition Frontmatter` was "normalized" as a shared partial; a plan/proposal/spec/review lost a lifecycle-specific sentence; the diff was accepted as a deliberate reconciliation. Root gap: no required reconciliation matrix proving each drift candidate is incidental vs semantic before extraction.
- **The migration stalled halfway.** The implementer discovered active-only drift metrics did not match the spec's quoted numbers, then had to re-litigate which sections are targets. Root gap: the spec says "29 active" but the unscoped mandated command analyzes 32 skills and the active-only command reports different totals.
- **A generated references mirror deleted runtime material during a dry run.** A template references folder was omitted or mis-mapped, mirror delete removed tracked runtime references, and the next Raycast or installed skill lost method prompts until git restored them. Root gap: mirror-delete semantics are required but path guards / first-migration missing-source failures are not specified.
- **A stale or wrong jastr command wasted a batch.** `jastr-dev` on PATH is real and stale; omitting `--mode=inline` on the correct binary exits 0 with a router wrapper. Root gap: the script is required to use `JASTR_BIN`, but not to preflight inline capability and fail before writing any output.

## Findings

### 1. [blocker] False-merge traps are not gated before the all-at-once rebaseline

Blast radius: at least the plan/propose/spec quartet, five review skills, and the implement trio; a bad partial changes runtime instructions while still looking like a deliberate reconciliation.

The spec states the right principle - reconcile only incidental differences and keep semantic differences separate (`specs/001/spec.md` lines 177-191) - but it does not require an explicit reconcile/keep decision record per drift candidate. That is not enough for a tier-3 all-at-once migration. The actual drift output shows sections that look tailor-made for shared partials by similarity score, but whose differences encode different lifecycle semantics:

- `Lineage Folder and Filename`: plan says it has no frontmatter and no version (`skills/workflow/plan/plan-loose/SKILL.md` lines 122-131, 143-149); spec says the version lives in frontmatter and defines approval/implemented latches (`skills/workflow/spec/spec/SKILL.md` lines 100-131).
- `Tier Awareness`: proposal is a tier-3-only stage and escalates the ledger before writing (`skills/workflow/propose/propose/SKILL.md` lines 13, 19, 33-38); planning is tier >=1 and compiles upstream rigor (`skills/workflow/plan/plan-loose/SKILL.md` lines 106, 161-166); strict planning adds strict-specific safety language (`skills/workflow/plan/plan-strict/SKILL.md` lines 174-175).
- `Disposition Frontmatter`: review-code says a code-quality finding is fixed in a fresh implementation pass (`skills/workflow/review/review-code/SKILL.md` line 154); review-plan says a spec-fault finding needs owner-approved spec amendment (`skills/workflow/review/review-plan/SKILL.md` line 153); review-implementation carries extra lineage semantics in `## References` (`skills/workflow/review/review-implementation/SKILL.md` line 153).
- The implement trio shares headings but not topology. The subagent skill says the orchestrator owns the dirty-worktree check and must not delegate it (`skills/workflow/implement/implement-plan-with-subagents/SKILL.md` lines 72-82), then commits only after both reviewers pass (`skills/workflow/implement/implement-plan-with-subagents/SKILL.md` lines 207-213). The single-agent plan skill has no subagent topology (`skills/workflow/implement/implement-plan/SKILL.md` lines 56-68), and the unstructured implement skill derives implicit tasks (`skills/workflow/implement/implement/SKILL.md` lines 54-62, 137-150).

The spec needs a machine-reviewable reconciliation table: every drift candidate listed by the tool, decision `partial | keep-specific`, reason `incidental | artifact noun | semantic`, affected skills, and expected version-bump set. Without that, FR-7 lets the most dangerous error be waved through as category (a).

### 2. [issue] The drift baseline is not reproducible against the active 29-skill scope

Blast radius: all partial-selection work and AC-3.2 reproducibility.

The spec context says `scripts/skill_header_stats.py --drift` measured "across 29 active skills" with 49 shared headers and 18 drift candidates (`specs/001/spec.md` lines 27-35), and AC-3.2 still relies on rerunning that drift view (`specs/001/spec.md` lines 313-316). Actual commands disagree:

```text
$ python3 temp/skill_header_stats.py --drift
Analyzed 32 SKILL.md file(s); 248 unique headers, 401 total occurrences.
Shared sections (count >= 2): 49 | identical: 3 drift candidates: 18

$ python3 temp/skill_header_stats.py --drift --bucket workflow
Analyzed 29 SKILL.md file(s); 237 unique headers, 381 total occurrences.
Shared sections (count >= 2): 44 | identical: 3 drift candidates: 19
```

So the quoted 49/18 numbers are from the unscoped 32-skill corpus, not the 29 active workflow skills. This is not just bookkeeping: the active-only run adds `## Finish` as a drift candidate and changes the shared-section denominator. The spec should pin `--bucket workflow` everywhere the migration scope is active skills, update the numbers, and say deprecated skills are intentionally excluded from the drift gate.

### 3. [issue] Mirror-delete semantics need destructive-operation safety rails

Blast radius: the three reference-bearing runtime skills and Raycast's embedded references.

The spec requires mirror semantics: files removed from `.jastr/workflow/templates/<skill>/references/` are deleted from `skills/workflow/<phase>/<skill>/references/` (`specs/001/spec.md` lines 268-283, 385-395). It also leaves output path discovery to the implementer (`specs/001/spec.md` lines 201-212, 412-414). The real tree has exactly nine tracked runtime references:

```text
$ git ls-files 'skills/workflow/**/references/*'
skills/workflow/implement/implement-plan-with-subagents/references/code-quality-reviewer.md
skills/workflow/implement/implement-plan-with-subagents/references/plan-compliance-reviewer.md
skills/workflow/research/afk-exploration/references/pre-mortem-analysis.md
skills/workflow/research/afk-exploration/references/red-team-adversarial.md
skills/workflow/research/afk-exploration/references/socratic-questioning.md
skills/workflow/research/afk-exploration/references/throwaway-prototyping.md
skills/workflow/research/the-librarian/references/consult.md
skills/workflow/research/the-librarian/references/research.md
skills/workflow/research/the-librarian/references/stock.md
```

Those files are load-bearing: `the-librarian` routes directly to `references/stock.md`, `references/consult.md`, and `references/research.md` (`skills/workflow/research/the-librarian/SKILL.md` lines 13-15); `afk-exploration` resolves four method references from its skill base (`skills/workflow/research/afk-exploration/SKILL.md` lines 190-193, 222); `implement-plan-with-subagents` loads both reviewer prompts by relative path (`skills/workflow/implement/implement-plan-with-subagents/SKILL.md` lines 103, 107, 192, 200).

AC-12 catches deletion after the fact, but the script should not be allowed to delete before proving it is operating on the intended directory. Add explicit requirements: delete only inside `skills/workflow/<phase>/<skill>/references/` after realpath containment checks; fail if a currently reference-bearing skill has no catalog `references/` during the first migration; fail if skill id to phase mapping is ambiguous; make `--check` report orphan/missing references without mutating.

### 4. [issue] Author-binary drift is real; the script needs an inline-capability preflight

Blast radius: all 29 generated skills in the batch if the wrong command is used.

The spec correctly warns that the usable binary is the vendored `.library` bundle (`specs/001/spec.md` lines 129-135), and the current bundle is good:

```text
$ node .library/sources/Jei-sKappa_jastr/packages/cli/dist/index.js --version
0.1.0 (6674fd3)
```

But the stale author command is also real:

```text
$ command -v jastr-dev
/Users/jacopo/.local/bin/jastr-dev
$ jastr-dev --version
0.1.0 (9e564d4)
$ jastr-dev generate agent-skill workflow/implement-plan-with-subagents --out temp/jastr-premortem/stale-inline.SKILL.md --mode=inline
Error: Unknown generate option --mode=inline.
```

Worse, even the correct binary produces a router wrapper if `--mode=inline` is omitted, and that command exits 0:

```text
$ node .library/sources/Jei-sKappa_jastr/packages/cli/dist/index.js generate agent-skill workflow/implement-plan-with-subagents --out temp/jastr-premortem/router-wrapper.SKILL.md --force
Generated `temp/jastr-premortem/router-wrapper.SKILL.md` from template `.jastr/workflow/templates/implement-plan-with-subagents/TEMPLATE.md`
```

The generated wrapper body tells consumers to run `jastr run workflow/implement-plan-with-subagents`, which violates the distribution model. FR-4/FR-11 would catch this if run, but the generation script should fail before writing any skill unless `$JASTR_BIN --version` is `6674fd3` or later and `generate agent-skill --help` exposes `--mode`.

### 5. [nit] `.jastr/` is tolerated by default consumer tooling, but `--full-depth` is a polluted discovery mode

Blast radius: normal documented installs are fine; accidental `--full-depth` local installs become noisy and confusing.

The unresolved `.jastr/` tooling question is mostly resolved in the spec's favor. Raycast sync scans `SKILLS_DIR = <repo>/skills` and globs only `**/SKILL.md` under that directory (`raycast-extension/scripts/sync-skills-to-raycast.mjs` lines 17, 97-117). With scratch `.jastr/` present, it succeeded:

```text
$ node raycast-extension/scripts/sync-skills-to-raycast.mjs
Wrote 32 skills to raycast-extension/assets/skills.json
...
Inlined references for 3 skills:
  implement-plan-with-subagents: 2 files, 21669 bytes
  afk-exploration: 4 files, 31731 bytes
  the-librarian: 3 files, 4922 bytes
```

Default `npx skills add . --list` also ignored `.jastr/` and found the registry-backed 32 skills. An isolated real install copied only the selected skill folder:

```text
$ find /private/tmp/skills-npx-home/.agents/skills/implement-plan-with-subagents -maxdepth 4 -print | sort
/private/tmp/skills-npx-home/.agents/skills/implement-plan-with-subagents
/private/tmp/skills-npx-home/.agents/skills/implement-plan-with-subagents/SKILL.md
/private/tmp/skills-npx-home/.agents/skills/implement-plan-with-subagents/references
/private/tmp/skills-npx-home/.agents/skills/implement-plan-with-subagents/references/code-quality-reviewer.md
/private/tmp/skills-npx-home/.agents/skills/implement-plan-with-subagents/references/plan-compliance-reviewer.md
```

No `.jastr` file was installed, and the installed `SKILL.md` was byte-identical to the committed one. However, `npx skills add . --list --full-depth` found 289 skills because the repository contains many other `SKILL.md` files outside `skills/`; `.jastr/` itself has none (`find .jastr -name SKILL.md` printed nothing). The spec should define the supported consumer check as the normal registry/default install path, not `--full-depth`.

## Evidence

### Hard-skill inline proof

Scratch catalog shape:

```text
.jastr/workflow/.jastrgroup
.jastr/workflow/templates/implement-plan-with-subagents/TEMPLATE.md
.jastr/workflow/templates/implement-plan-with-subagents/references/code-quality-reviewer.md
.jastr/workflow/templates/implement-plan-with-subagents/references/plan-compliance-reviewer.md
.jastr/workflow/partials/implement-plan-with-subagents-body.md
```

Commands and outputs:

```text
$ node .library/sources/Jei-sKappa_jastr/packages/cli/dist/index.js validate workflow/implement-plan-with-subagents
Template workflow/implement-plan-with-subagents is valid.

$ node .library/sources/Jei-sKappa_jastr/packages/cli/dist/index.js generate agent-skill workflow/implement-plan-with-subagents --out temp/jastr-premortem/implement-plan-with-subagents.SKILL.md --mode=inline --force
Generated `temp/jastr-premortem/implement-plan-with-subagents.SKILL.md` from template `.jastr/workflow/templates/implement-plan-with-subagents/TEMPLATE.md`

$ node .library/sources/Jei-sKappa_jastr/packages/cli/dist/index.js generate agent-skill workflow/implement-plan-with-subagents --out temp/jastr-premortem/implement-plan-with-subagents.SKILL.md --mode=inline --check
agent-skill at temp/jastr-premortem/implement-plan-with-subagents.SKILL.md is up to date.
```

Final diff against committed `skills/workflow/implement/implement-plan-with-subagents/SKILL.md`:

```diff
@@ -1,6 +1,8 @@
 ---
 name: implement-plan-with-subagents
-description: Execute every task in a plan artifact through an implementer and dual-reviewer subagent loop with per-cycle commits; use when a plan needs the heavier review path and the runtime supports subagents.
+description: Execute every task in a plan artifact through an implementer and
+  dual-reviewer subagent loop with per-cycle commits; use when a plan needs the
+  heavier review path and the runtime supports subagents.
 metadata:
   author: https://github.com/Jei-sKappa
   version: 3.0.0
```

Line counts:

```text
263 skills/workflow/implement/implement-plan-with-subagents/SKILL.md
265 temp/jastr-premortem/implement-plan-with-subagents.SKILL.md
255 .jastr/workflow/partials/implement-plan-with-subagents-body.md
```

The generated output contained no `jastr`, `::include`, or `::if` substring. Both scratch reference copies were byte-identical to the originals (`cmp exit=0` for each).

The first mechanical extraction copied the blank line after the original frontmatter into the body partial; because inline mode emits exactly one separator blank then the body verbatim, that produced an extra blank line below `---`. This was avoidable by making the partial start at `# Implement Plan With Subagents`, but it proves partial leading whitespace needs its own hygiene check, not only "template body starts cleanly."

### Consumer tooling

- `node raycast-extension/scripts/sync-skills-to-raycast.mjs` with scratch `.jastr/` present exited 0 and wrote 32 skills; no `.jastr` source path appeared in `raycast-extension/assets/skills.json`.
- `npx skills add . --list` with isolated `HOME=/private/tmp/skills-npx-home` found 32 skills and no `.jastr` entries.
- `npx skills add /Users/jacopo/Developer/projects/personal/tools/skills --global --agent codex --skill implement-plan-with-subagents -y --copy` installed only `SKILL.md` plus the two `references/*.md` files under `/private/tmp/skills-npx-home/.agents/skills/implement-plan-with-subagents`.
- `npx skills add . --list --full-depth` found 289 skills, demonstrating that deep discovery is not an acceptable consumer-surface check for this repo.

### Drift and false-merge data

- Unscoped drift command: `Analyzed 32 SKILL.md file(s); 248 unique headers, 401 total occurrences. Shared sections: 49; drift candidates: 18.`
- Active-only drift command: `Analyzed 29 SKILL.md file(s); 237 unique headers, 381 total occurrences. Shared sections: 44; drift candidates: 19.`
- `python3 temp/skill_header_stats.py --bodies --diff --bucket workflow --min-similarity 0.5 --max-similarity 0.999 --sort drift` showed the semantic diffs cited in Findings 1 and 2.

## Open Questions

- Should the migration's drift gate be active-only (`--bucket workflow`) and should all Context metrics be updated to 44 shared / 19 drift candidates, or should deprecated skills intentionally stay in the analysis corpus despite being out of scope?
- Where should the required reconcile/keep matrix live: the plan, the implementation report, or a new discussion record before implementation starts?
- Should the generation script refuse to delete a `skills/.../references/` directory unless the corresponding catalog `references/` directory exists and the skill is already known to be generated?
- Is `npx skills add --full-depth` explicitly unsupported for this repo, or should hidden/vendored skill directories be excluded before this migration lands?

## Next Actions

- Amend the spec before approval: add a per-drift-candidate reconciliation matrix requirement, pin `--bucket workflow` and update the metrics, add mirror-delete path guards and first-migration missing-reference failures, require a `JASTR_BIN` inline-capability preflight, and document the supported consumer tooling check.
- Add an AC that generated output has exactly one blank line after frontmatter and that included partials used at the top of a body do not introduce an extra leading blank.
- Keep the first implementation batch small even if the scope remains all 29: convert one semantically tricky family first, review the reconciliation matrix, then fan out.

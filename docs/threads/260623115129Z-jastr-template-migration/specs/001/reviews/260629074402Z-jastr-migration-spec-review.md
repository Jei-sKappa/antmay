---
status:
  disposed: 260629083306Z
  disposition: accepted
  rationale: specs/001/discussions/260629080603Z-spec-review-disposition-decision-log.md
---

# Spec review — jastr template migration (spec 001)

## References

- Spec under review: `specs/001/spec.md`
- Genesis decision log it is checked against (P1–P10): `seed/discussions/260628151324Z-rendering-distribution-model-decision-log.md`
- Seed that opened the thread: `seed/seed.md`
- Prior review on this spec (lossless-mapping, passed): `specs/001/reviews/260629073652Z-spec-lossless-mapping-review.md`
- Drift-analysis tool the spec leans on (Context, AC-3.2): `temp/skill_header_stats.py` — **gitignored / not tracked** (see Finding 2)
- Skills carrying `references/` folders, unaddressed by the spec (see Finding 1): `skills/workflow/research/afk-exploration/references/`, `skills/workflow/research/the-librarian/references/`, `skills/workflow/implement/implement-plan-with-subagents/references/`

## Verdict

**Partially ready.** All eight semantic-contract elements are present and, for the most part, handoff-grade — this is a strong, decision-traceable, tier-3 spec. Two `issue`-level gaps should be closed before it is handed to planning: most importantly, the migration is silent on the `references/` folders that 3 of the 29 skills carry (highest-impact finding), and a machine-checkable acceptance criterion depends on a gitignored tool.

## Findings

### 1. [issue] `references/` folders are entirely unaddressed — Scope (3) / Expected behavior (4)

The spec scopes the migration as "generate each `SKILL.md` from a template." But 3 of the 29 skills carry a `references/` folder whose files their `SKILL.md` body links to (resolved relative to the skill directory), and which the Raycast sync embeds into its manifest:

- `research/afk-exploration/references/` (4 files), `research/the-librarian/references/` (3 files), `implement/implement-plan-with-subagents/references/` (2 files).

Neither the spec nor the genesis decision log mentions reference files at all (the P4 smoke test used a single flag-free template with no references). The in-scope and non-scope lists are both silent on them; the content-preservation gate (FR-7) is defined per-`SKILL.md` via `git diff` and does not cover them; FR-10's "consumer surface unchanged" enumerates `SKILL.md` paths and the registries but not these files. **Downstream impact:** an implementer hits a wall on these 3 skills and must guess whether the `references/` folders are out of scope and stay untouched in `skills/workflow/.../references/`, or are part of the template unit and move into `.jastr/`. Guessing wrong silently breaks three skills (the body's `references/<name>.md` links would dangle, and the Raycast sync's reference embedding would lose content) — exactly the consumer-invisible regression FR-10 exists to prevent.

### 2. [issue] AC-3.2 and the Context drift metrics depend on a gitignored tool — Acceptance guidance (8) / Context (2)

`temp/skill_header_stats.py` is **gitignored** (confirmed via `git check-ignore`), so it is not part of the committed repo. Yet the Context section quantifies the problem entirely from its output ("49 section headers shared, 18 drift candidates, `Commit Policy` in 20…"), and AC-3.2 is written as a pass/fail assertion that requires *re-running* `temp/skill_header_stats.py --drift` over the regenerated tree. **Downstream impact:** a different agent or a fresh checkout cannot execute AC-3.2 (the tool isn't there), and the Context's quantified claims aren't reproducible from version control — a tier-3 "machine-checkable" AC silently rests on an untracked artifact. Either the tool must be committed (un-gitignored) as a precondition, or AC-3.2 must be restated so it does not depend on a non-tracked tool.

### 3. [nit] `.jastr/config.yml` is left soft with no acceptance assertion — Constraints (5) / Acceptance (8)

Expected behavior §1 says "A `.jastr/config.yml` may exist but is minimal or empty under the C approach," and no AC under FR-1 asserts anything about it (AC-1.1/1.2 cover `.jastrgroup` and the two subdirectories only). **Downstream impact:** in an otherwise tier-3 machine-checkable spec, whether jastr *requires* `config.yml` to exist for a group — and what minimal content it needs — is left for the implementer to discover at runtime. A one-line pin ("required/optional; if present, contains an empty `variants` registry") would remove the guess.

### 4. [nit] Rebaseline-versioning item is framed "non-blocking" yet gates a commit — Unresolved questions (7)

The Unresolved-questions preamble states the items "do **not** block emission or implementation," but the third item says the one-time-rebaseline version bump "must be confirmed with the owner before the first regen is committed." Committing the rebaseline is part of implementation, so the two statements are in mild tension. **Downstream impact:** an implementer taking "does not block implementation" at face value could bump all 29 versions and commit before realizing the decision needed owner confirmation. The intent is recoverable on a close read, but the framing should say plainly that this item gates the rebaseline commit specifically.

### 5. [nit] Cross-reference points to the wrong section — cross-element (Scope navigation)

The Out-of-scope bullet on family-merging directs the reader to the recorded C→B trigger "(see Expected behavior §8)", but the trigger is recorded in **§9** (§8 is Versioning). **Downstream impact:** a reader following the pointer lands on the wrong requirement; trivial to fix.

## Evidence

- Finding 1: spec `## Scope` (in/out lists) and `## Expected behavior` §1–§10 — no occurrence of skill `references/` folders anywhere in `spec.md`; bodies link them, e.g. `afk-exploration/SKILL.md` ("`<skill-base>/references/pre-mortem-analysis.md`") and `implement-plan-with-subagents/SKILL.md` ("reviewer prompt at `references/plan-compliance-reviewer.md`").
- Finding 2: spec `## Context` ("`temp/skill_header_stats.py --drift` measures this…") and `## Acceptance criteria` AC-3.2 ("Re-running `temp/skill_header_stats.py --drift`…"); `git check-ignore temp/skill_header_stats.py` → ignored.
- Finding 3: spec `## Expected behavior` §1 ("`.jastr/config.yml` may exist but is minimal or empty"); FR-1 ACs make no claim about it.
- Finding 4: spec `## Unresolved questions` preamble ("do **not** block emission or implementation") vs. its third bullet ("must be confirmed with the owner before the first regen is committed").
- Finding 5: spec `## Scope` → "Out of scope" → family-merging bullet ("see Expected behavior §8") vs. `## Expected behavior` §9, which actually carries the C→B trigger.

## Open Questions

- **Reference-file intent (settles Finding 1):** are the 3 skills' `references/` folders out of scope and left in place untouched, or are they part of the template unit? Only the author can decide; whichever it is, the spec should state it and an AC should assert those files survive the migration byte-for-byte.
- **`config.yml` requirement (settles Finding 3):** does the vendored jastr require `.jastr/config.yml` to exist for a group under the C approach? Answerable by testing against `JASTR_BIN`, but the resolution belongs in the spec.

## Next Actions

- Revise the spec in place to (a) state how skill `references/` folders are handled and add an AC asserting they are preserved; (b) make AC-3.2 reproducible — commit `temp/skill_header_stats.py` as a precondition or restate the AC to not depend on a gitignored tool; (c) pin the `.jastr/config.yml` requirement; (d) clarify the rebaseline-versioning item gates the rebaseline commit; (e) fix the `§8`→`§9` cross-reference.
- Given this is a tier-3, hard-to-reverse architectural migration, run a separate **adversarial review pass** (pre-mortem / "what would kill this") before approval — this standard pass and the prior lossless-mapping pass do not cover that layer.
- The lossless-mapping review already passed, so once the findings above are addressed the spec is well-positioned to be approved and handed to planning.

# Task 21: New skill — review-roadmap

**Objective:** Create `review-roadmap`, the read-only review judging whether the decomposition, dependencies, and child briefs are safe to hand off.

**Input / context:** The cutover spec `specs/001/spec.md` § "Reconciliation versus review" and AC-7.1/AC-7.4 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P39 (`review-roadmap` responsibility), P41 (what a sound roadmap contains), P36 (bundle output), P38 (manual consumption). NEW skill at `skills/workflow/review/review-roadmap/`.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Create `skills/workflow/review/review-roadmap/SKILL.md` with frontmatter: `name: review-roadmap`; concise human-facing `description`; `disable-model-invocation: true`; `metadata.author`; `metadata.version: 1.0.0`.
2. Create `agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — the question: can each child brief become an independently executable thread without inventing intent? Assess decomposition quality (independently valuable outcomes; boundaries that don't silently expand scope), brief self-containment (all fields present and sufficient), dependency soundness (described as consumed inputs; no cycles; no impossible ordering), shared-constraint placement, and suggestion completeness (a complete expanded workflow, not a name).
4. Body — read-only output contract: never edit `roadmap.md` or any other artifact. Clean → concise chat pass, NO file. Findings → exactly one uniquely named `.pending-reviews/` bundle via `/emit-pending-review` (reviewer `review-roadmap`, target `roadmap.md`), with review-specific categories of your choice. Never write `.pending-decisions/`.
5. Body — no statuses, no retry loops, no prescribed addressing skill; report the bundle path in chat and stop.

**Files modified:** `skills/workflow/review/review-roadmap/SKILL.md` (NEW), `skills/workflow/review/review-roadmap/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'name: review-roadmap' skills/workflow/review/review-roadmap/SKILL.md
grep -n 'disable-model-invocation: true' skills/workflow/review/review-roadmap/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/review/review-roadmap/agents/openai.yaml
grep -n 'emit-pending-review' skills/workflow/review/review-roadmap/SKILL.md
grep -n 'pending-decisions' skills/workflow/review/review-roadmap/SKILL.md   # expect no hits
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/review/review-roadmap/ ; \
grep -riwE 'tier|ledger' skills/workflow/review/review-roadmap/   # both must return nothing
```

**Acceptance criteria:**

- The body never edits the reviewed target; concise chat pass and no file when clean; on findings exactly one uniquely named bundle via `/emit-pending-review`; never writes `.pending-decisions/` (spec AC-7.1).
- No `Address with:` field, statuses, dispositions, or retry loops (spec AC-7.4).
- Frontmatter/metadata per the P48 pair; `metadata.version: 1.0.0`.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/emit-pending-review` contract (Task 4); the `roadmap.md` contract (Task 19).

**Produces:** the V3 `review-roadmap` skill.

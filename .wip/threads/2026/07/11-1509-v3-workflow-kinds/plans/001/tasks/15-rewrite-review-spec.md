# Task 15: Rewrite review-spec

**Objective:** Rewrite `review-spec` as a strictly read-only handoff-quality review that emits at most one pending-review bundle.

**Input / context:** The cutover spec `specs/001/spec.md` § "Reconciliation versus review" and AC-7.1/AC-7.4 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P37 (review-spec's seven-point read-only contract and core question — handoff quality and planning readiness, NOT exhaustive decision fidelity; a visible contradiction with `decisions.md` is still reportable), P36 (bundle output), P38 (manual consumption). Current file: `skills/workflow/review/review-spec/SKILL.md` (V2: durable references-first report into `reviews/` folders, eight-element checklist against lineage specs — replace wholesale; the quality axes worth keeping are clarity, completeness, internal consistency, scope boundaries, observable behavior, constraints, degrees of freedom, acceptance guidance, planning readiness).

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: keep `name: review-spec`; concise human-facing `description`; `disable-model-invocation: true`; bump `metadata.version` (major appropriate).
2. Create `skills/workflow/review/review-spec/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — the question: can another agent plan and implement from the thread-root `spec.md` without hidden conversational context? Judge clarity, completeness, internal consistency, scope boundaries, observable behavior, constraints, degrees of freedom, acceptance guidance, and planning readiness. Do not perform an exhaustive decision-by-decision fidelity mapping; an obvious contradiction with `decisions.md` may still be reported because it harms readiness.
4. Body — read-only output contract: never edit `spec.md` or any other artifact. Clean result → a concise pass judgment in chat and NO file. Findings → exactly one uniquely named bundle under `.pending-reviews/` via `/emit-pending-review` (reviewer `review-spec`, target `spec.md`), with review-specific categories of your choice. Never write `.pending-decisions/`.
5. Body — after emitting, report the bundle path in chat; addressing findings is the user's explicit follow-up (no statuses, no retry loops, no prescribed addressing skill).

**Files modified:** `skills/workflow/review/review-spec/SKILL.md` (rewritten), `skills/workflow/review/review-spec/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'disable-model-invocation: true' skills/workflow/review/review-spec/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/review/review-spec/agents/openai.yaml
grep -n 'emit-pending-review' skills/workflow/review/review-spec/SKILL.md
grep -n 'pending-decisions' skills/workflow/review/review-spec/SKILL.md   # expect no hits
grep -n 'Address with' skills/workflow/review/review-spec/SKILL.md        # expect no hits
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/review/review-spec/ ; \
grep -riwE 'tier|ledger' skills/workflow/review/review-spec/   # both must return nothing
```

**Acceptance criteria:**

- The body never edits the reviewed target; returns a concise chat pass and creates no file when clean; on findings writes exactly one uniquely named `.pending-reviews/` bundle via `/emit-pending-review`; never writes `.pending-decisions/` (spec AC-7.1).
- No `Address with:` field, statuses, dispositions, or automatic retry loops; addressing is manual, user-directed (spec AC-7.4).
- The review judges handoff quality and planning readiness, not exhaustive decision fidelity.
- Frontmatter/metadata per the P48 pair; semver bump.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/emit-pending-review` contract (Task 4); thread-root `spec.md` (Task 13).

**Produces:** the V3 `review-spec` skill.

# Task 31: Rewrite whats-next

**Objective:** Rewrite `whats-next` as the evidence-based, read-only navigation advisor.

**Input / context:** The cutover spec `specs/001/spec.md` § "Finish, navigation, archival" and AC-10.2 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P46 (the complete contract: evidence list, conditional advice, prioritization, response shape), P24 (the seed suggestion is advisory context; divergence is not error), P21 (Roadmap: surface unmaterialized briefs, invalid references, feedback relevant to future children; never aggregate child completion). Current file: `skills/workflow/finish-navigate/whats-next/SKILL.md` (329 lines; V2 derived-status ledger folding — replace wholesale).

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X. (The "never claim to know an invisible operation ran" rule DOES belong: reading the thread could plausibly tempt inventing state.)
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: keep `name: whats-next`; concise human-facing `description`; `disable-model-invocation: true`; bump `metadata.version` (major appropriate).
2. Create `skills/workflow/finish-navigate/whats-next/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — evidence it reads (all read-only): thread location (active tree vs `docs/threads/archive/`); `seed.md` (especially `## Suggested workflow`); `decisions.md`; existing canonical artifacts; Roadmap child briefs and `Materialized thread:` references; `.pending-decisions/` headers; `.pending-reviews/` headers; `.implementation-runs/`; `implementation-report.md`; current branch and working-tree state; an optional user hint (e.g. "I just reconciled the spec") — used for the current answer, never written anywhere.
4. Body — prioritization: (1) pending human intent relevant to downstream work; (2) explicitly resumable interrupted implementation runs; (3) known pending-review findings, presented as findings to address, dismiss, or supersede — not automatic blockers; (4) comparison of observable artifacts with the seed's complete suggested workflow; (5) reasonable alternatives (optional review, escalation to a spec-driven path, direct implementation, finish, archival).
5. Body — conditional advice for operations that leave no success evidence (reconciliation): phrase as "if X has not run, run it now; if it has, the next normal step is Y". Never claim to know the last operation executed; never treat divergence from the suggestion as an error; an active thread may be ready for finish/archival but is never labelled mechanically complete; an archived thread is terminal.
6. Body — Roadmap awareness: surface briefs lacking materialization references, dangling references, and feedback records relevant to future children; never aggregate child completion.
7. Body — response shape: concise `Observed:` / `Signals:` / `Recommended next:` / `Alternatives:` with empty sections omitted and at most two to four concrete suggested actions. The skill writes nothing and marks nothing complete.

**Files modified:** `skills/workflow/finish-navigate/whats-next/SKILL.md` (rewritten), `skills/workflow/finish-navigate/whats-next/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'disable-model-invocation: true' skills/workflow/finish-navigate/whats-next/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/finish-navigate/whats-next/agents/openai.yaml
grep -nE 'Observed|Signals|Recommended|Alternatives' skills/workflow/finish-navigate/whats-next/SKILL.md
grep -n 'pending-decisions' skills/workflow/finish-navigate/whats-next/SKILL.md
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/finish-navigate/whats-next/ ; \
grep -riwE 'tier|ledger' skills/workflow/finish-navigate/whats-next/   # both must return nothing
```

**Acceptance criteria:**

- The body implements P46: the read-only evidence list, conditional advice for evidence-less operations, the five-level prioritization, the concise Observed/Signals/Recommended/Alternatives shape with empty sections omitted and at most two to four suggested actions, and no writes or compliance judgments (spec AC-10.2).
- Frontmatter/metadata per the P48 pair; semver bump.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts (the old ledger-folding machinery disappears silently); no rule stated twice.

**Consumes:** the workspace header shapes (Tasks 3, 4) and run-directory semantics (Tasks 25–27) as read-only inspection targets.

**Produces:** the V3 `whats-next` skill.

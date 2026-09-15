# Task 13: Rewrite spec

**Objective:** Rewrite `spec` to emit the thread-root `spec.md` with no V2 lifecycle machinery, preserving its handoff-grade authoring core.

**Input / context:** The cutover spec `specs/001/spec.md` § "Thread model → Layout", § "Deep rewrites", AC-5.1 and AC-4.4 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P23/P62 (root `spec.md`), P12 (write authority), P57 (record elicited decisions), P13/P31 (completion-oriented; blocked-AFK bundles), P37 (a downstream reconciliation pass enforces decision fidelity — the spec skill itself just authors well from `decisions.md`). Current file: `skills/workflow/spec/spec/SKILL.md`. Preserve the spec-authoring core (forward-designing a complete, self-contained, handoff-grade spec: intended outcome, scope, expected behavior, constraints, degrees of freedom, acceptance guidance) while removing V2 machinery: `specs/NNN/` lineages, frontmatter `version`/`status` maps, approval latches, artifact-local `reviews/` folders, `.wip/` drafts, tier awareness, ledger reads.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: keep `name: spec`; concise human-facing `description`; `disable-model-invocation: true`; bump `metadata.version` (major appropriate).
2. Create `skills/workflow/spec/spec/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — inputs and output: read `seed.md`, `decisions.md`, any `proposal.md`, and explicit references or the user's prompt; write the single thread-root `spec.md` with no frontmatter, no version counter, no status map. Revising an existing `spec.md` edits it in place.
4. Body — preserve the authoring quality bar from the current skill (self-contained, complete enough for a downstream planner/implementer, machine-checkable acceptance guidance where the work supports it, explicit degrees of freedom) stripped of every V2 mechanism.
5. Body — decision recording (P57): an elicited answer that settles product or workflow intent is appended to `decisions.md` as a `D<N>` record before the spec depends on it.
6. Body — blocked-AFK behavior: under explicit AFK invocation, an indispensable human decision becomes a `/emit-pending-decisions` bundle and the run stops with a concise notification; the skill never invents intent to finish.

**Files modified:** `skills/workflow/spec/spec/SKILL.md` (rewritten), `skills/workflow/spec/spec/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'disable-model-invocation: true' skills/workflow/spec/spec/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/spec/spec/agents/openai.yaml
grep -n 'spec.md' skills/workflow/spec/spec/SKILL.md
grep -nE 'specs/|NNN|version:' skills/workflow/spec/spec/SKILL.md   # no lineage/version-contract hits in the body
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/spec/spec/ ; \
grep -riwE 'tier|ledger' skills/workflow/spec/spec/   # both must return nothing
```

**Acceptance criteria:**

- The body writes the thread-root `spec.md`; no lineage folders, `NNN` numbering, frontmatter version/status contracts, or `.wip/` references remain (spec AC-5.1).
- The body carries the P57 recording rule as plain behavior (spec AC-4.4) and uses `/emit-pending-decisions` when blocked under AFK.
- Frontmatter/metadata per the P48 pair; semver bump.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/emit-pending-decisions` contract (Task 3); the `D<N>` record shape (Task 9).

**Produces:** the V3 `spec` skill writing thread-root `spec.md` (the artifact `reconcile-spec` and `review-spec` target and `plan-strict` compiles).

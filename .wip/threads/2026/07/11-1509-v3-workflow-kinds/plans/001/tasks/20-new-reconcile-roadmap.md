# Task 20: New skill — reconcile-roadmap

**Objective:** Create `reconcile-roadmap`, the mutating operation that aligns the roadmap and its decomposition with the thread's established decisions.

**Input / context:** The cutover spec `specs/001/spec.md` § "Reconciliation versus review" and AC-6.1/AC-6.3 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P35 (reconciliation semantics), P39 (`reconcile-roadmap`: align the roadmap and its decomposition with existing decisions), P41 (the roadmap contract it checks against), P43 (unbracketed normal step after `roadmap`). NEW skill at `skills/workflow/reconcile/reconcile-roadmap/`.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Create `skills/workflow/reconcile/reconcile-roadmap/SKILL.md` with frontmatter: `name: reconcile-roadmap`; concise human-facing `description`; `disable-model-invocation: true`; `metadata.author`; `metadata.version: 1.0.0`.
2. Create `agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — operation: read `seed.md`, `decisions.md`, any `proposal.md` (authority sources) and the thread-root `roadmap.md` (its declared editable target); correct the roadmap where fixes follow from existing decisions — omitted decisions, contradictions with settled direction or boundaries, unsupported commitments, incomplete or inconsistent child briefs (missing fields, dependencies that name a child without describing the consumed input, a bare workflow name where a complete expanded suggestion is required); recheck after fixing.
4. Body — irreducible intent: decomposition changes that alter human intent (splitting/merging/adding children, changing an outcome or boundary the user settled) become one coherent `/emit-pending-decisions` bundle (producer `reconcile-roadmap`, target `roadmap.md`), never silent edits.
5. Body — authority boundary: never edit `decisions.md`, `seed.md`, or the proposal; a source fault becomes a pending decision. Do not create or modify child threads, and do not touch `roadmap-feedback.md` records. Produce no review report; no file on a clean pass. No invocation-time modes.

**Files modified:** `skills/workflow/reconcile/reconcile-roadmap/SKILL.md` (NEW), `skills/workflow/reconcile/reconcile-roadmap/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'name: reconcile-roadmap' skills/workflow/reconcile/reconcile-roadmap/SKILL.md
grep -n 'disable-model-invocation: true' skills/workflow/reconcile/reconcile-roadmap/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/reconcile/reconcile-roadmap/agents/openai.yaml
grep -n 'emit-pending-decisions' skills/workflow/reconcile/reconcile-roadmap/SKILL.md
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/reconcile/reconcile-roadmap/ ; \
grep -riwE 'tier|ledger' skills/workflow/reconcile/reconcile-roadmap/   # both must return nothing
```

**Acceptance criteria:**

- The body: edits its declared target (`roadmap.md`) when corrections follow from existing decisions; rechecks after fixing; emits `/emit-pending-decisions` bundles for irreducible human intent; never edits its authority source; produces no review report (spec AC-6.1); no invocation-time modes (spec AC-6.3).
- Frontmatter/metadata per the P48 pair; `metadata.version: 1.0.0`.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/emit-pending-decisions` contract (Task 3); the `roadmap.md` contract (Task 19).

**Produces:** the V3 `reconcile-roadmap` skill.

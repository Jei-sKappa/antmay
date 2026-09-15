# Task 29: Rewrite merge-artifacts

**Objective:** Rewrite `merge-artifacts` to merge explicitly supplied candidate artifacts into V3 root artifacts and the singleton decision log.

**Input / context:** The cutover spec `specs/001/spec.md` § "Deep rewrites" (merge-artifacts), AC-5.4 and AC-4.4 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P40 (candidate location is an input concern — no standard draft folder exists), P57 (newly settled human choices are recorded), P23/P62 (root artifacts), P13 (completion-oriented). Current file: `skills/workflow/merge/merge-artifacts/SKILL.md` (170 lines; V2: `.wip/` draft conventions, frozen-artifact and lineage/status assumptions — replace those; keep the merge craft: comparing candidates, reconciling divergences, producing one coherent result).

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: keep `name: merge-artifacts`; concise human-facing `description`; `disable-model-invocation: true`; bump `metadata.version` (major appropriate).
2. Create `skills/workflow/merge/merge-artifacts/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — inputs: the caller supplies the explicit candidate paths, wherever they live (any directory, inside or outside the thread); the skill requires no standard draft folder and never scans for candidates on its own.
4. Body — output: the merged result is written to the appropriate thread-root artifact (`proposal.md`, `spec.md`, `plan.md` + `plan-tasks/`, or `roadmap.md`), replacing/creating it in place; no lineage folders, no frontmatter contracts, no freeze or emission ceremony.
5. Body — decisions: when reconciling divergent candidates surfaces a genuine human choice, ask (or, under explicit AFK, emit an `/emit-pending-decisions` bundle and stop); a settled choice is appended to `decisions.md` as a `D<N>` record before the merged artifact depends on it (P57).
6. Body — keep the merge discipline from the current skill (systematic divergence comparison, no silent dropping of content unique to one candidate) stripped of V2 assumptions.

**Files modified:** `skills/workflow/merge/merge-artifacts/SKILL.md` (rewritten), `skills/workflow/merge/merge-artifacts/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'disable-model-invocation: true' skills/workflow/merge/merge-artifacts/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/merge/merge-artifacts/agents/openai.yaml
grep -n 'decisions.md' skills/workflow/merge/merge-artifacts/SKILL.md
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/merge/merge-artifacts/ ; \
grep -riwE 'tier|ledger' skills/workflow/merge/merge-artifacts/   # both must return nothing
```

**Acceptance criteria:**

- The body accepts explicit candidate paths regardless of storage location, requires no standard draft folder, and writes root artifacts and the singleton decision log with no freeze/lineage/status assumptions (spec AC-5.4).
- Newly settled human choices are recorded per the P57 rule (spec AC-4.4).
- Frontmatter/metadata per the P48 pair; semver bump.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/emit-pending-decisions` contract (Task 3); the `D<N>` record shape (Task 9).

**Produces:** the V3 `merge-artifacts` skill.

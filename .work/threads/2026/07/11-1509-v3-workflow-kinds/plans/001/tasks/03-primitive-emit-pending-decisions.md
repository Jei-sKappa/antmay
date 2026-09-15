# Task 3: Primitive — emit-pending-decisions

**Objective:** Create the `emit-pending-decisions` model-invoked primitive owning pending-decision bundle allocation and shape.

**Input / context:** The cutover spec `specs/001/spec.md` § "Temporary workspaces" (`.pending-decisions/`) and AC-4.3 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P31 (universal AFK→human queue), P33 (resumption bundles and routing header), P47 (no `Resume:` line; required advisory suggested-action section), P32 (filename readability intent), P49 (`emit-pending-decisions` contract). Spec Degrees of freedom #6 leaves the exact filename slug and collision-suffix scheme to you, provided names are unique under concurrency and human-readable. NEW skill.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Create `skills/workflow/primitives/emit-pending-decisions/SKILL.md` with frontmatter: `name: emit-pending-decisions`; a model-routing `description` opening with the bounded precondition (a producing caller supplies producer, target, evidence, one or more genuine human decisions, and a suggested follow-up); `metadata.author`; `metadata.version: 1.0.0`. No `disable-model-invocation`, no `agents/openai.yaml`.
2. Body — bundle allocation: write one uniquely named file per invocation under the active thread's `.pending-decisions/` (create the folder on demand). Names must be unique under concurrent producers and human-readable (UTC stamp + short unique suffix + kebab slug is the conceptual shape); never append to an existing bundle or a shared singleton.
3. Body — bundle shape (P33 as amended by P47): a routing header carrying `Producer:` (`/<skill-name>`), `Target:` (thread-relative artifact or operation), `Created:` (UTC), `Points:` (count), `Summary:` (one line) — and NO `Resume:` line; then a required `## Suggested action after resolving the decisions` paragraph (self-contained advisory follow-up, written from the caller's supplied context — advice, never an executable command or a promise that a named skill is invocable); then one canonical discussion point per unresolved human question, formatted via `/discussion-point` emission mode.
4. Body — bundle invariant: one bundle = one producer + one coherent target + one resumption action; the caller decides the grouping and may request several bundles when its questions split across targets or follow-up actions.
5. Body — refusals: refuse an empty bundle; refuse content that is not a genuine human decision (plain defects, observations, or report material must not be disguised as decision points); refuse when the caller has not supplied producer, target, points, or the suggested follow-up.
6. Ownership boundary: the caller owns whether a question genuinely requires human intent, the evidence's correctness, and the grouping; the primitive owns unique allocation, the shape, and the refusals.

**Files modified:** `skills/workflow/primitives/emit-pending-decisions/SKILL.md` (NEW).

**Verification:**

```sh
test -f skills/workflow/primitives/emit-pending-decisions/SKILL.md
grep -c 'disable-model-invocation' skills/workflow/primitives/emit-pending-decisions/SKILL.md   # expect 0
grep -n 'Resume' skills/workflow/primitives/emit-pending-decisions/SKILL.md   # expect no hits: the header simply omits it, and the body must not narrate its absence
grep -n 'Suggested action after resolving the decisions' skills/workflow/primitives/emit-pending-decisions/SKILL.md   # expect ≥1
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/primitives/emit-pending-decisions/ ; \
grep -riwE 'tier|ledger' skills/workflow/primitives/emit-pending-decisions/   # both must return nothing
```

**Acceptance criteria:**

- `SKILL.md` exists with the model-invocable configuration (neither restriction present) and a description opening with the bounded precondition (spec AC-2.3).
- The body owns unique concurrent bundle allocation under `.pending-decisions/`, the routing header WITHOUT any `Resume:` line, the required `## Suggested action after resolving the decisions` section, canonical points via `/discussion-point`, and refusal of empty or non-human-decision content (spec AC-4.3).
- The documented header template does not contain a `Resume:` field, and the body does not define one. Per hygiene rule 3, the body specifies the header by listing what it contains — it does not narrate that a `Resume:` line was removed.
- Hygiene: AC-1.4 greps return nothing for this folder; no `P<N>` citations or cutover/spec/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/discussion-point` emission mode (Task 2) for canonical point formatting.

**Produces:** the `/emit-pending-decisions` invocation contract and the pending-decision bundle shape that `spec`, `plan-strict`, the reconcile skills, the implement skills, `materialize-roadmap-threads`, and `resolve-pending-decisions` rely on.

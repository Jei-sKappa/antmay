# Task 4: Primitive — emit-pending-review

**Objective:** Create the `emit-pending-review` model-invoked primitive owning findings-bundle allocation and the review bundle schema.

**Input / context:** The cutover spec `specs/001/spec.md` § "Temporary workspaces" (`.pending-reviews/`) and AC-7.2/AC-7.4 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P36 (bundle schema, no-file-on-clean, folder meaning), P38 (manual consumption; no `Address with:`), P49 (`emit-pending-review` contract). Degrees of freedom #6 covers the filename scheme (unique under concurrency, human-readable). NEW skill.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Create `skills/workflow/primitives/emit-pending-review/SKILL.md` with frontmatter: `name: emit-pending-review`; description opening with the bounded precondition (a reviewing caller supplies a target and already validated, evidenced, categorized findings); `metadata.author`; `metadata.version: 1.0.0`. No `disable-model-invocation`, no `agents/openai.yaml`.
2. Body — no-file-on-clean: when the caller reports zero actionable findings, the primitive writes nothing and tells the caller to return its concise pass result in chat. Refuse to create an empty bundle.
3. Body — allocation: one uniquely named bundle per review run under the active thread's `.pending-reviews/` (create on demand); unique under concurrent reviewers; never a shared singleton.
4. Body — schema (P36): routing header `Reviewer:` (`/<review-skill>`), `Target:`, `Created:` (UTC), `Findings:` (count); optional `## Context` for a concise overall assessment; `## Findings` with `### F<N>: <short title>` sections carrying `Severity:` (`blocker | issue | nit`), `Category:` (review-specific, owned by the caller), `Finding:`, `Evidence:`, `Impact:`, and `Suggested action:` only when useful and supported. `F<N>` numbering is sequential and local to the bundle; findings are ordered by severity, then by the caller's category order.
5. Body — boundaries: no `Address with:` field, no statuses, dispositions, or lifecycle markers inside the bundle; the primitive does not judge finding validity, does not route findings anywhere else, and never writes `.pending-decisions/`. Refuse invocation without a target or without structured findings.

**Files modified:** `skills/workflow/primitives/emit-pending-review/SKILL.md` (NEW).

**Verification:**

```sh
test -f skills/workflow/primitives/emit-pending-review/SKILL.md
grep -c 'disable-model-invocation' skills/workflow/primitives/emit-pending-review/SKILL.md   # expect 0
grep -n 'blocker' skills/workflow/primitives/emit-pending-review/SKILL.md    # severity scale present
grep -n 'Address with' skills/workflow/primitives/emit-pending-review/SKILL.md   # expect no hits
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/primitives/emit-pending-review/ ; \
grep -riwE 'tier|ledger' skills/workflow/primitives/emit-pending-review/   # both must return nothing
```

**Acceptance criteria:**

- `SKILL.md` exists, model-invocable (neither restriction), description opens with the bounded precondition (spec AC-2.3).
- The body owns the P36 schema exactly as listed in step 4 — routing header (Reviewer, Target, Created, Findings count), optional `## Context`, `F<N>` findings with Severity (blocker/issue/nit), Category, Finding, Evidence, Impact, optional Suggested action, ordered by severity then category (spec AC-7.2).
- The body enforces no-file-on-clean, unique concurrent path allocation, and prescribes no `Address with:` field, statuses, dispositions, or retry loops (spec AC-7.4).
- Hygiene: AC-1.4 greps return nothing for this folder; no `P<N>` citations or cutover/spec/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** none

**Produces:** the `/emit-pending-review` invocation contract and the findings-bundle schema that `review-spec`, `review-roadmap`, `review-implementation`, and `review-code` rely on.

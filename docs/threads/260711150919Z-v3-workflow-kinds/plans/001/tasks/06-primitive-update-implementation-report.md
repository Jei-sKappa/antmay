# Task 6: Primitive — update-implementation-report

**Objective:** Create the `update-implementation-report` model-invoked primitive owning the singleton implementation report's structure and merge semantics.

**Input / context:** The cutover spec `specs/001/spec.md` § "Implementation outcome" and AC-9.5 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P45 (report contract and update-in-place semantics), P49 (`update-implementation-report` contract), P40 (no durable references into `.implementation-runs/`). NEW skill.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Create `skills/workflow/primitives/update-implementation-report/SKILL.md` with frontmatter: `name: update-implementation-report`; description opening with the bounded precondition (an implementation caller supplies a verified current outcome — changes, checks actually performed, deviations, concerns, follow-ups); `metadata.author`; `metadata.version: 1.0.0`. No `disable-model-invocation`, no `agents/openai.yaml`.
2. Body — the report contract (P45): the thread-root `implementation-report.md` carries required `Source`, `## Outcome`, `## Changes`, `## Verification`, and optional `## Deviations and judgment calls`, `## Remaining concerns`, `## Follow-ups`; optional sections appear only when they contain information — never `none` placeholders.
3. Body — merge semantics: create the file when absent; on later passes merge the caller-supplied current outcome in place — replace stale descriptions, remove resolved concerns and obsolete blockers, never append run transcripts or prior-pass history. The report describes the thread's CURRENT implementation outcome, including partial, blocked, and no-op outcomes stated plainly.
4. Body — content boundaries: verification records only checks the caller actually performed, including failures and justified skips; task transcripts, dispatch counts, fix-loop details, and any path under `.implementation-runs/` are kept OUT of the report; commit SHAs are optional.
5. Body — ownership boundary: the primitive formats and merges; it does not inspect code, rerun checks, or decide whether the implementation succeeded. Refuse invocation without a caller-supplied outcome.

**Files modified:** `skills/workflow/primitives/update-implementation-report/SKILL.md` (NEW).

**Verification:**

```sh
test -f skills/workflow/primitives/update-implementation-report/SKILL.md
grep -c 'disable-model-invocation' skills/workflow/primitives/update-implementation-report/SKILL.md   # expect 0
grep -n 'implementation-report.md' skills/workflow/primitives/update-implementation-report/SKILL.md
grep -n 'implementation-runs' skills/workflow/primitives/update-implementation-report/SKILL.md   # present only as the keep-out rule
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/primitives/update-implementation-report/ ; \
grep -riwE 'tier|ledger' skills/workflow/primitives/update-implementation-report/   # both must return nothing
```

**Acceptance criteria:**

- `SKILL.md` exists, model-invocable (neither restriction), description opens with the bounded precondition (spec AC-2.3).
- The body owns the singleton contract: required Source/Outcome/Changes/Verification, optional sections without `none` placeholders, in-place merges that remove resolved or obsolete concerns, and exclusion of task transcripts and `.implementation-runs/` references; it does not inspect code or decide whether implementation succeeded (spec AC-9.5).
- Hygiene: AC-1.4 greps return nothing for this folder; no `P<N>` citations or cutover/spec/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** none

**Produces:** the `/update-implementation-report` invocation contract and the `implementation-report.md` shape that `implement`, `implement-plan`, and `implement-plan-with-subagents` rely on.

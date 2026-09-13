# Task 11: Rewrite propose

**Objective:** Rewrite `propose` to emit the thread-root `proposal.md` with no V2 lifecycle machinery.

**Input / context:** The cutover spec `specs/001/spec.md` § "Thread model → Layout", § "Skill migration inventory → Deep rewrites", AC-5.1 and AC-4.4 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P23/P62 (shallow layout), P12 (write authority), P57 (record elicited decisions before use), P13/P31 (completion-oriented posture; AFK blocking). Current file: `skills/workflow/propose/propose/SKILL.md` (V2: `proposals/NNN/` lineage folders, frontmatter version/status, `.wip/` drafts — all gone). Preserve the proposal-authoring core: turning a rough prompt or referenced artifact into a freeform direction-setting proposal.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: keep `name: propose`; concise human-facing `description`; `disable-model-invocation: true`; bump `metadata.version` (major appropriate).
2. Create `skills/workflow/propose/propose/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — inputs and output: read `seed.md`, `decisions.md`, and any explicit reference or prompt; write the single thread-root `proposal.md`. No numbered lineage folders, no frontmatter on the artifact, no version or status fields, no draft workspace. Editing an existing `proposal.md` is an in-place revision of the same file.
4. Body — preserve the freeform proposal shape (direction, options considered, open questions) from the current skill where it is independent of V2 machinery; the proposal must be self-contained (readable without the chat).
5. Body — decision recording (P57): if authoring requires asking the user a question that settles product or workflow intent, append the answer to `decisions.md` as a `D<N>` record before the proposal depends on it; trivial input clarifications need no record.
6. Body — blocked-AFK behavior: under an explicit AFK invocation, an indispensable human decision becomes a bundle via `/emit-pending-decisions` and the run stops with a concise notification instead of waiting in chat.

**Files modified:** `skills/workflow/propose/propose/SKILL.md` (rewritten), `skills/workflow/propose/propose/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'disable-model-invocation: true' skills/workflow/propose/propose/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/propose/propose/agents/openai.yaml
grep -n 'proposal.md' skills/workflow/propose/propose/SKILL.md
grep -nE 'proposals/|NNN' skills/workflow/propose/propose/SKILL.md   # expect no lineage-folder hits
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/propose/propose/ ; \
grep -riwE 'tier|ledger' skills/workflow/propose/propose/   # both must return nothing
```

**Acceptance criteria:**

- The body writes the thread-root `proposal.md`; no lineage folders, `NNN` numbering, frontmatter version/status contracts, or `.wip/` references remain (spec AC-5.1).
- The body carries the P57 rule as plain behavior (elicited human decisions are appended to `decisions.md` before being used) (spec AC-4.4) and the blocked-AFK bundle behavior via `/emit-pending-decisions`.
- Frontmatter/metadata per the P48 pair; semver bump.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/emit-pending-decisions` contract (Task 3); the `D<N>` record shape (Task 9).

**Produces:** the V3 `propose` skill writing thread-root `proposal.md` (the artifact `reconcile-proposal` targets).

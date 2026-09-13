# Task 22: New skill — materialize-roadmap-threads

**Objective:** Create `materialize-roadmap-threads`, the idempotent operation that turns roadmap child briefs into child threads.

**Input / context:** The cutover spec `specs/001/spec.md` § "Roadmap artifacts" and AC-8.2 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P22 (separate materialization capability; missing-selection behavior), P41 (`Materialized thread:` as factual evidence; the four materializer rules), P24 (copy already-expanded suggestions verbatim; never resolve names against newer templates), P53 (reference syntax: `Materialized thread:` and `Parent:` are repo-relative thread-root directory paths; `Roadmap brief:` is the parent's stable `C<N>`), P49 (delegate creation to `/create-thread`), P57, P13/P31. NEW skill at `skills/workflow/roadmap/materialize-roadmap-threads/`.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Create `skills/workflow/roadmap/materialize-roadmap-threads/SKILL.md` with frontmatter: `name: materialize-roadmap-threads`; concise human-facing `description`; `disable-model-invocation: true`; `metadata.author`; `metadata.version: 1.0.0`.
2. Create `agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — idempotent loop over the parent's `roadmap.md` child briefs: a brief WITHOUT `Materialized thread:` → create its child thread; a brief WITH one → skip it, verifying the referenced thread folder exists (flag a dangling reference to the user; do not recreate silently). Immediately after each successful creation, add `Materialized thread: <repo-relative thread-root path>` to that brief — this is the only edit ever made to `roadmap.md`, and it is factual evidence, never status.
4. Body — child creation: delegate to `/create-thread` with the full caller-authorization block; the child seed carries the brief-derived title and genesis, `Parent:` as the parent thread's repo-relative thread-root directory path (the folder, not a file), `Roadmap brief:` as the brief's `C<N>`, and the brief's `Suggested workflow` text copied VERBATIM — never re-resolved against workflow templates, even when it looks like a built-in name's expansion.
5. Body — missing or unusable suggestion in a brief: interactively, ask the user for it; under an explicit AFK invocation, record the unresolved brief (skip it) and continue with the others, reporting the skips — never invent a workflow. New human intent elicited along the way is appended to the parent's `decisions.md` before use; under AFK an indispensable decision becomes an `/emit-pending-decisions` bundle.
6. Body — boundaries: never track child status, never edit sibling threads, never delete or rewrite briefs, never create a child not defined by a brief.

**Files modified:** `skills/workflow/roadmap/materialize-roadmap-threads/SKILL.md` (NEW), `skills/workflow/roadmap/materialize-roadmap-threads/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'name: materialize-roadmap-threads' skills/workflow/roadmap/materialize-roadmap-threads/SKILL.md
grep -n 'disable-model-invocation: true' skills/workflow/roadmap/materialize-roadmap-threads/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/roadmap/materialize-roadmap-threads/agents/openai.yaml
grep -n 'create-thread' skills/workflow/roadmap/materialize-roadmap-threads/SKILL.md
grep -n 'Materialized thread' skills/workflow/roadmap/materialize-roadmap-threads/SKILL.md
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/roadmap/materialize-roadmap-threads/ ; \
grep -riwE 'tier|ledger' skills/workflow/roadmap/materialize-roadmap-threads/   # both must return nothing
```

**Acceptance criteria:**

- The body implements idempotent materialization (create unreferenced briefs; skip-and-verify referenced ones; add `Materialized thread:` immediately after each creation), copies suggestions verbatim without template re-resolution, asks on a missing suggestion interactively, records-and-skips under AFK, writes `Parent:` as a repo-relative thread-root path and `Roadmap brief:` as `C<N>`, and delegates creation to `/create-thread` (spec AC-8.2).
- The body carries the P57 rule (spec AC-4.4); frontmatter/metadata per the P48 pair; `metadata.version: 1.0.0`.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/create-thread` contract (Task 5); `/emit-pending-decisions` contract (Task 3); the `roadmap.md` `C<N>` brief shape (Task 19).

**Produces:** the V3 `materialize-roadmap-threads` skill.

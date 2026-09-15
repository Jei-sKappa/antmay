# Task 32: Rewrite archive-thread

**Objective:** Rewrite `archive-thread` as explicit-intent archival with the pending-state warning and the named link-breakage limitation.

**Input / context:** The cutover spec `specs/001/spec.md` § "Lifecycle and archive", § "Finish, navigation, archival", AC-10.3 and the out-of-scope rule on archival links (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P60 (pre-move inspection; named contents; single confirmation; never delete), P11 (archive location is the terminal signal; abandonment is recorded as a decision with rationale), P52 (references may break on archival — name the limitation, do NOT design repair, indirection, or an ID registry). Current file: `skills/workflow/finish-navigate/archive-thread/SKILL.md` (67 lines; V2: ledger/latch closure checks — replace wholesale).

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X. (The "never delete the workspaces" rule DOES belong: the inspection step could plausibly tempt cleanup. The link-breakage note DOES belong: it is a real runtime consequence the user must be told about.)
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: keep `name: archive-thread`; concise human-facing `description`; `disable-model-invocation: true`; bump `metadata.version` (major appropriate).
2. Create `skills/workflow/finish-navigate/archive-thread/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — trigger: archival happens on explicit user intent, with no completion checks of any kind; the move to `docs/threads/archive/<thread-folder>/` is the act that ends the thread's active lifecycle.
4. Body — pre-move inspection (P60): inspect `.pending-decisions/`, `.pending-reviews/`, and `.implementation-runs/`; if any are non-empty, name their contents (bundle titles/headers, interrupted run identifiers) and ask for ONE confirmation to archive anyway — an advisory signal, not a gate. On confirmed archival the folders move along untouched; the skill NEVER deletes them or their contents. In an archived thread they are inert residue with no workflow meaning.
5. Body — abandonment guidance (P11), as guidance not a gate: when the user is archiving unfinished work, suggest recording the abandonment as a decision with its rationale in `decisions.md` first, so the durable content distinguishes completed from abandoned threads.
6. Body — known limitation (P52), named without solving: repo-relative references pointing at this thread (parent/child links, decision references) may break once it moves under `docs/threads/archive/`; tell the user this is accepted; do not attempt link discovery, rewriting, or repair.
7. Body — mechanics: `git mv` the thread folder into `docs/threads/archive/` (create the archive folder on demand); report the new path.

**Files modified:** `skills/workflow/finish-navigate/archive-thread/SKILL.md` (rewritten), `skills/workflow/finish-navigate/archive-thread/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'disable-model-invocation: true' skills/workflow/finish-navigate/archive-thread/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/finish-navigate/archive-thread/agents/openai.yaml
grep -n 'archive/' skills/workflow/finish-navigate/archive-thread/SKILL.md
grep -nE 'pending-decisions|pending-reviews|implementation-runs' skills/workflow/finish-navigate/archive-thread/SKILL.md
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/finish-navigate/archive-thread/ ; \
grep -riwE 'tier|ledger' skills/workflow/finish-navigate/archive-thread/   # both must return nothing
```

**Acceptance criteria:**

- The body implements P60: pre-move inspection of the three workspaces, named contents, single confirmation, no deletion; archives on explicit user intent with no ledger/latch checks; states P11's abandonment convention as guidance, not a gate; and names (without solving) the link-breakage limitation (spec AC-10.3).
- Frontmatter/metadata per the P48 pair; semver bump.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** the three-workspace semantics (Tasks 3, 4, 25–27) as inspection targets.

**Produces:** the V3 `archive-thread` skill.

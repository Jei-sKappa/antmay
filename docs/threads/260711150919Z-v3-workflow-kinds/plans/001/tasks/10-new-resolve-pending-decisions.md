# Task 10: New skill — resolve-pending-decisions

**Objective:** Create `resolve-pending-decisions`, the user-invoked interactive bridge that consumes pending-decision bundles and turns settled choices into durable decision records.

**Input / context:** The cutover spec `specs/001/spec.md` § "Temporary workspaces" and AC-4.2 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P33 (header-only queue discovery; bundle selection; point removal; deletion of exhausted bundles), P47 (advisory follow-up; interactive choice; one bounded continuation; no automatic skill invocation), P31 (queue semantics), P59 (placement: `capture-discussion/`). NEW skill at `skills/workflow/capture-discussion/resolve-pending-decisions/`.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Create `skills/workflow/capture-discussion/resolve-pending-decisions/SKILL.md` with frontmatter: `name: resolve-pending-decisions`; concise human-facing `description` (settle the thread's queued pending decisions interactively and record the outcomes); `disable-model-invocation: true`; `metadata.author`; `metadata.version: 1.0.0`.
2. Create `agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — selection (P33): with an explicit bundle path argument, load only that bundle. Without one, list the files under the active thread's `.pending-decisions/` reading ONLY their routing headers — never ingest unrelated bundle bodies. Exactly one bundle → select it directly. Several → present a compact queue (title, producer, target, summary, point count) and let the user choose, adding a recommended order only when dependency or urgency materially favors one.
4. Body — resolution loop (P47): discuss the selected bundle's points one at a time via `/discussion-point`; after each settled point, append a `D<N>` decision record to the thread-root `decisions.md` (same record shape the `discussion` skill writes), then remove that settled point from the bundle so the file always holds only unresolved points; when the last point settles, delete the exhausted bundle.
5. Body — follow-through (P47): reassess the bundle's `## Suggested action after resolving the decisions` against the decisions just made and the current repository state; offer the user your own recommended next action (adopt, refine, or reject the producer's suggestion); WAIT for the user's choice. If accepted, perform the bounded application-and-recheck directly — once — without invoking another skill unless the user explicitly names one; if it uncovers genuinely new human judgment, emit a new bundle via `/emit-pending-decisions` and stop. If declined or deferred, stop cleanly after recording the decisions. Never automatically open or consume a newly emitted bundle in the same run.
6. Body — scope: only genuine human decisions flow through this skill; it does not audit the repository, judge artifact quality, or fabricate points not present in a bundle.

**Files modified:** `skills/workflow/capture-discussion/resolve-pending-decisions/SKILL.md` (NEW), `skills/workflow/capture-discussion/resolve-pending-decisions/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'disable-model-invocation: true' skills/workflow/capture-discussion/resolve-pending-decisions/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/capture-discussion/resolve-pending-decisions/agents/openai.yaml
grep -n 'Suggested action after resolving the decisions' skills/workflow/capture-discussion/resolve-pending-decisions/SKILL.md
grep -n 'discussion-point' skills/workflow/capture-discussion/resolve-pending-decisions/SKILL.md
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/capture-discussion/resolve-pending-decisions/ ; \
grep -riwE 'tier|ledger' skills/workflow/capture-discussion/resolve-pending-decisions/   # both must return nothing
```

**Acceptance criteria:**

- The body implements the P33 selection behavior (header-only listing; direct single-bundle selection; compact queue with order recommendation only when materially preferable) and the P47 follow-through (one point at a time; record each decision to `decisions.md`; remove settled points; delete exhausted bundles; reassess the suggested action; offer a recommendation; wait for the user; one bounded continuation if accepted; no automatic skill invocation; no recursive consumption of a newly emitted bundle) (spec AC-4.2).
- Frontmatter/metadata per the P48 pair; `metadata.version: 1.0.0`; concise human-facing description.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/discussion-point` (Task 2); the bundle shape and `/emit-pending-decisions` contract (Task 3); the `D<N>` record shape (Task 9).

**Produces:** the V3 `resolve-pending-decisions` entry point that workflow docs and other briefs name as the queue's interactive resolver.

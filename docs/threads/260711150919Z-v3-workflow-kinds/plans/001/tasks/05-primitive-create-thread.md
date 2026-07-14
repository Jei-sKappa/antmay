# Task 5: Primitive — create-thread

**Objective:** Create the `create-thread` model-invoked primitive owning normalized thread-folder creation.

**Input / context:** The cutover spec `specs/001/spec.md` § "Thread model" (layout, seed contract) and AC-3.3 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P49 (`create-thread` contract and authorization block), P62 (authoritative thread layout), P24/P26 (seed contents: title, genesis narrative, verbatim `## Suggested workflow`; sparse conditional metadata), P9 (eager header-only `decisions.md`), P53 (`Parent:` repo-relative thread-root path; `Roadmap brief:` `C<N>`), P27 (`External:` records a real URL only). NEW skill.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Create `skills/workflow/primitives/create-thread/SKILL.md` with frontmatter: `name: create-thread`; description opening with the bounded precondition (an invoking operation supplies an explicit authorization block with every normalized field); `metadata.author`; `metadata.version: 1.0.0`. No `disable-model-invocation`, no `agents/openai.yaml`.
2. Body — the authorization gate: the primitive acts only when the caller supplies an explicit caller-authorization block naming (a) the invoking user-facing operation and (b) every normalized field: thread slug/title, the complete seed genesis narrative, the complete `## Suggested workflow` text, and any conditional metadata (`External:` URL, `Parent:` thread reference, `Roadmap brief:` identifier, `Supersedes:` reference). Without a complete block it REFUSES and directs the user to `open-thread`. It never interprets a rough idea, never chooses or infers a workflow, never composes narrative content itself.
3. Body — normalized creation: allocate `docs/threads/<YYMMDDHHMMSSZ-slug>/` (UTC timestamp + supplied kebab slug); write `seed.md` containing exactly the supplied title, genesis narrative, conditional metadata lines, and the supplied `## Suggested workflow` section copied verbatim; eagerly create `decisions.md` as a header-only file. Nothing else is created — no other folders or placeholder files.
4. Body — conditional metadata rules: `External:` appears only when a real URL was supplied (never `none`); `Parent:` uses a repo-relative thread-root directory path (pointing at the folder, not a file inside it); `Roadmap brief:` uses the parent roadmap's `C<N>` identifier; `Supersedes:` appears only when the caller supplied a known supersession relationship worth recording; absent metadata is simply absent.
5. Body — report the created thread path back to the caller.

**Files modified:** `skills/workflow/primitives/create-thread/SKILL.md` (NEW).

**Verification:**

```sh
test -f skills/workflow/primitives/create-thread/SKILL.md
grep -c 'disable-model-invocation' skills/workflow/primitives/create-thread/SKILL.md   # expect 0
grep -n 'open-thread' skills/workflow/primitives/create-thread/SKILL.md   # refusal redirect present
grep -n 'decisions.md' skills/workflow/primitives/create-thread/SKILL.md  # eager creation present
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/primitives/create-thread/ ; \
grep -riwE 'tier|ledger' skills/workflow/primitives/create-thread/   # both must return nothing
```

**Acceptance criteria:**

- `SKILL.md` exists, model-invocable (neither restriction), description opens with the bounded precondition (spec AC-2.3).
- The body requires an explicit caller-authorization block naming the invoking operation and every normalized field, refuses without it directing the user to `open-thread`, and never chooses a workflow or interprets a rough idea (spec AC-3.3).
- The body writes `seed.md` (title + genesis + verbatim `## Suggested workflow` + conditional metadata only) and an eager header-only `decisions.md`; no owner/tier/lifecycle/placeholder fields anywhere in the seed contract.
- Hygiene: AC-1.4 greps return nothing for this folder; no `P<N>` citations or cutover/spec/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** none

**Produces:** the `/create-thread` invocation contract (authorization block; normalized folder/seed/decisions creation) that `open-thread` and `materialize-roadmap-threads` delegate to.

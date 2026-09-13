# Task 7: Primitive — append-roadmap-feedback

**Objective:** Create the `append-roadmap-feedback` model-invoked primitive owning the append-only roadmap feedback channel.

**Input / context:** The cutover spec `specs/001/spec.md` § "Roadmap artifacts" and AC-8.3 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P21 (feedback record shape, cross-child-impact rule, narrow descendant write authority, archived-parent exception), P49 (`append-roadmap-feedback` contract). NEW skill.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Create `skills/workflow/primitives/append-roadmap-feedback/SKILL.md` with frontmatter: `name: append-roadmap-feedback`; description opening with the bounded precondition (a descendant-thread caller supplies the parent roadmap reference and a discovery with parent- or sibling-level impact); `metadata.author`; `metadata.version: 1.0.0`. No `disable-model-invocation`, no `agents/openai.yaml`.
2. Body — record shape (P21): append to the parent thread's `roadmap-feedback.md` a record numbered with the next sequential `F<N>`, carrying a title, `Source` (the child thread that produced the discovery), `Affects` (named future child briefs, shared constraints, overall direction, or a possible new child), `Context` (self-contained evidence and the assumption or boundary challenged), `Impact` (why later work may need to change), and `Recommendation` (advisory next action, never a new human decision).
3. Body — append discipline: read the existing file only to determine the next `F<N>` and append at the end; never rewrite, renumber, or edit existing records or the file header.
4. Body — authority boundary: this append is legitimate even when the parent thread sits under `docs/threads/archive/` (the one narrow exception to archived threads being read-only); appending never grants any other write into the parent — no edits to the parent's `roadmap.md`, `decisions.md`, or any sibling thread.
5. Body — the impact gate: REJECT content that is only a local implementation note, local surprise, or report material with no impact on the roadmap direction, shared constraints, another child, or the need for an additional child. The caller owns the evidence; the primitive owns the shape, numbering, and this gate.

**Files modified:** `skills/workflow/primitives/append-roadmap-feedback/SKILL.md` (NEW).

**Verification:**

```sh
test -f skills/workflow/primitives/append-roadmap-feedback/SKILL.md
grep -c 'disable-model-invocation' skills/workflow/primitives/append-roadmap-feedback/SKILL.md   # expect 0
grep -nE 'F<N>|F1' skills/workflow/primitives/append-roadmap-feedback/SKILL.md   # numbering owned here
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/primitives/append-roadmap-feedback/ ; \
grep -riwE 'tier|ledger' skills/workflow/primitives/append-roadmap-feedback/   # both must return nothing
```

**Acceptance criteria:**

- `SKILL.md` exists, model-invocable (neither restriction), description opens with the bounded precondition (spec AC-2.3).
- The body allocates the next `F<N>`, validates the record shape (Title, Source, Affects, Context, Impact, Recommendation), appends without rewriting, works under the narrow archived-parent exception, and rejects local-only implementation notes (spec AC-8.3).
- Hygiene: AC-1.4 greps return nothing for this folder; no `P<N>` citations or cutover/spec/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** none

**Produces:** the `/append-roadmap-feedback` invocation contract that the implement skills use from Roadmap descendant threads.

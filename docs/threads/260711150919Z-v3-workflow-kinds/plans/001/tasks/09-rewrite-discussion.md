# Task 9: Rewrite discussion

**Objective:** Rewrite `discussion` as the open-ended interview that discovers decision points live and appends `D<N>` records to the thread's singleton `decisions.md`.

**Input / context:** The cutover spec `specs/001/spec.md` § "decisions.md" and AC-4.1 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P9 (decision-record fields and field rules; supersession by append), P29 (`discussion` uses `/discussion-point` when a concrete fork emerges), P13 (dialogue-driven posture). Current file: `skills/workflow/capture-discussion/discussion/SKILL.md` (V2: target-scoped logs under artifact folders — replace with the singleton model; the interview technique may be carried over where it survives unchanged).

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: keep `name: discussion`; concise human-facing `description` (open-ended interview that settles decisions into the thread's decision log); add `disable-model-invocation: true`; bump `metadata.version` (major appropriate).
2. Create `skills/workflow/capture-discussion/discussion/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — operation: read the thread's `seed.md` and `decisions.md` for context; conduct the interview live; when a concrete decision fork emerges, present it via `/discussion-point` (one point at a time; facts separated from human decisions; options or a practical proposed solution plus a recommendation).
4. Body — recording: once a point is settled, append a self-contained `D<N>` record to the thread-root `decisions.md` with sequential thread-local numbering and the fields Title, optional `Scope`, mandatory `Context`, `Decision`, `Rationale`, obeying the P9 field rules restated as plain behavior: Context is one short self-contained paragraph from the thread's perspective, never conversational ("as you said"), never introducing new choices; Decision states the complete substantive resolution, never an option letter; Rationale records why plus the principal trade-off; menus and deliberation are not copied in.
5. Body — supersession: when a settled decision changes, append a new record naming the record it supersedes; never rewrite or delete existing records.
6. Body — posture: dialogue-driven; questions are normal output; the seed plus `decisions.md` must suffice for later work without this chat.

**Files modified:** `skills/workflow/capture-discussion/discussion/SKILL.md` (rewritten), `skills/workflow/capture-discussion/discussion/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'disable-model-invocation: true' skills/workflow/capture-discussion/discussion/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/capture-discussion/discussion/agents/openai.yaml
grep -n 'discussion-point' skills/workflow/capture-discussion/discussion/SKILL.md
grep -nE 'D<N>' skills/workflow/capture-discussion/discussion/SKILL.md
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/capture-discussion/discussion/ ; \
grep -riwE 'tier|ledger' skills/workflow/capture-discussion/discussion/   # both must return nothing
```

**Acceptance criteria:**

- The body invokes `/discussion-point` for concrete forks and appends `D<N>` records (Title, optional Scope, mandatory Context, Decision, Rationale, per the P9 field rules restated as behavior) to the thread-root `decisions.md`; superseding records are appended naming the superseded record, never rewritten (spec AC-4.1).
- No target-scoped or artifact-local log behavior remains; the only decision store is the singleton `decisions.md`.
- Frontmatter/metadata per the P48 pair; concise human-facing description; semver bump (spec AC-2.1/2.2).
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/discussion-point` contract (Task 2).

**Produces:** the V3 `discussion` skill and the operative `D<N>` record shape other briefs reference as "the decision-record format `discussion` writes".

# Task 2: Primitive — discussion-point

**Objective:** Create the `discussion-point` model-invoked primitive owning the canonical discussion-point structure and discipline.

**Input / context:** The cutover spec `specs/001/spec.md` § "Skill architecture" and AC-4.5 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P29 (creation and discipline), P49 (`discussion-point` contract and primitive rules), P9 (the discussion-point fields and their separation from durable decision records), P13 (facts versus human decisions). This is a NEW skill; no prior file exists.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Create `skills/workflow/primitives/discussion-point/SKILL.md` with frontmatter: `name: discussion-point`; a model-routing `description` that OPENS with the bounded caller precondition (per P49 — e.g., that a caller has one concrete decision fork or finding to present or normalize); `metadata.author: https://github.com/Jei-sKappa`; `metadata.version: 1.0.0`. Do NOT add `disable-model-invocation` and do NOT create `agents/openai.yaml` — omission of both is the model-invocable configuration.
2. Write the body to own the canonical point structure (P9/P29/P49): **Title**, **Point** (the decision to make), **What you need to know** (self-contained evidence and surrounding context), **creative options OR a practical proposed solution** (choose the presentation that fits the fork), and **Recommendation**.
3. Encode the discipline: strict separation of established facts from open human decisions (facts are stated as facts; only genuine choices are presented as options); one point presented at a time, never a batch.
4. Support both operating modes: (a) interactive presentation of a point in chat, and (b) normalization/emission of a caller-supplied point into a caller-provided file path (the caller owns path allocation, evidence correctness, and any surrounding document structure).
5. Add the refusal rule: when invoked without a concrete point (or without the caller-provided target path in emission mode), the primitive refuses and asks the caller to supply what is missing rather than inventing a decision or expanding into a broader discussion.

**Files modified:** `skills/workflow/primitives/discussion-point/SKILL.md` (NEW).

**Verification:**

```sh
test -f skills/workflow/primitives/discussion-point/SKILL.md
grep -c 'disable-model-invocation' skills/workflow/primitives/discussion-point/SKILL.md   # expect 0
test ! -e skills/workflow/primitives/discussion-point/agents
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/primitives/discussion-point/ ; \
grep -riwE 'tier|ledger' skills/workflow/primitives/discussion-point/   # both must return nothing
grep -rniE 'v2|v3|supersede|migrat|acceptance criteria|decision log' skills/workflow/primitives/discussion-point/SKILL.md   # read any hit; must not reference repo-internal planning context
```

**Acceptance criteria:**

- `SKILL.md` exists with `name: discussion-point`, `metadata.author`, semver `metadata.version: 1.0.0`, no `disable-model-invocation`, no `agents/openai.yaml`; the `description` opens with the bounded caller precondition (spec AC-2.3).
- The body owns: Title / Point / What-you-need-to-know framing, creative options versus a practical proposed solution, Recommendation, the facts-versus-human-decisions separation, and one-point-at-a-time presentation; it supports both interactive presentation and normalization/emission into a caller-provided path (spec AC-4.5).
- The body refuses incomplete direct routing instead of expanding into a user-facing workflow.
- Hygiene: the AC-1.4 greps above return nothing for this folder; the body contains no `P<N>` citations, no mention of the cutover project, its spec, or earlier workflow versions; no disclaimers naming retired concepts; no guideline stated twice across sections.

**Consumes:** none

**Produces:** the `/discussion-point` invocation contract (canonical point structure; interactive and emission modes) that `discussion`, `resolve-pending-decisions`, and `emit-pending-decisions` reference by `/skill-name` prose.

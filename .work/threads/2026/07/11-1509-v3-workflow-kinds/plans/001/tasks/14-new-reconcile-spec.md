# Task 14: New skill — reconcile-spec

**Objective:** Create `reconcile-spec`, the mutating decision-fidelity operation that makes `spec.md` a lossless, additive-free expression of the decisions that govern it.

**Input / context:** The cutover spec `specs/001/spec.md` § "Reconciliation versus review" and AC-6.1/AC-6.2/AC-6.3 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P37 (the nine-step operation and core question), P39 (both lossless directions; successor responsibility), P35 (reconciliation semantics). NEW skill at `skills/workflow/reconcile/reconcile-spec/`.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.) In particular, do NOT describe this skill as anyone's "successor" — it simply is the spec-reconciliation operation.
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Create `skills/workflow/reconcile/reconcile-spec/SKILL.md` with frontmatter: `name: reconcile-spec`; concise human-facing `description`; `disable-model-invocation: true`; `metadata.author`; `metadata.version: 1.0.0`.
2. Create `agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — the operation (P37, restated as behavior): read `decisions.md`, `seed.md`, and relevant upstream artifacts (e.g., `proposal.md`); inventory the decisions the spec should carry; then edit the thread-root `spec.md` to (a) add clearly omitted decisions, (b) remove or correct content contradicting existing decisions, (c) remove unsupported choices the spec invented, while (d) preserving legitimate elaboration and mechanically derived acceptance criteria. Recheck the spec after corrections.
4. Body — the core question, stated once: is this specification a lossless, additive-free expression of the decisions that govern it?
5. Body — irreducible intent: when determining the correct specification requires NEW human intent, emit one coherent bundle via `/emit-pending-decisions` (producer `reconcile-spec`, target `spec.md`); never guess.
6. Body — authority boundary: never edit `decisions.md`, `seed.md`, or upstream artifacts to make the spec appear consistent — a source fault becomes a pending decision. Produce no review report; a clean or corrected pass ends with a concise chat summary.
7. Body — no invocation-time modes (single fixed mutation contract).

**Files modified:** `skills/workflow/reconcile/reconcile-spec/SKILL.md` (NEW), `skills/workflow/reconcile/reconcile-spec/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'name: reconcile-spec' skills/workflow/reconcile/reconcile-spec/SKILL.md
grep -n 'disable-model-invocation: true' skills/workflow/reconcile/reconcile-spec/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/reconcile/reconcile-spec/agents/openai.yaml
grep -n 'emit-pending-decisions' skills/workflow/reconcile/reconcile-spec/SKILL.md
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/reconcile/reconcile-spec/ ; \
grep -riwE 'tier|ledger' skills/workflow/reconcile/reconcile-spec/   # both must return nothing
```

**Acceptance criteria:**

- The body: edits `spec.md` when corrections follow from existing decisions; rechecks after fixing; emits bundles via `/emit-pending-decisions` for irreducible intent; never edits its authority sources; produces no review report (spec AC-6.1).
- The body states BOTH lossless directions: adding governing decisions the spec omitted, AND removing/correcting contradictions and unsupported additions — while preserving legitimate elaboration and derived acceptance criteria (spec AC-6.2).
- No invocation-time mode switches (spec AC-6.3).
- Frontmatter/metadata per the P48 pair; `metadata.version: 1.0.0`.
- Hygiene: greps return nothing; no `P<N>` citations, no successor/migration narration, no cutover references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/emit-pending-decisions` contract (Task 3); thread-root `spec.md` (Task 13).

**Produces:** the V3 `reconcile-spec` skill (the unbracketed normal step after `spec` in the Standard sequence).

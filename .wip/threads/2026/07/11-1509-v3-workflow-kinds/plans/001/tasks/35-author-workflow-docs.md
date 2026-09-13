# Task 35: Author the three workflow documents

**Objective:** Create `docs/project/v3/workflows/quick.md`, `standard.md`, and `roadmap.md`, one process definition each.

**Input / context:** The cutover spec `specs/001/spec.md` § "Workflows", § "Canonical documentation" (the workflows mapping) and AC-11.4/AC-8.5 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P43 (the three sequences; unbracketed reconciliation, bracketed reviews; `resolve-pending-decisions` as reactive infrastructure), P44/P58 (escalation: in-place, atomic plan replacement, then the COMPLETE Standard tail — an escalated thread is indistinguishable from born-Standard from the specification stage onward), P18 (optional activities, never variants), P20/P21/P22 (Roadmap purpose, feedback loop, materialization), P41 (roadmap artifacts), P25 (documents point to the canonical templates; they do not duplicate the seed text verbatim). Same writing rules as Task 34: present tense, no `P<N>` citations, no cutover narration.

**Steps:**

1. Create `docs/project/v3/workflows/quick.md`: purpose (smallest delivery path); the Quick sequence with reconciliation absent by design, optional steps marked (discussion, plan-brief, reviews, archive); durable outputs (seed, decisions, optional brief plan, project changes, implementation report); user involvement; natural terminal outcome (finish → optional archival); the escalation path to Standard (create `spec.md` → reconcile the spec → strict planning replaces the brief `plan.md` and creates `plan-tasks/` atomically → continue with the complete Standard tail: plan reconciliation, plan execution, optional reviews, finish); a pointer to the canonical Quick template (repo-relative link to `shared/references/workflows/quick.md`) for the exact seed text — do NOT duplicate the `## Suggested workflow` section verbatim.
2. Create `docs/project/v3/workflows/standard.md`: purpose (the normal spec-driven path for one change); the Standard sequence with `reconcile-spec` and `reconcile-plan` unbracketed and proposal/reviews bracketed; durable outputs; user involvement; terminal outcome; note that a Quick thread that escalated joins this path at the specification stage and follows it in full; template pointer as above.
3. Create `docs/project/v3/workflows/roadmap.md`: purpose (direction and decomposition, then done — not a long-lived umbrella; no child status tracking or progress aggregation); the Roadmap sequence with `reconcile-roadmap` unbracketed, `review-roadmap` bracketed; the two artifacts (`roadmap.md` contract summary with `C<N>` briefs; eager `roadmap-feedback.md`); the descendant feedback loop in BOTH directions — the append side (only discoveries with parent- or sibling-level impact; narrow authority: append a record, never rewrite the roadmap, parent decisions, or sibling artifacts; works even after the parent is archived) and the consumption side (a future child's preflight reads its own seed and decisions, the parent `roadmap.md`, and relevant feedback records — never every sibling; mechanical adjustments incorporated; intent-changing adjustments asked interactively and recorded in the child's `decisions.md`; under AFK a pending-decision bundle is emitted and the operation stops; out-of-brief work is recommended as a new child thread, never silently created); materialization (idempotent; verbatim suggestion copies; `Materialized thread:` as factual evidence); a child may itself be opened from the Roadmap template when further decomposition is genuinely required, and parent–child cycles are never created; template pointer as above.
4. In all three: present `resolve-pending-decisions` as reactive infrastructure available whenever a pending-decision queue exists — not a stage in the sequence; make clear that unbracketed steps are the documented normal path, never mechanically enforced, and bracketed steps are suggested when useful.

**Files modified:** `docs/project/v3/workflows/quick.md` (NEW), `docs/project/v3/workflows/standard.md` (NEW), `docs/project/v3/workflows/roadmap.md` (NEW).

**Verification:**

```sh
for f in quick standard roadmap; do test -f docs/project/v3/workflows/$f.md; done
grep -n 'reconcile-spec' docs/project/v3/workflows/standard.md
grep -n 'reconcile-roadmap' docs/project/v3/workflows/roadmap.md
grep -n 'shared/references/workflows' docs/project/v3/workflows/*.md    # template pointers present
grep -c '## Suggested workflow' docs/project/v3/workflows/*.md          # expect 0 per file (no verbatim duplication)
grep -n 'escalat' docs/project/v3/workflows/quick.md docs/project/v3/workflows/standard.md
grep -rn 'roadmap-feedback' docs/project/v3/workflows/roadmap.md
```

**Acceptance criteria:**

- Each document presents its sequence with reconciliation unbracketed and reviews bracketed, plus purpose, optional activities, durable outputs, user involvement, and natural terminal outcome; `resolve-pending-decisions` appears as reactive infrastructure, not a stage (spec AC-11.4).
- Quick and Standard cover the escalation including the complete Standard tail (spec AC-11.4).
- The Roadmap document covers the feedback loop in both directions — append authority AND child preflight/consumption — and materialization (spec AC-8.5).
- Documents link to the canonical templates and do not duplicate the `## Suggested workflow` seed text verbatim (spec AC-11.4).
- No child status tracking, progress aggregation, or coordinator role anywhere (spec AC-8.4's documentation half); present tense, no `P<N>` citations, no cutover narration.

**Consumes:** the canonical templates (Task 23) as link targets; the skill inventory and contracts (Tasks 8–33) the sequences name.

**Produces:** the three workflow documents the root README's table links to (Task 37).

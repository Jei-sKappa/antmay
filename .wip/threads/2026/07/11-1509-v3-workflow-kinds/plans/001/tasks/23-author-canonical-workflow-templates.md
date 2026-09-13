# Task 23: Author the canonical workflow templates

**Objective:** Write the three canonical seed-ready `## Suggested workflow` templates under `shared/references/workflows/`.

**Input / context:** The cutover spec `specs/001/spec.md` § "Shared-reference sync tooling", § "Workflows" (the P43 sequences), and AC-13.1 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P43 (the three sequences; unbracketed = documented normal path, bracketed = suggested when useful; `resolve-pending-decisions` is reactive infrastructure, not a stage), P24 (format: human-readable numbered prose, optional steps explicitly labelled, no checkboxes/progress/lifecycle values; see P24's worked Quick example — the sequence starts AFTER thread opening, since the template is inserted into the seed of an already-open thread), P64 (canonical location). Spec Degrees of freedom #2 grants the exact wording, provided each template expresses its P43 sequence completely in P24's format. These files are passive reference material, not skills — no frontmatter.

**Steps:**

1. Create `shared/references/workflows/quick.md` containing a complete `## Suggested workflow` section expressing the Quick sequence: discussion *(optional)* → plan-brief *(optional)* → implement (which updates `implementation-report.md`) → review-implementation *(optional)* → review-code *(optional)* → finish → archive-thread *(optional)*. Numbered prose steps, one operation each; optional steps explicitly labelled (e.g. trailing `*(optional)*`).
2. Create `shared/references/workflows/standard.md` for the Standard sequence: discussion → proposal with its reconcile-proposal companion *(optional, as one group)* → spec → reconcile-spec → review-spec *(optional)* → plan-strict → reconcile-plan → implement-plan → review-implementation *(optional)* → review-code *(optional)* → finish → archive-thread *(optional)*.
3. Create `shared/references/workflows/roadmap.md` for the Roadmap sequence: discussion → proposal with reconcile-proposal *(optional, as one group)* → roadmap → reconcile-roadmap → review-roadmap *(optional)* → materialize-roadmap-threads → finish → archive-thread *(optional)*.
4. Keep each template self-contained and ready for verbatim insertion into a seed: no workflow-name headers required beyond the file itself, no progress markers, no repo-internal commentary; steps name user-invoked operations (never emitted artifacts as separate steps, and no `resolve-pending-decisions` stage).
5. Wording is yours (Degrees of freedom #2), but every unbracketed P43 step must appear as a normal step and every bracketed one as an explicitly optional step.

**Files modified:** `shared/references/workflows/quick.md` (NEW), `shared/references/workflows/standard.md` (NEW), `shared/references/workflows/roadmap.md` (NEW).

**Verification:**

```sh
for f in quick standard roadmap; do grep -l '^## Suggested workflow' shared/references/workflows/$f.md; done   # all three
grep -n 'optional' shared/references/workflows/quick.md      # optional labels present
grep -n 'reconcile-spec' shared/references/workflows/standard.md
grep -n 'materialize-roadmap-threads' shared/references/workflows/roadmap.md
grep -rn 'resolve-pending-decisions' shared/references/workflows/   # expect no hits (reactive infrastructure, not a stage)
grep -riwE 'tier|ledger' shared/references/ ; grep -ri '\.wip' shared/references/   # expect nothing
```

**Acceptance criteria:**

- `shared/references/workflows/quick.md`, `standard.md`, and `roadmap.md` exist, each containing a complete `## Suggested workflow` section expressing its P43 sequence in P24's format — numbered prose, optional steps explicitly labelled (spec AC-13.1).
- Steps list user-invoked operations only; reconciliation steps appear as normal (non-optional) steps in Standard and Roadmap; Quick contains no reconciliation step; no progress markers, checkboxes, or lifecycle values; no `resolve-pending-decisions` stage.
- The text is ready for verbatim seed insertion (a reviewer pasting a template under a seed title finds nothing that needs editing).

**Consumes:** none (the sequences come from the spec and P43; the skill names referenced must match the final inventory established by Tasks 8–22).

**Produces:** the canonical template sources that Task 24 mirrors into `open-thread` and `roadmap`, and the link target for Task 35's workflow documents.

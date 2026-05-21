---
phase: 01-foundations
reviewed: 2026-05-21T00:00:00Z
depth: deep
files_reviewed: 7
files_reviewed_list:
  - docs/workflow/v1/README.md
  - docs/workflow/v1/thread-layout.md
  - docs/workflow/v1/filename-grammar.md
  - docs/workflow/v1/immutability.md
  - .gitignore
  - .claude-plugin/marketplace.json
  - AGENTS.md
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-05-21
**Depth:** deep
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 1 is a content-only delivery: four reference docs under `docs/workflow/v1/`, a `.gitignore` rule, a JSON plugin entry, and an `AGENTS.md` pointer section. The structural shape is correct — JSON parses, the gitignore rule matches at the expected depths, decision IDs cite the right source decisions in the seed discussion log, and the cross-file links between the four reference docs all resolve.

The defects I found are documentation-correctness issues in the very files that will be most-quoted by future skills:

1. The canonical `README.md` index permanently bakes in planning-artifact phrasing ("Created by Plan 01", "Plan 02 of Phase 1 creates those files"). Because the same doc set declares itself immutable by convention, this leaks Phase 1 internal scaffolding into the V1 reader contract forever.
2. `thread-layout.md` attributes the recursive WIP gitignore rule to `[D107]` (V1 folder set). That rule is actually `D8` ("WIP Ignore Rule"). Decision-ID citations are the doc's traceability mechanism; getting one wrong undermines the audit trail it advertises.

The remaining items are minor (carat misalignment in a diagram, semantic phrasing tension between "review folder excluded" and "until a review actually lands", and a soft tension between "moved to processed/" and the immutability rule).

There are no security issues, no JSON-validity issues, no dead links, no missing-decision-ID issues, and no broken claims against the source decision log.

## Warnings

### WR-01: README.md leaks Phase-1 planning artifacts into the canonical V1 reader contract

**File:** `docs/workflow/v1/README.md:11-15`

**Issue:** The V1 entry-point doc contains three lines describing Phase 1 internal plan ordering:

```text
- [`thread-layout.md`](./thread-layout.md) — V1 thread root path and folder set (...). Created by Plan 01.
- [`filename-grammar.md`](./filename-grammar.md) — ... . Created by Plan 02.
- [`immutability.md`](./immutability.md) — ... . Created by Plan 02.

The links to `filename-grammar.md` and `immutability.md` are intentional forward references; Plan 02 of Phase 1 creates those files.
```

At write time this was a true note about future plan execution within the same phase. But Phase 1 has completed — all three target files exist (`git log` confirms commits `5c25cf0`, `89aa518`, `a82ba4c`, `cfe82ff`). The forward-reference disclaimer is now stale, and the "Created by Plan 01 / Plan 02" attributions name internal phase plans that mean nothing to the canonical V1 reader audience this README serves (future skill authors, future reviewers, future V2 designers).

Worse, `README.md` line 23 and `immutability.md` line 34 both declare the V1 reference docs themselves immutable by convention. Under that rule, this Phase-1 scaffolding never gets cleaned up — it ships as part of the V1 reader contract forever.

**Fix:** Replace the three "Created by Plan NN" attributions and the entire "intentional forward references" sentence (line 15) with version-neutral descriptions. Concretely:

```markdown
- [`thread-layout.md`](./thread-layout.md) — V1 thread root path and folder set (`proposals/`, `specs/`, `plans/`, `discussions/`, `inbox/{open,processed,dropped}/`, `.wip/`).
- [`filename-grammar.md`](./filename-grammar.md) — Record-form and versioned-form filename grammars, UTC stamp pattern, mandatory artifact-type suffix.
- [`immutability.md`](./immutability.md) — Emitted-artifact immutability rule, no source-relation frontmatter, ambiguous reference resolution by asking.
```

And delete line 15 entirely. This edit is the kind of correctness fix the immutability rule explicitly tolerates as a one-time post-emission cleanup (vs. semantic rule changes that warrant a V2). If the project owner reads immutability strictly, the alternative is to accept the artifact leakage as a known V1 quirk.

### WR-02: Wrong decision-ID citation for the recursive WIP gitignore rule

**File:** `docs/workflow/v1/thread-layout.md:46`

**Issue:** The bullet for `.wip/` reads:

```markdown
- `.wip/` — per-thread scratch and draft material; gitignored via the recursive `docs/threads/**/.wip/` rule and never emitted as a reviewable artifact [D107].
```

The recursive `docs/threads/**/.wip/` rule is decided in **D8** ("WIP Ignore Rule", `docs/threads/260520095223Z-agentic-workflow/discussions/260518200115Z-agentic-workflow-design-discussion.md:47-51`), not D107.

D107 only enumerates the V1 folder set (which *includes* `.wip/` as a folder). It does NOT define the gitignore rule itself. `REQUIREMENTS.md:14` correctly attributes the gitignore rule to D8 under `THRD-03`.

Because the file's `**Codifies:**` header at line 2 already lists `D7, D107` and not `D8`, this citation also implicitly broadens the file's stated decision-codification scope without acknowledgement.

**Fix:** Add D8 to both the header and the bullet:

```markdown
# V1 Thread Layout
**Codifies:** D7, D8, D107
```

```markdown
- `.wip/` — per-thread scratch and draft material; gitignored via the recursive `docs/threads/**/.wip/` rule and never emitted as a reviewable artifact [D8, D107].
```

The D107 citation can stay on the bullet because the `.wip/` folder's presence in the V1 set IS a D107 claim — but the gitignore-rule-shape claim belongs to D8.

## Info

### IN-01: Carat alignment diagram in filename-grammar.md is off by one

**File:** `docs/workflow/v1/filename-grammar.md:20-24`

**Issue:** The visual carat diagram intended to show field boundaries is misaligned:

```text
260518200115Z-agentic-workflow-design-discussion.md
^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^^^
UTC stamp    kebab description        artifact type
```

Counted by character position:

- UTC stamp is 13 chars (`260518200115Z`); the diagram shows 12 carats.
- Kebab description is 23 chars (`agentic-workflow-design`); the diagram shows 24 carats.
- Type token is 10 chars (`discussion`); the diagram shows 10 carats (correct).

The error is most visible at the `Z` of the UTC stamp — the trailing `Z` falls under the first hyphen-separator gap rather than under the last carat of the UTC group.

**Fix:** Add one carat to the first group, remove one from the second group:

```text
260518200115Z-agentic-workflow-design-discussion.md
^^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^^^
UTC stamp     kebab description       artifact type
```

(Also shift the labels one column to maintain alignment with the new carat groups.)

### IN-02: thread-layout.md says "until a spec, plan, or review actually lands" but D107 forbids a `reviews/` folder

**File:** `docs/workflow/v1/thread-layout.md:50`

**Issue:**

```markdown
A thread that only ever held a discussion (such as `docs/threads/260520095223Z-agentic-workflow/`) will contain `discussions/` and nothing else until a spec, plan, or review actually lands.
```

Two paragraphs later, lines 56-57 explicitly reject `reviews/` and `verifications/` folders — review-findings go to `inbox/open/` instead. So "a review actually lands" is misleading: a review never adds a `reviews/` folder to a thread; the routing convention sends review findings to `inbox/open/` and interactive review decision-logs to `discussions/`.

A careful reader could conclude that a `reviews/` folder might be auto-created, contradicting D107 and the explicit excluded-folder section.

**Fix:** Replace "review" with one of the actually-routable types, e.g.:

```markdown
A thread that only ever held a discussion (such as `docs/threads/260520095223Z-agentic-workflow/`) will contain `discussions/` and nothing else until a proposal, spec, plan, or inbox item actually lands.
```

### IN-03: Soft tension between "inbox items are moved to processed/" and emitted-artifact immutability

**File:** `docs/workflow/v1/thread-layout.md:44` and `docs/workflow/v1/filename-grammar.md:89`

**Issue:**

```markdown
- `inbox/processed/` — inbox items moved here after they have been addressed; status is reflected by folder, not by frontmatter.
```

```markdown
| `inbox-item` | `inbox/open/` (later moved to `processed/` or `dropped/`)  | `260521094500Z-onboarding-friction-inbox-item.md` |
```

Both claim that emitted inbox items are *moved* between folders. Under the strictest reading of `immutability.md:6` ("Once a [...] record artifact has been written to its target folder under `docs/threads/<thread>/<folder>/`, it is NEVER edited"), changing the file's location IS a form of edit — its canonical reviewable path changes, and any earlier reference to `inbox/open/<filename>` becomes a dangling reference.

Per the source decision log this is intentional design (status-by-folder over status-by-frontmatter), but immutability.md never names "moved" as an exception alongside "edited." A reader who only consults immutability.md gets no guidance on whether moves are allowed.

**Fix:** Add one sentence to `immutability.md` clarifying that folder-location changes for state-by-folder artifact buckets (specifically `inbox/{open,processed,dropped}/`) are explicitly allowed and do not count as edits. Example, appended to the "Emitted Artifacts Are Immutable" section:

```markdown
The one exception is location-as-state: inbox items move between `inbox/open/`, `inbox/processed/`, and `inbox/dropped/` to reflect triage status (see [`./thread-layout.md`](./thread-layout.md)). The filename itself does not change; only the parent folder does. This is not considered an edit.
```

### IN-04: Pointer-section "no duplication" claim in AGENTS.md is contradicted by the GSD-managed `## Project` block in the same file

**File:** `AGENTS.md:80` (claim) vs. `AGENTS.md:97-99` (duplication)

**Issue:** The `## V1 Workflow Conventions` section ends with:

```markdown
This section is a POINTER — it intentionally does NOT duplicate the rules. Edit the canonical docs under `docs/workflow/v1/` for any rule change; this section only changes if the V1 reference doc set itself moves or splits.
```

But the GSD-managed `## Project` block lower in the same file already restates the rules as constraints (lines 97-99):

```markdown
- **Artifact storage**: All workflow artifacts live under `docs/threads/<thread>/` per the V1 folder set; nothing else writes there (D7, D107).
- **Filename grammar**: All artifacts UTC-prefixed `YYMMDDHHMMSSZ`; artifact type suffix mandatory; versioned artifacts use target-version semantics (D11, D42, D43, D47, D46).
- **Immutability**: Emitted artifacts are not edited — new versions or new records only (D39, D40, D41).
```

These bullets duplicate exactly what the pointer section says it does NOT duplicate. The pointer's discipline boundary (only this section changes if the rules change) does not in fact hold — a reader who edits a canonical doc and forgets the constraint block in `## Project` ends up with two AGENTS.md statements drifting apart.

This is a pre-existing condition (the `## Project` block came from `.planning/PROJECT.md` via GSD generation, not from Phase 1), but the new pointer section now asserts a property the larger file does not satisfy.

**Fix:** Either (a) tone down the pointer claim to acknowledge the GSD-generated block ("This section is a pointer; the GSD-managed `## Project` block below restates the same rules as constraints and stays in sync via PROJECT.md regeneration"), or (b) propose dropping the V1-specific constraint bullets from the project-constraint regeneration source so this section is genuinely the only place the rules live. Option (a) is the lowest-risk fix and respects the existing GSD generation pipeline.

### IN-05: Reused timestamp `260520120000Z` across three versioned-form examples is plausible-but-confusing

**File:** `docs/workflow/v1/filename-grammar.md:46-48`

**Issue:**

```text
260520120000Z-v1-auth-spec.md                 (mainline v1)
260520120000Z-v2-auth-spec.md                 (mainline v2)
260520120000Z-v2-no-oauth-auth-spec.md        (v2 variant with descriptor)
```

All three share the timestamp `260520120000Z`. But the same doc at line 10 says: "The stamp is captured at artifact creation time and never edited afterward." Three artifacts cannot all be created at the same instant in normal workflow use, so the implication of these examples is "ignore the timestamp; it's just a placeholder" — which is never stated. A strict reader who applies the line-10 rule to these examples could get confused.

A similar (less severe) issue appears between lines 32 and 89, where the inbox-item example shares timestamp `260521094500Z` but uses two different descriptions (`onboarding` vs `onboarding-friction`).

**Fix:** Vary the timestamps across the three v1/v2/v2-no-oauth examples by at least one second to honor the line-10 rule, or add a one-line note above the block: "Timestamps are illustrative; in real use each filename carries the UTC instant of that specific artifact's creation."

---

## Out-of-Scope Observations

These were noted during review but are not findings — they fall under the explicit Phase 1 scope guardrails in the prompt context note:

- The `JeisKappa-workflow` plugin in `.claude-plugin/marketplace.json` is correctly added with an empty `skills: []` array, per the Phase 1 plan. No V1 spine skills are authored yet — that work belongs to later phases.
- `.vscode/settings.json` is correctly NOT modified (per `01-CONTEXT.md`: "entries land when each new skill folder ships").
- The existing thread `docs/threads/260520095223Z-agentic-workflow/` correctly contains only `discussions/` because no other artifacts have landed there yet — matches the doc's on-demand-creation rule.
- The JSON file parses cleanly (`node -e "JSON.parse(fs.readFileSync(...))"` succeeds; structure is two plugins, each with `name`, `source`, `skills`).
- The gitignore rule was verified empirically against real `git check-ignore` to match at three depths (`docs/threads/.wip/`, `docs/threads/X/.wip/`, `docs/threads/X/Y/.wip/`) — no over-match into non-`.wip` paths.
- The CLAUDE.md → AGENTS.md symlink is intact, so the pointer section is visible to harnesses that read either file.

---

_Reviewed: 2026-05-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_

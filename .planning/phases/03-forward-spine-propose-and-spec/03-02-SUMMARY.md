---
phase: 03-forward-spine-propose-and-spec
plan: 02
status: complete
subsystem: forward-spine
tags: [spec, v1-workflow, spine, versioned-artifact, anti-sycophancy, d50-semantic-contract]
requirements:
  - SPEC-01
  - SPEC-02
  - SPEC-03
  - SPEC-04
  - SPEC-05
dependency_graph:
  requires:
    - "Phase 1 canonical docs: docs/workflow/v1/{README,thread-layout,filename-grammar,immutability}.md"
    - "Phase 2 pattern source: skills/discussion/SKILL.md (canonical anti-sycophancy stance)"
    - "Phase 3 Plan 01 sibling: skills/propose-auto/SKILL.md + skills/propose-interactive/SKILL.md (paired-skill emission pattern source)"
    - "Existing skills/derive-spec/SKILL.md (directionality reference; untouched)"
  provides:
    - "skills/spec-auto/SKILL.md — V1 spine forward spec generator (autonomous, 4 input forms)"
    - "skills/spec-interactive/SKILL.md — V1 spine forward spec author (interactive, 8-element walk, anti-sycophancy heightened)"
    - "README.md SPEC-04 forward-vs-reverse clarifier — inline in each spec entry, points reverse-engineering use cases at derive-spec"
    - "Forward spine complete: a V1 user can drive `propose → spec` entirely with V1 spine skills"
  affects:
    - "Phase 4 plan-* family can chain off specs as input (`propose → spec → plan`)"
    - "Phase 5 implementation skills can chain off specs"
    - "Phase 6 review-spec-* skills will land later and accept these v1 spec artifacts as input"
    - "Phase 7 README hybrid will replace the simple Available skills list, but the forward-vs-reverse split landed by this plan is durable language Phase 7 can reuse"
tech_stack:
  added: []
  patterns:
    - "Versioned-form forward generator pair (v1 first emission, NO descriptor, target-version semantics)"
    - "Handoff-grade semantic contract (8 D50 elements; no mandatory Decisions heading per D52; decisions inlined and cited by path + D<N> per SPEC-05)"
    - "Immutability-required for emitted versioned artifacts (revisions = new mainline integer; never edit v1 in place)"
    - "4 accepted input forms (proposal artifact path, decision-log artifact path, GitHub issue URL/id, raw prompt) with D49-style ambiguous-reference resolution"
    - "Forward-vs-reverse directionality clarifier (skill body level + README level) — co-exists cleanly with the established reverse-engineering derive-spec skill"
key_files:
  created:
    - skills/spec-auto/SKILL.md
    - skills/spec-interactive/SKILL.md
  modified:
    - .claude-plugin/marketplace.json
    - .vscode/settings.json
    - README.md
decisions:
  - id: SKILL-LEVEL-DIRECTIONALITY-CLARIFIER
    decision: "Both spec-auto and spec-interactive carry an opening directionality clarifier paragraph that points reverse-engineering use cases at derive-spec; the clarifier is also present in the description sentence visible to the harness/install snippet"
    rationale: "SPEC-04 requires the forward/reverse split to be loud at every install-time touchpoint; placing it in the skill body's opening paragraph AND the description ensures a user searching by trigger description and a user reading the skill body both encounter it"
  - id: README-OPTION-A-INLINE-CLARIFIER
    decision: "Used Option A (inline directionality clarifier inside each spec-* README entry description paragraph) rather than Option B (separate blockquote/bullet block between entries)"
    rationale: "Option A is denser and matches the established voice of existing README entries (one description paragraph per skill); the inline phrase 'Forward-design only — for reverse-engineering a spec FROM an existing codebase use derive-spec instead' appears in BOTH spec-* entries so any reader landing on either entry sees the directional split without scrolling to a separate clarifier block; total line gap between propose-interactive entry and spec-auto entry is 8 lines (well under the 20-line CONTEXT bound)"
  - id: ANTI-SYCOPHANCY-HEIGHTENED-LANGUAGE
    decision: "spec-interactive's anti-sycophancy stance includes a heightened framing line explicitly stating that bad design calls in the spec become expensive in implementation because the spec is downstream-consumed by a future executor who will not have the conversation to ask follow-ups"
    rationale: "Per CONTEXT.md 'Skill body voice and structure' — the mantra is heightened for spec-interactive because the spec is the artifact the implementation phase consumes; preserving all four marker phrases from discussion/SKILL.md verbatim while adapting the prefatory framing reflects the source skill's discipline AND the higher cost of unflagged bad design at this stage"
  - id: REFUSE-TO-LOG-DUAL-CASE-MIRROR
    decision: "spec-interactive includes both a capital-R bullet 'Refuse to log a spec element you believe is wrong without flagging it' and a lowercase 'refuse to log it silently' sentence (mirroring discussion/SKILL.md lines 25 + 73 and propose-interactive/SKILL.md)"
    rationale: "Source discussion skill carries both forms; preserving both keeps the discipline parallel across discussion, propose-interactive, and spec-interactive — the case-sensitive grep gate in the plan's acceptance criteria covers the lowercase form, and the dual-case mirror is now an established pattern for V1 interactive forward-spine skills"
  - id: D93-NO-AUTO-DECISION-LOG-DEFAULT
    decision: "spec-interactive's Decision Log section states the default is NO decision log; one is only emitted when durable trade-offs or rejected alternatives emerge that cannot be captured in the spec body itself (e.g., a major design alternative rejected with rationale that downstream readers will need independent of the spec)"
    rationale: "Per D93 — artifact-producing interactive skills do not auto-write a separate decision log; most authoring is captured in the spec body's Unresolved questions and inlined-decision citations; warrant-based escape valve preserved (ask the user when in doubt)"
  - id: V1-FIRST-EMISSION-NO-DESCRIPTOR-DEFAULT
    decision: "Both spec-* skills default first emission to NO kebab-descriptor — the canonical first-version mainline filename is <UTC>-v1-spec.md (not <UTC>-v1-<desc>-spec.md); descriptors are reserved for parallel candidate variants of the same target version"
    rationale: "Per filename-grammar.md target-version semantics — the mainline integer-only file is the canonical promoted form; adding a descriptor on first emission would imply this artifact is a candidate variant rather than the mainline v1; defaulting to no descriptor keeps the filename clean and reserves descriptor syntax for its intended use (parallel drafts)"
  - id: README-AVAILABLE-SKILLS-PLACEMENT-AFTER-PROPOSE-INTERACTIVE
    decision: "Both spec entries land AFTER propose-interactive (the last Plan 03-01 entry) and BEFORE the Retired skills subsection — preserving the chronological order of skill additions within the Available skills list and keeping the directional pair (propose-auto + propose-interactive + spec-auto + spec-interactive) visually adjacent"
    rationale: "The Phase 7 README hybrid will replace the simple Available skills list with a layered map; until then, chronological-by-introduction placement avoids the optimization-trap of trying to reshape the list ahead of Phase 7"
metrics:
  duration: 6min
  completed: 2026-05-21
  tasks_completed: 3
  files_changed: 5
  commits: 3
patterns_established: |
  Paired-skill V1 spine emission for FORWARD VERSIONED-ARTIFACT generators (spec, plan, future ports): one auto skill (pure input → versioned v1 artifact, no clarifying questions, no anti-sycophancy section) plus one interactive sibling (collaborative element-by-element walk, anti-sycophancy carried verbatim from discussion/SKILL.md with the 4 marker phrases preserved, anti-sycophancy framing optionally heightened when the artifact is downstream-consumed by a costly phase, D93 no-auto-decision-log default, capture-inbox referenced for scope drift). Both skills accept 4 input forms (proposal artifact path, decision-log artifact path, GitHub issue URL/id, raw prompt) with D49-style ambiguous-reference resolution. Both skills emit the same single artifact-type under the same target folder using the V1 VERSIONED-FORM filename grammar with mandatory artifact-type suffix — first emission defaults to NO kebab-descriptor (mainline integer-only `<UTC>-v1-<type>.md`); descriptors are reserved for parallel candidate variants of the same target version. Both skills enforce immutability after emission (revisions emit a new mainline integer). Both skills cite all three Phase 1 canonical docs by absolute path. Both skills NEVER auto-commit. Both skill bodies carry an opening directionality clarifier when a sibling skill in the existing repo covers the inverse direction (in this plan, derive-spec was the inverse-direction sibling — the clarifier names it explicitly so the reader does not confuse forward-design with reverse-engineering). Registration follows the 4-touchpoint rule (skill folder + marketplace.json under JeisKappa-workflow + .vscode scopes + README Available skills entry) — three of those touchpoints land in a single registration commit, the skill bodies in two prior per-skill commits, totaling 3 atomic commits per plan. README directionality clarifier defaults to Option A (inline in each entry's description paragraph) — denser and matches the established voice of existing entries; Option B (separate blockquote/bullet block between entries) remains acceptable when the clarifier needs to be reused by more than two entries. Plan 03-02 confirmed this pattern applies to Plan 4 (plan-* family under plans/) — same target-version semantics, same 4 input forms, same anti-sycophancy stance carry, same registration shape.
---

# Phase 3 Plan 02: Spec-* Family (Forward Spine — Downstream Half) Summary

Two new V1 spine skills shipped — `spec-auto` (autonomous handoff-grade spec generator from proposal/decision-log/issue/prompt) and `spec-interactive` (collaborative eight-element walk-through with heightened anti-sycophancy) — plus the three shared registration touchpoints (marketplace.json, .vscode/settings.json, README.md) AND a short SPEC-04 forward-vs-reverse clarifier inlined into both spec-* README entries that distinguishes the new forward-design `spec-*` skills from the existing reverse-engineering `derive-spec` skill. After this plan, the V1 forward spine is complete: a user can drive "rough idea → freeform proposal → handoff-grade spec" entirely with V1 spine skills.

## What Was Built

### `skills/spec-auto/SKILL.md` (new, 100 lines)

Autonomous forward-design generator: reads ONE of {proposal artifact path, decision-log artifact path, GitHub issue URL/id, raw prompt}, resolves the active V1 thread per `docs/workflow/v1/thread-layout.md`, defaults first emission to NO kebab-descriptor (canonical `<UTC>-v1-spec.md`), captures a 12-character UTC stamp at write time per `docs/workflow/v1/filename-grammar.md`, drafts the spec body covering all eight D50 semantic-contract elements (intended outcome, context, scope/non-scope, expected behavior, constraints, explicit decisions, unresolved questions, acceptance guidance), inlines settled decisions where operative (NOT in a separate Decisions section per D52), cites source decision logs by absolute path + `D<N>` per SPEC-05, writes `docs/threads/<thread>/specs/<UTC>-v1-spec.md` (spec artifact-type suffix mandatory), and confirms with the artifact path. No clarifying questions. Never auto-commits. No Anti-Sycophancy section (the interactive sibling owns that discipline — auto skills are pure generators with no decision-influencing interaction).

Opening directionality clarifier paragraph names `derive-spec` explicitly as the reverse-engineering sibling for codebase-to-spec use cases, satisfying SPEC-04 at the skill body level.

Sections: top heading, opening directionality clarifier, `## Inputs` (4 forms + D49 ambiguous-reference resolution), `## Semantic Contract` (8 D50 elements), `## Workflow` (8 numbered steps), `## Filename and Folder`, `## Immutability`, `## Commit Policy`.

### `skills/spec-interactive/SKILL.md` (new, 145 lines)

Collaborative forward-design author: same thread-resolution, input-resolution, filename-grammar, and immutability rules as `spec-auto`, but walks the user through the eight D50 semantic-contract elements one at a time (with the 8-section skeleton presented up front so the user knows the destination shape), accepts freeform answers per element, pushes back per the carried-over anti-sycophancy stance, then assembles the body and writes the artifact. Anti-Sycophancy Stance section reproduces the 8-bullet structure from `skills/discussion/SKILL.md` with the prefatory paragraph adapted for spec authoring AND a heightened framing line stating that bad design calls in the spec become expensive in implementation (the spec is downstream-consumed by a future executor who will not have the conversation to ask follow-ups).

All 4 anti-sycophancy marker phrases preserved verbatim:

| Marker phrase                  | grep count in spec-interactive |
| ------------------------------ | ------------------------------ |
| `make them feel good`          | 1                              |
| `Disagree when you disagree`   | 1                              |
| `pushback as correctness`      | 1                              |
| `refuse to log`                | 2 (capital-R bullet + lowercase sentence) |

D93 compliance: a separate decision log is NOT auto-written — it only emerges when durable trade-offs or rejected alternatives surface during the walk that cannot reasonably live in the spec body itself (e.g., a major design alternative the user considered and rejected with rationale that downstream readers will need to understand independent of the spec). When a log IS warranted, the spec body cites it by absolute path + `D<N>` rather than copying decision text.

Scope drift section references `capture-inbox` for parking off-topic branches (preferred), splitting into a new spec or discussion thread (when warranted), or deferring.

Opening directionality clarifier paragraph names `derive-spec` explicitly as the reverse-engineering sibling for codebase-to-spec use cases, satisfying SPEC-04 at the skill body level.

Sections: top heading, opening directionality clarifier, `## Anti-Sycophancy Stance`, `## Inputs` (4 forms + D49 ambiguous-reference resolution), `## Semantic Contract` (8 D50 elements), `## Workflow` (8 numbered steps), `## Decision Log` (D93), `## Scope Drift` (capture-inbox reference), `## Filename and Folder`, `## Immutability`, `## Commit Policy`.

### Registration touchpoints (modified)

| File                              | Before | After | Change                                                                              |
| --------------------------------- | ------ | ----- | ----------------------------------------------------------------------------------- |
| `.claude-plugin/marketplace.json` | 5      | 7     | JeisKappa-workflow.skills gains spec-auto + spec-interactive (alphabetical)         |
| `.vscode/settings.json` (scopes)  | 13     | 15    | conventionalCommits.scopes gains both scopes (alphabetical)                         |
| `README.md` (Available skills)    | 13     | 15    | Two new entries appended after propose-interactive, before Retired skills           |

JeisKappa-skills plugin remains at 8 entries (`derive-spec` stays under it per CONTEXT.md decision). README's `## Retired skills` subsection with the `discussion-loop` bullet is preserved.

## D50 Semantic-Contract Coverage (SPEC-03)

Both `spec-auto` and `spec-interactive` cover all 8 D50 elements in their bodies. Confirmed via case-insensitive grep against each file:

| Element                | spec-auto | spec-interactive |
| ---------------------- | --------- | ---------------- |
| intended outcome       | present   | present          |
| context                | present   | present          |
| scope / non-scope      | present   | present          |
| expected behavior      | present   | present          |
| constraints            | present   | present          |
| explicit decisions     | present   | present          |
| unresolved questions   | present   | present          |
| acceptance guidance    | present   | present          |

Per D52, neither skill mandates a `## Decisions` section heading — settled decisions are inlined into the body where operative (scope notes, constraint statements, expected-behavior caveats, acceptance preconditions), with citations to source decision logs by absolute path + `D<N>` per SPEC-05.

## Anti-Sycophancy Preservation (SPEC-02)

Confirmed via case-sensitive grep against `skills/spec-interactive/SKILL.md`. All four marker phrases from the canonical `skills/discussion/SKILL.md` source appear verbatim (one is intentionally doubled — the capital-R `Refuse to log…` bullet + a lowercase `refuse to log it silently` reinforcement sentence, mirroring `discussion/SKILL.md` lines 25 + 73 and `propose-interactive/SKILL.md`).

`spec-auto`, by contrast, contains zero matches for `Anti-Sycophancy` — the discipline belongs to the interactive variant only (auto skills do not influence design decisions and so do not need the stance).

## SPEC-04 Forward-vs-Reverse Clarifier

The README clarifier was implemented in **Option A** form (inline in each spec-* entry's description paragraph) rather than Option B (separate blockquote/bullet block).

The inline phrase `Forward-design only — for reverse-engineering a spec FROM an existing codebase use [derive-spec](./skills/derive-spec/SKILL.md) instead.` appears in BOTH the `spec-auto` and `spec-interactive` README entries. Either entry alone is sufficient to communicate the split — a reader landing on either entry encounters the directional clarifier without needing to scroll to a separate block.

Total line gap between the `propose-interactive` entry header and the `spec-auto` entry header in README.md: **8 lines** (well under the CONTEXT.md ≤ 20-line bound).

The SPEC-04 clarifier ALSO appears at the skill-body level in both spec-* skills' opening paragraphs — so a user invoking either skill via its trigger description also encounters the forward-vs-reverse split before reading the workflow.

## derive-spec Untouched

`skills/derive-spec/SKILL.md` was NOT modified by this plan. Verified post-commit:

```
$ git diff --stat HEAD skills/derive-spec/SKILL.md
(no output)
```

The derive-spec skill remains the established reverse-engineering tool for codebase-to-spec extraction; the new `spec-*` skills cover the inverse direction (proposal/discussion/issue/prompt → spec) without overlapping.

## Phase 3 Status

**Phase 3 is COMPLETE after this plan.** The V1 forward spine — `propose-* → spec-*` — is fully shipped:

- Phase 3 Plan 01 (propose-*): `rough idea → freeform proposal artifact` at `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`
- Phase 3 Plan 02 (spec-*): `proposal/discussion/issue/prompt → handoff-grade spec artifact` at `docs/threads/<thread>/specs/<UTC>-v1-spec.md`

Downstream phases can now accept these artifacts as input:

- Phase 4 (Plan Family) — plan-* skills will chain off specs (`propose → spec → plan`)
- Phase 5 (Implementation Family) — implement-* skills will consume spec artifacts
- Phase 6 (Review Family) — review-spec-* will land later and accept v1 spec artifacts
- Phase 7 (Merge / Finish / Navigation / Distribution Surface) — will own the README hybrid that replaces the simple Available skills list

## Deviations from Plan

None. All three tasks executed exactly as written. No architectural deviations. No auth gates. No checkpoints. No `[Rule N]` auto-fixes needed — the per-task acceptance gates passed on first write for both skill files and the registration commit. The bash `[: too many arguments` error encountered while running the canonical `<automated>` block inline as a one-liner was a shell quoting artifact (bash word-splitting on the literal `{1,5}` range inside a `$()` interpolation in `[ ]`); the same regex worked when the script was written to a file and executed via `bash /tmp/spec-auto-gate.sh`. The skill body content was already passing the underlying grep.

## Self-Check: PASSED

Verified post-write and post-commit:

| Claim                                          | Verification                                                          | Result |
| ---------------------------------------------- | --------------------------------------------------------------------- | ------ |
| `skills/spec-auto/SKILL.md` exists             | `test -f skills/spec-auto/SKILL.md`                                   | FOUND  |
| `skills/spec-interactive/SKILL.md` exists      | `test -f skills/spec-interactive/SKILL.md`                            | FOUND  |
| Commit `8e77c05` exists                        | `git log --oneline -5 \| grep 8e77c05`                                | FOUND  |
| Commit `68795d1` exists                        | `git log --oneline -5 \| grep 68795d1`                                | FOUND  |
| Commit `ae3b961` exists                        | `git log --oneline -5 \| grep ae3b961`                                | FOUND  |
| marketplace.json JeisKappa-workflow == 7       | `jq '... \| length'` returns 7                                        | OK     |
| marketplace.json JeisKappa-skills == 8         | `jq '... \| length'` returns 8 (unchanged)                            | OK     |
| .vscode scopes == 15, alphabetical             | `jq '. \| length'` + diff against sorted                              | OK     |
| README has spec-auto + spec-interactive        | `grep -c '^### \[\`spec-(auto\|interactive)\`\]'` returns 2 total      | OK     |
| README Retired skills subsection intact        | `grep -c '^## Retired skills$'` returns 1; discussion-loop preserved   | OK     |
| All 4 anti-syco markers in spec-interactive    | grep each marker (one doubled for capital + lowercase reinforcement)   | OK     |
| Zero anti-syco mentions in spec-auto           | `grep -i 'Anti-Sycophancy' skills/spec-auto/SKILL.md` returns 0        | OK     |
| All 3 Phase 1 docs cited in both skills        | grep each absolute path                                                | OK     |
| All 8 D50 elements covered in both skills      | grep each element name (case-insensitive)                              | OK     |
| Versioned filename `v1-spec.md` example in both | `grep -oE '[0-9]{12}Z-v1(-[a-z0-9-]+)?-spec\.md'` returns ≥ 1          | OK     |
| derive-spec cited in both skill bodies         | `grep -c 'derive-spec'` returns ≥ 1                                    | OK     |
| README SPEC-04 clarifier between propose-interactive and spec-interactive | `awk` slice + `grep -c derive-spec` returns ≥ 1 | OK     |
| derive-spec/SKILL.md untouched                 | `git diff --stat HEAD skills/derive-spec/SKILL.md`                     | EMPTY  |

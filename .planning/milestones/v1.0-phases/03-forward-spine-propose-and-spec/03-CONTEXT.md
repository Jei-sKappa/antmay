# Phase 3: Forward Spine — Propose & Spec - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning
**Mode:** Auto (smart-discuss batched — 4 new user-facing skills with substantive decisions)

<domain>
## Phase Boundary

Ship the upstream half of the V1 spine: `propose-auto`/`propose-interactive` turn a rough prompt into a freeform proposal artifact under `proposals/`; `spec-auto`/`spec-interactive` turn a proposal / discussion / issue / prompt into a handoff-grade implementation spec artifact under `specs/`. After Phase 3 a V1 user can drive a feature from "rough idea" → "freeform proposal" → "handoff-grade spec" entirely with V1 spine skills, and the existing reverse-engineering `derive-spec` skill is documented as a separate, non-overlapping concern.

**In scope (Phase 3):**
- `skills/propose-auto/SKILL.md` — NEW [PROP-01, PROP-03]
- `skills/propose-interactive/SKILL.md` — NEW [PROP-02, PROP-03]
- `skills/spec-auto/SKILL.md` — NEW [SPEC-01, SPEC-03, SPEC-04, SPEC-05]
- `skills/spec-interactive/SKILL.md` — NEW [SPEC-02, SPEC-03, SPEC-04, SPEC-05]
- `.claude-plugin/marketplace.json` — gains 4 entries under `JeisKappa-workflow`; `derive-spec` stays under `JeisKappa-skills` (untouched)
- `.vscode/settings.json` — gains 4 new scopes (`propose-auto`, `propose-interactive`, `spec-auto`, `spec-interactive`); alphabetically sorted
- `README.md` — gains 4 new entries under "Available skills"; a SHORT clarifying note (1–2 sentences inside the spec entries or a 2-bullet "Forward vs reverse" subsection) documents the propose/spec → derive-spec separation per SPEC-04

**Out of scope (Phase 3):**
- Plan family (Phase 4)
- Implementation family (Phase 5)
- Review family (Phase 6) — including evolving `review-decision-document` into `review-spec-*`
- Merge / Finish / Navigation / Distribution surface (Phase 7) — including the full README hybrid
- Any change to `skills/derive-spec/SKILL.md` body — derive-spec stays as-is
- Native adversarial review skill — out of scope V1 [D88], use `the-fool`

</domain>

<decisions>
## Implementation Decisions

### Proposal artifact format [D36, D37, PROP-03]
- **Freeform markdown.** No template enforcement. The skills' bodies SUGGEST a 4-element structure (intent / context / rough shape / open questions) explicitly framed as "suggested — adapt as needed", citing D36 + D37 verbatim from the source decision log.
- **Filename grammar:** Record form `<UTC>-<kebab-desc>-proposal.md`. `proposal` is the canonical artifact-type token per Phase 1's `docs/workflow/v1/filename-grammar.md`.
- **Output folder:** `docs/threads/<thread>/proposals/`. The thread-layout doc already names this folder; the skill instructs the agent to use the active thread or follow the standard D18 thread-resolution rule (ask the user OR auto-create when context is obvious).
- **Slug source:** `propose-auto` derives the slug from the user's prompt; `propose-interactive` asks for it (or proposes one for confirmation).

### propose-auto vs propose-interactive [D35, PROP-01, PROP-02]
- **propose-auto:** Pure generator. Reads input (raw prompt, or a referenced artifact), writes the proposal artifact end-to-end with no clarifying questions. Suitable for "I know what I want, just write it down" flows. NO automatic commit (D62 applies — propose skills never auto-commit, but Phase 3 has no D62 application beyond skill body language stating this).
- **propose-interactive:** Walks the user through the four suggested elements (intent / context / rough shape / open questions) one at a time, accepting freeform answers and assembling the proposal. Per D93, the interactive variant ONLY writes a separate decision log if the conversation produces durable trade-offs / rejected alternatives — NOT for routine authoring input.
- Both skills' frontmatter `description:` explicitly states the interaction mode in a "Use when…" trigger.

### Spec semantic contract [D50, SPEC-03]
- **Handoff-grade requirement:** Both spec skills produce artifacts that satisfy D50's 8-element semantic contract, readable as a spec by someone with no prior context. Required content elements (NOT mandatory section headings):
  1. Intended outcome — what this spec, when implemented, produces for the user
  2. Context — why this is being built, what came before
  3. Scope / non-scope — boundary statement, including what's explicitly out
  4. Expected behavior — the observable behaviors a future executor needs
  5. Constraints — tech / repo / harness / safety constraints
  6. Explicit decisions — any settled trade-offs (with citations to source decision logs by path + D<N> per D52)
  7. Unresolved questions — open issues that don't block emission
  8. Acceptance guidance — how a reviewer will know the implementation is right
- **Section headings:** The skill body offers a suggested 8-section heading template a user can copy-paste, but per D52, no dedicated "Decisions" section is mandatory — settled decisions are inlined into the body where they're operative (scope, constraints, expected behavior, acceptance).

### Spec input forms [SPEC-01, SPEC-02]
- Accept ANY of: a proposal artifact path (`docs/threads/<thread>/proposals/...`), a decision-log artifact path (`docs/threads/<thread>/discussions/...`), a GitHub issue URL/identifier, or a raw prompt. Skill body documents how to resolve each input form and lists explicit fallback behavior when the input is ambiguous (ask the user — per D49).
- For decision-log input, the skill body REFERENCES source D<N> decisions by path + ID rather than copying decision text into a separate spec section (per D52).

### Spec output [SPEC-01, SPEC-02, SPEC-03]
- **Filename grammar:** Versioned form `<UTC>-v<N>[-<kebab-descriptor>]-spec.md` per Phase 1's `docs/workflow/v1/filename-grammar.md`. First emission is `v1`, no descriptor. Subsequent revisions (V1.x) are NOT part of spec immutability per D39 — they emit a NEW version (v2 etc.), not edit the v1 file.
- **Output folder:** `docs/threads/<thread>/specs/`.
- **Immutability [D39, SPEC-03 implied]:** Skill body explicitly states emitted specs are immutable; in-session drafts (kept under `.wip/` or in agent scratch) remain editable until emission. After emission, the only way to revise is a new version artifact.

### spec-auto vs spec-interactive [D38, SPEC-01, SPEC-02]
- **spec-auto:** Pure generator. Reads input artifact, produces v1 spec, end-to-end. Suitable for "the proposal is solid, write the spec from it" flows.
- **spec-interactive:** Walks the user through the 8 semantic-contract elements one at a time, accepting answers and assembling the spec body. Per D93, the interactive variant does NOT auto-write a decision log; it only writes one if durable trade-offs / rejected alternatives emerge during authoring that cannot be captured in the spec itself.
- Both skills' frontmatter `description:` explicitly states the interaction mode.

### derive-spec coexistence [SPEC-04]
- `derive-spec` (existing, untouched) reverse-engineers a spec from an existing codebase.
- `spec-*` (new, this phase) forward-designs a spec from a proposal/discussion/issue/prompt.
- **README change (minimal):** Two short bullets — "Forward design: use `spec-auto`/`spec-interactive` — produces a spec FROM a proposal, discussion, issue, or prompt" and "Reverse-engineer from codebase: use `derive-spec` — produces a spec FROM an existing implementation". OR each skill's description in README explicitly states its directionality. Either form satisfies SPEC-04.

### Skill body voice and structure
- **Voice:** Match the existing repo voice (CONVENTIONS.md). Dense, declarative, action-first, no preamble. Match the structural pattern of `skills/discussion/SKILL.md` and `skills/seeded-discussion/SKILL.md` from Phase 2 (anti-sycophancy stance for spec-interactive — the user makes design calls and the skill must push back when needed).
- **Anti-sycophancy stance:** Both interactive skills (`propose-interactive`, `spec-interactive`) MUST carry the V1 anti-sycophancy stance from Phase 2's `discussion/SKILL.md` (the 4 marker phrases: "disagree when you disagree", "refuse to log", "pushback as correctness", "make them feel good"). Spec-interactive especially — bad design decisions in the spec become expensive in the implementation phase.
- **Citations:** Each skill body cites Phase 1's canonical docs by absolute path on first invocation (`docs/workflow/v1/filename-grammar.md`, `docs/workflow/v1/thread-layout.md`, `docs/workflow/v1/immutability.md`).
- **Frontmatter:** Standard V1 form — `name` (kebab-case matching folder), `description` (one sentence with explicit "Use when…" + mode), `metadata.author: https://github.com/Jei-sKappa`, `metadata.version: 1.0.0`.

### Plan grouping
- **3-plan proposal:**
  - Plan 03-01 — `propose-auto` + `propose-interactive` (both skills + their 4 shared registration touchpoints: marketplace, scopes, README × 2 entries)
  - Plan 03-02 — `spec-auto` + `spec-interactive` (both skills + their 4 shared registration touchpoints)
  - Plan 03-03 — README "Forward vs reverse" clarifier (SPEC-04 — small follow-up edit)
- **Alternative 4-plan:** One plan per skill, then a wrapper plan for the README clarifier. More overhead, less coherent than pair-plans.
- **Default: 3-plan version.** Planner may merge 03-03 into 03-02 (since SPEC-04 lives in the same README block both touch) if granularity check finds it cleaner.

### Claude's Discretion
- Exact skill body wording, section names, length, and example artifacts are at Claude's discretion during execute. Tasks should specify required section presence + required citations + required behavior (e.g., "must instruct the agent NOT to auto-commit") — NOT paragraph-level content.
- Whether `spec-interactive` shows a copy-paste 8-section skeleton vs. dynamically asking section by section is at the executor's discretion, provided the resulting spec covers all 8 semantic elements per D50.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `skills/discussion/SKILL.md` and `skills/seeded-discussion/SKILL.md` (Phase 2) — pattern source for V1 spine skill bodies: workflow section, anti-sycophancy stance, scope-drift handling, thread resolution, Phase 1 doc citations.
- `skills/capture-inbox/SKILL.md` (Phase 2) — pattern for V1 skills writing artifacts: filename grammar, target folder, single artifact-type focus.
- `skills/derive-spec/SKILL.md` (existing) — reference for the "spec" concept and for what spec-* must NOT do (no codebase reverse-engineering). Tone reference; do NOT copy its workflow.
- `docs/workflow/v1/README.md` + `thread-layout.md` + `filename-grammar.md` + `immutability.md` — Phase 1 canonical docs.
- `docs/threads/260520095223Z-agentic-workflow/discussions/260518200115Z-agentic-workflow-design-discussion.md` D50 — verbatim handoff-grade semantic contract.

### Established Patterns
- One directory per skill, name matches folder, four registration touchpoints per CLAUDE.md.
- V1 spine skills land under `JeisKappa-workflow`.
- `-auto` skills are pure generators; `-interactive` skills walk the user through the artifact's elements. Per D93, artifact-producing interactive skills DON'T auto-write a separate decision log.
- Anti-sycophancy stance is the V1 standard for any skill that influences a design decision.

### Integration Points
- `.claude-plugin/marketplace.json` — `JeisKappa-workflow.skills` currently has 3 entries (capture-inbox, discussion, seeded-discussion). Phase 3 adds 4 more.
- `.vscode/settings.json` `conventionalCommits.scopes` — currently 11 entries. Phase 3 adds 4. Final count = 15, alphabetically sorted.
- `README.md` — currently has 11 entries under "Available skills" + "Retired skills" subsection. Phase 3 adds 4 entries. Final = 15.
- Phase 7 will REPLACE the simple "Available skills" list with the README hybrid (toolbox model + layered map + recommended paths + per-module catalog). Phase 3 keeps the simple-list shape — Phase 7 owns the redesign.

</code_context>

<specifics>
## Specific Ideas

- `spec-interactive`'s 8-section skeleton MAY be presented either as a static template the skill shows up front OR dynamically as the workflow proceeds. Both forms are acceptable. The skill body should state which form it uses so a reader knows what to expect.
- Examples in skill bodies should use realistic artifact filenames consistent with Phase 1 grammar — e.g., `260521120000Z-onboarding-friction-proposal.md`, `260521120000Z-v1-onboarding-spec.md`. Reuse the realistic UTC stamps from existing threads where natural.
- The `derive-spec` differentiation note in README.md should fit in 2–4 lines max. The full toolbox model and layered map is Phase 7 — Phase 3's note is just enough to prevent install-time confusion.

</specifics>

<deferred>
## Deferred Ideas

- README hybrid (toolbox model + layered workflow map + recommended paths + module catalog) — Phase 7 [D34, D109]
- Native adversarial review skill (would push specs to extra scrutiny) — out of scope V1 [D88]; users invoke `the-fool` manually on spec drafts.
- `review-spec-*` evolution of `review-decision-document` — Phase 6 [D81, D82]
- Spec → plan handoff helper — Phase 4 (planning skills accept specs as input)
- Cross-spec merge / variant reconciliation — Phase 7 (`merge-artifacts-*` handles same-type and cross-type merges)

</deferred>

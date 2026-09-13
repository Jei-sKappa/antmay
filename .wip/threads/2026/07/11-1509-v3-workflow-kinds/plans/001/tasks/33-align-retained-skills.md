# Task 33: Align the retained skills

**Objective:** Give the eight retained skills their P48 invocation metadata, purge residual V2 thread vocabulary, and make `open-ticket`'s substantive passive-tracker wording edit.

**Input / context:** The cutover spec `specs/001/spec.md` § "Retain with small or metadata-only changes", AC-3.4, AC-1.4, AC-2.1/2.2 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P27 (open-ticket: creates exactly one ticket on explicit invocation; passive `External:` semantics), P48 (metadata pair; concise human-facing descriptions), P51 (functional behavior preserved unless a direct V3 contradiction is found). Spec Degrees of freedom #10: which wording tweaks count as "direct V3 contradictions" is your judgment — anything touching product behavior is surfaced to the user (or, under AFK, routed through `.pending-decisions/`) rather than decided silently. Skills in scope: `open-ticket` (substantive edit), `afk-exploration`, `the-librarian`, `take-snapshot`, `brief-the-recipient`, `consult-the-expert`, `report-to-the-owner`, `meta-prompting` (metadata + vocabulary only). Known vocabulary hits to fix: `afk-exploration/references/throwaway-prototyping.md` (`.wip`), `afk-exploration/references/red-team-adversarial.md` (word "tier"); `open-ticket/SKILL.md` mentions ledgers/latches and finish-closing-the-ticket behavior.

**Skill-body hygiene** — binding for every `SKILL.md` (and reference file) this task edits:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. For ALL eight skills: add `disable-model-invocation: true` to frontmatter; create `agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`; confirm the `description` is a concise human-facing summary (adjust only if it reads as a routing trigger list or references retired machinery); bump `metadata.version` (patch/minor appropriate for metadata-only skills).
2. `open-ticket` — the substantive edit: rewrite the passages that reference ledgers, thread seeds' mandatory `External:` lines, status latches, or `finish` closing the ticket. The V3 wording: this skill creates exactly one tracker ticket on explicit invocation (the only operation whose invocation authorizes ticket creation); a ticket linked from a thread seed's `External:` field is a passive read-context reference; no workflow operation comments on, transitions, or closes the ticket without an explicit user request. Preserve the skill's tracker-agnostic creation flow otherwise.
3. Vocabulary sweep for each of the eight folders (SKILL.md AND references): run the AC-1.4 greps (below) and fix every hit by rephrasing or deletion, preserving functional behavior. For `throwaway-prototyping.md`, replace the `.wip/` scratch location with a neutral disposable location outside the thread model (e.g., a temp directory the user names) — if you judge any such fix to change product behavior rather than wording, surface it to the user instead of deciding silently.
4. Deliverable skills (`meta-prompting`, `consult-the-expert`, `report-to-the-owner`, `brief-the-recipient`): keep their no-preamble rule intact — the chat response IS the deliverable.
5. Do NOT restructure bodies, rename sections, or "improve" content beyond metadata, the open-ticket edit, and vocabulary fixes.

**Files modified:** `skills/workflow/capture-discussion/open-ticket/SKILL.md` (edited), `skills/workflow/research/afk-exploration/SKILL.md` (frontmatter), `skills/workflow/research/afk-exploration/references/throwaway-prototyping.md` (edited), `skills/workflow/research/afk-exploration/references/red-team-adversarial.md` (edited), `skills/workflow/research/the-librarian/SKILL.md` (frontmatter), `skills/workflow/documentation/take-snapshot/SKILL.md` (frontmatter), `skills/workflow/handoff/brief-the-recipient/SKILL.md` (frontmatter), `skills/workflow/handoff/consult-the-expert/SKILL.md` (frontmatter), `skills/workflow/handoff/report-to-the-owner/SKILL.md` (frontmatter), `skills/workflow/support/meta-prompting/SKILL.md` (frontmatter), plus a NEW `agents/openai.yaml` in each of the eight skill folders.

**Verification:**

```sh
for s in capture-discussion/open-ticket research/afk-exploration research/the-librarian documentation/take-snapshot \
         handoff/brief-the-recipient handoff/consult-the-expert handoff/report-to-the-owner support/meta-prompting; do
  grep -L 'disable-model-invocation: true' skills/workflow/$s/SKILL.md            # expect no output
  grep -L 'allow_implicit_invocation: false' skills/workflow/$s/agents/openai.yaml  # expect no output
  grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/$s/ ; \
  grep -riwE 'tier|ledger' skills/workflow/$s/    # both must return nothing
done
grep -nE 'close|closing' skills/workflow/capture-discussion/open-ticket/SKILL.md   # read hits: no finish-closes-ticket behavior remains
git diff --stat -- skills/workflow/documentation skills/workflow/handoff skills/workflow/support skills/workflow/research   # small, frontmatter-dominated diffs
```

**Acceptance criteria:**

- All eight skills carry the synchronized P48 pair (spec AC-2.1/2.2/2.4) and concise human-facing descriptions.
- `open-ticket` still creates exactly one ticket on explicit invocation and its wording matches the passive `External:` semantics; no ledger/latch/ticket-closing references remain (spec AC-3.4).
- The AC-1.4 greps return nothing across all eight folders, including references (spec AC-1.4).
- Functional behavior is preserved (diffs beyond open-ticket and the two reference files are frontmatter/metadata-dominated); the four deliverable skills keep their no-preamble rule.
- Hygiene: no disclaimers naming retired concepts were introduced; no repo-internal cutover references added.

**Consumes:** none

**Produces:** the fully aligned retained-skill set, completing the per-skill P48 metadata for every user-invoked skill (Tasks 8–33).

# Phase 7: Merge, Finish, Navigation & Distribution Surface - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning
**Mode:** Auto (smart-discuss batched — 4 closing skills + major README hybrid redesign)

<domain>
## Phase Boundary

Ship the closing skills of the V1 catalog — merge (reconcile artifact variants), finish (close the thread with a branch action), whats-next (advisory navigation) — and replace the simple-list README with the full hybrid (toolbox model + layered workflow map + recommended paths + per-module catalog). After Phase 7, V1 is COMPLETE.

**In scope (Phase 7):**
- `skills/merge-artifacts-auto/SKILL.md` — NEW [MERG-01, MERG-03, MERG-04, MERG-05, MERG-06]
- `skills/merge-artifacts-interactive/SKILL.md` — NEW [MERG-02, MERG-03, MERG-04, MERG-05]
- `skills/finish/SKILL.md` — NEW [FNSH-01, FNSH-02, FNSH-03] — SINGLE skill (no -auto/-interactive split per D97)
- `skills/whats-next/SKILL.md` — NEW [NAV-01, NAV-02, NAV-03]
- `.claude-plugin/marketplace.json` — `JeisKappa-workflow.skills` 29 → 33
- `.vscode/settings.json` — `."conventionalCommits.scopes"` 36 → 40 (alphabetically sorted)
- `README.md` — FULL REDESIGN to hybrid layout per D34, D109 (toolbox model + layered map + recommended paths + per-module catalog) [DIST-01]
- README confirmation of the existing surface (no new code change, just visible documentation):
  - Plugin grouping renders `JeisKappa Workflow` in `npx skills list` [DIST-02 — already true since Phase 1; Phase 7 confirms by README narrative]
  - Per-skill installability via `npx skills add Jei-sKappa/skills --skill <name>` [DIST-03 — already true since Phase 1]
  - All V1 skill descriptions explicitly state interaction mode, no unsuffixed aliases [DIST-05 — already enforced; Phase 7 final visibility check]

**Out of scope (Phase 7):**
- V2 features (CLI/runtime, native adversarial review, etc.)
- Migration of pre-existing thread artifacts (V1 thread artifacts created during the milestone stay where they are)
- Native cross-thread index — out of scope V1 [D13]
- Per-thread README/STATE — out of scope V1 [D15]

</domain>

<decisions>
## Implementation Decisions

### merge-artifacts behavior [D99–D103, MERG-01..06]
- **Same-type default [D100, MERG-01, MERG-03]:** Default merges same-type artifacts (e.g., 2 specs → 1 spec). Cross-type merge only when the user EXPLICITLY states the target type (e.g., "merge proposal + discussion into a spec") or context makes it obvious (e.g., dropping into a `specs/` folder). Skill body documents both shapes.
- **Output location [D101, MERG-04]:** Output lands in the TARGET type's normal folder (`proposals/`, `specs/`, `plans/`, `discussions/`, or `inbox/open/`). NEVER a separate `merges/` folder.
- **Output filename [D45, MERG-01]:** Versioned-form filename, next mainline integer. If inputs are at v1 and v2, output is v3 (no descriptor — the merge is the next mainline). If inputs are descriptor variants (e.g., `v2-stricter` + `v2-impl-ready`), output is the next integer mainline (`v3`).
- **Conflict handling auto [D103, MERG-06]:** `merge-artifacts-auto` preserves conflicts EXPLICITLY in the output when it cannot confidently resolve. Skill body documents a `<!-- CONFLICT: <description of disagreement> -->` marker pattern (or equivalent) for explicit preservation.
- **Conflict handling interactive [D103, MERG-02]:** `merge-artifacts-interactive` asks the user to resolve subjective conflicts; preserves objective additions automatically.
- **Decision log [D102, MERG-05]:** `merge-artifacts-interactive` writes a decision log to `discussions/<UTC>-<kebab-desc>-decision-log.md` capturing user resolutions. `merge-artifacts-auto` writes NO separate log.
- **Anti-sycophancy stance:** `merge-artifacts-interactive` carries the 4 markers from `discussion/SKILL.md`. Merge stance amplifier: "When inputs disagree, push back on the user's first instinct — the merged artifact must survive later review."

### finish [D97, D98, FNSH-01..03]
- **SINGLE skill [D97, FNSH-01]** — intentional V1 exception to the auto/interactive variant convention. `finish/SKILL.md` is the only V1 skill with no mode-variant siblings. Skill body and description explicitly acknowledge this exception per CONTEXT decision.
- **Thread check [D98, FNSH-02]:** Lightweight pre-question check. Surfaces:
  - Final artifacts present (proposals/, specs/, plans/, discussions/ — any of them have content?)
  - Open Inbox items (`inbox/open/` non-empty?)
  - Implementation commits/status (any recent commits in current branch?)
  - Obvious unresolved workflow concerns (uncommitted changes? pending review-finding records?)
- **Closure question [D98, FNSH-03]:** After the lightweight check, ASK the user via the harness's question primitive (or freeform if no primitive): "merge into main" / "merge into other branch" / "create PR" / "leave as is". Skill body documents the 4 options.
- **Branch operations:** Depending on user choice:
  - merge into main: `git checkout main && git merge <current> && git push` (skill body documents); user confirms before execution
  - merge into other branch: same with user-supplied target
  - create PR: `gh pr create` invocation (or instruct the user if `gh` is unavailable)
  - leave as is: report current branch state and stop
- **No auto-commit, no force operations:** finish NEVER force-pushes or rewrites history. Skill body documents this.
- **Anti-sycophancy stance:** finish is interactive in spirit (always asks the closure question). Body carries the 4 markers + closure stance amplifier: "Branch operations are hard to undo — push back if the user picks an option that would lose work."
- **Reference inspiration:** D97 cites `.library/sources/obra_superpowers/skills/finishing-a-development-branch/SKILL.md`. Skill body MAY mention this as inspiration; not required.

### whats-next [D33, D105, D106, NAV-01..03]
- **Skill name [D106]:** Literal `whats-next` (kebab-case).
- **Chat-first answer [D105, NAV-01]:** Inspect current thread context + recent artifacts (proposals/, specs/, plans/, implementations, inbox/open/) → suggest 2–4 coherent next actions in chat. NEVER writes an artifact by default.
- **Optional Inbox capture [D105, NAV-02]:** If the user accepts a "save this suggestion for later" prompt, the skill writes an inbox-item record using the V1 grammar. Same capture-inbox-style behavior, but only on user opt-in.
- **Thin OK per D33 [NAV-03]:** V1 body may be thin — explicitly point the agent to the canonical README hybrid (Phase 7's redesigned README) and instruct it to read that guidance before advising. Skill body MAY redirect to README for the full workflow map.
- **No anti-sycophancy amplifier:** whats-next is advisory, not opinion-driven. Standard V1 voice; the 4-marker stance is optional. Default: include the 4 markers (keeps the V1 convention uniform) without a stage-specific amplifier.

### README hybrid redesign [DIST-01, D34, D109]
- **Layout (top to bottom):**
  1. **Title + 1-sentence value statement** — what this repo is.
  2. **Toolbox model** — short narrative (3–6 sentences) explaining V1 is composable. Every spine phase is optional. Users can pick a single skill or compose the whole spine. Use the workflow's actual phrasing (PROJECT.md "Core Value" is the source).
  3. **Layered workflow map** — visual + textual representation. Show the nominal spine as one layer (`propose → spec → plan → implementation → finish`) and the cross-cutting modules (discussion, review, merge, inbox, navigation) as overlays that attach anywhere. ASCII art or table is fine; do NOT use an external image. D34 says NFA/state-machine notation is a plausible later addition — V1 keeps it simple.
  4. **Recommended common paths** — 3–5 onboarding paths for typical use cases. Examples:
     - "Implementing a feature from rough idea": discussion → propose → spec → plan-strict → implement-plan-with-subagents → review-implementation → finish
     - "Fixing a bug": implement-auto + review-code → finish
     - "Exploring an idea": discussion → propose (no further commitment)
     - "Refining a plan": plan-strict-auto → review-plan-interactive → adjust-plan-granularity → implement-plan-auto
  5. **Per-module catalog** — full skill list grouped by module/family with one-line description + install command per skill. Module families:
     - **Capture & Discussion**: capture-inbox, discussion, seeded-discussion
     - **Propose**: propose-auto, propose-interactive
     - **Spec**: spec-auto, spec-interactive
     - **Plan**: plan-loose-{auto,interactive}, plan-strict-{auto,interactive}, adjust-plan-granularity-{auto,interactive}
     - **Implement**: implement-{auto,interactive}, implement-plan-{auto,interactive}, implement-plan-with-subagents-{auto,interactive}
     - **Review**: review-{proposal,spec,plan,implementation,code}-{auto,interactive}
     - **Merge**: merge-artifacts-{auto,interactive}
     - **Finish & Navigate**: finish, whats-next
     - **Other** (non-V1, existing skills): the-librarian, derive-spec, afk-exploration, consult-the-expert, meta-prompting, report-to-the-owner, brief-the-implementer
  6. **Retired skills** subsection (existing 2 entries: discussion-loop, review-decision-document)
  7. **Installation note** — generic `npx skills add Jei-sKappa/skills --skill <name>` pattern with one example, plus a 1-line note about plugin grouping in `npx skills list` rendering as `JeisKappa Workflow`.

- **Existing simple-list "Available skills" section [DIST-03, DIST-05]:** REPLACE entirely with the per-module catalog. Every existing entry (33 V1 skills after this phase + the 7 non-V1 + 2 retired) must remain accessible in the catalog with its `npx skills add` snippet.
- **Documentation notes from Phase 6:** Preserve the verification-coverage note (D85) and the-fool delegation note (D88) — integrate them into the catalog (e.g., as ONE-LINE callouts inside the Review module family).
- **DIST-04 (already done in Phase 1):** Marketplace plugin entry + scopes-file-readiness baseline — Phase 7 does not re-verify; just preserves.
- **DIST-02 (plugin grouping):** Confirmed by `npx skills list` rendering `JeisKappa Workflow`. README's installation section mentions this.
- **DIST-05 (interaction-mode in every description, no unsuffixed aliases):** Verified by reading the per-module catalog — every V1 skill entry MUST show its mode in the entry's one-liner.

### Plan grouping (meta — for this phase's plans)
- **3-plan proposal:**
  - Plan 07-01: `merge-artifacts-auto` + `merge-artifacts-interactive` + 3 shared registration touchpoints (marketplace, scopes, README entries) — adds entries to the existing simple "Available skills" list in README; 07-03 reorganizes
  - Plan 07-02: `finish` + `whats-next` + 3 shared registration touchpoints
  - Plan 07-03: README hybrid redesign — full restructure of README.md from simple-list to hybrid (toolbox model + layered map + recommended paths + per-module catalog + retired skills + installation note); DIST-01 verification
- Sequential waves (parallelization=false). Plan 07-03 is the last plan in the milestone.

### Skill body voice and structure
- Same Phase 4/5/6 voice — dense, declarative, citation-first.
- `merge-artifacts-interactive`, `finish` carry the 4 anti-sycophancy markers. `whats-next` carries them by default (keeps V1 convention uniform). `merge-artifacts-auto` does NOT.
- D93 application: `merge-artifacts-interactive` DOES write a decision log per D102 (this is an exception to the "interactive may or may not log" rule because merge interactions ARE the durable trade-offs). Skill body documents this exception.
- Citations: Each skill body cites Phase 1 canonical docs by absolute path on first invocation.
- Frontmatter: `name`, `description` with "Use when…" + mode (or "single skill, no -auto/-interactive variant" for finish), `metadata.author: https://github.com/Jei-sKappa`, `metadata.version: 1.0.0`.

### Claude's Discretion
- Exact ASCII / table format of the layered workflow map — at executor's discretion. Keep simple; NFA/state-machine notation is V2 per D34.
- Exact wording of the toolbox-model narrative — at executor's discretion, drawn from PROJECT.md Core Value statement.
- Number and exact composition of recommended common paths in the README (3–5 paths) — at executor's discretion.
- Exact heading/section ordering in `finish` and `whats-next` — at executor's discretion, provided the documented behaviors land.
- Where to mention the verification-coverage and the-fool delegation notes inside the new per-module catalog (callout in Review module family vs separate subsection) — at executor's discretion.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 6 review-* skills — pattern source for the merge-artifacts-* per-finding-walk shape (interactive merge walks per-conflict the way review walks per-finding).
- Phase 2 `seeded-discussion/SKILL.md` — pattern source for per-conflict walk format.
- Phase 2 `capture-inbox/SKILL.md` — pattern source for whats-next's optional inbox capture (when user accepts a "save for later").
- Phase 1 `docs/workflow/v1/` reference docs — cited by all 4 new skills for filename grammar and folder layout.
- `.library/sources/obra_superpowers/skills/finishing-a-development-branch/SKILL.md` — explicit inspiration for `finish` per D97.
- `.planning/PROJECT.md` "Core Value" — source for the README's toolbox-model narrative.

### Established Patterns
- Pair plans (auto + interactive) with shared registration touchpoints — proven Phase 3/4/5/6.
- Single-skill plans (when no auto/interactive split applies) — `finish` is the only V1 example.
- New skill folder = four touchpoints per CLAUDE.md.
- V1 skills under `JeisKappa-workflow`; non-V1 under `JeisKappa-skills`.

### Integration Points
- `.claude-plugin/marketplace.json` — `JeisKappa-workflow.skills` 29 entries (end of Phase 6). Phase 7 adds 4 → 33 final.
- `.vscode/settings.json` `."conventionalCommits.scopes"` — 36 entries (end of Phase 6). Phase 7 adds 4 → 40 final.
- `README.md` — currently has 36 "Available skills" entries + 2 documentation notes + 2 Retired entries (end of Phase 6). Phase 7 first adds 4 entries (07-01 + 07-02 plans) for 40 total, then 07-03 REPLACES the entire structure with the hybrid layout.

</code_context>

<specifics>
## Specific Ideas

- The layered workflow map in README can be a simple table with rows for the spine layer and overlay layers:
  ```
  Layer       | Skills
  ------------+---------------------------------------------------------------
  Spine       | propose → spec → plan → implementation → finish
  Discussion  | discussion / seeded-discussion / capture-inbox
  Review      | review-{proposal,spec,plan,implementation,code}-{auto,interactive}
  Merge       | merge-artifacts-{auto,interactive}
  Navigation  | whats-next
  ```
  Or an ASCII diagram showing the spine horizontal with overlay arrows.
- Recommended-paths section: aim for 3–5 paths. The "implementing a feature from rough idea" path is the canonical "full workflow" walkthrough.
- `finish` thread check: explicitly enumerate the 4 inspection items as a `## Thread Check` section.
- `whats-next` can be ≤30 lines if it just points to the canonical README — D33 explicitly allows this.

</specifics>

<deferred>
## Deferred Ideas

- CLI/runtime — V2 [D1]
- Native adversarial review skill — V2 [D88]
- Summary/synthesis skill — V2 [D20, D104]
- Cross-thread index — V2 [D13]
- Diagnose-blocker skill — V2 [D73]
- Worktree-based implementation flows — V2 [D78]
- NFA/state-machine workflow notation — V2 [D34]
- Backlog primitives — V2 [D24]
- review-plan-with-subagents-* — V2 [D83]

</deferred>

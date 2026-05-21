# Phase 2: Capture & Discussion Infrastructure - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning
**Mode:** Auto (smart-discuss batched — multiple user-facing skills with substantive decisions)

<domain>
## Phase Boundary

Ship the capture-and-decide layer underneath the rest of the V1 workflow: three new V1 skills (`capture-inbox`, `discussion`, `seeded-discussion`) all of which honor Phase 1's filename grammar and thread-layout contract, plus retire the legacy `discussion-loop` skill with a documented migration path. After Phase 2 a V1 user can capture lightweight Inbox items into a thread, drive open-ended interviews that produce numbered decision-log artifacts, and walk a predetermined point list with options+recommendation default-on.

**In scope (Phase 2):**
- `skills/capture-inbox/SKILL.md` — NEW [INBX-01..04]
- `skills/discussion/SKILL.md` — NEW [DISC-01, DISC-03..09]
- `skills/seeded-discussion/SKILL.md` — NEW [DISC-02, DISC-04..09]
- `skills/discussion-loop/SKILL.md` — REWRITTEN to a retirement notice pointing legacy users at the two replacements
- `.claude-plugin/marketplace.json` — `JeisKappa-workflow` plugin gains `./skills/capture-inbox`, `./skills/discussion`, `./skills/seeded-discussion`; the legacy `discussion-loop` entry under `JeisKappa-skills` is REMOVED
- `.vscode/settings.json` `conventionalCommits.scopes` — gains `capture-inbox`, `discussion`, `seeded-discussion`; loses `discussion-loop` (kept alphabetically sorted)
- `README.md` — gains entries for the three new skills under "Available skills"; removes the `discussion-loop` entry and adds a one-line "Retired skills" subsection naming `discussion-loop` and pointing to the replacements

**Out of scope (Phase 2):**
- Authoring upstream spine skills (`propose-*`, `spec-*`) — Phase 3
- README hybrid (toolbox model + layered workflow map + recommended paths) — still Phase 7
- Migration of pre-existing `docs/discussions/*-discussion.md` artifacts (legacy `discussion-loop` outputs lived outside the V1 thread shape) — they stay where they are; no rewrite, no move
- Cross-thread Inbox index — out of scope V1 [D13]
- Backlog primitives (priority/owner/grooming) — out of scope V1 [D24]

</domain>

<decisions>
## Implementation Decisions

### Capture-Inbox skill — file shape and trigger
- **File body shape:** Free-form short markdown. The skill body MUST instruct that every Inbox item starts with a `**Why:**` line (one sentence explaining why the item is captured) followed by free-form body. No rigid template. [D25, INBX-02]
- **Filename grammar:** Record form `<UTC>-<kebab-desc>-inbox-item.md`. The `inbox-item` artifact-type token is already documented in `docs/workflow/v1/filename-grammar.md`. [THRD-04]
- **Slug source:** The skill asks for or derives a short kebab-case slug from the captured item's `**Why:**` line. If invoked autonomously and no slug obvious, the skill picks the first 3–5 words of the why.
- **Target folder:** Always writes to `inbox/open/`. V1 has NO separate "process" or "drop" skill — those lifecycle transitions are manual file moves (state-by-folder, documented in `docs/workflow/v1/immutability.md`). [INBX-03]
- **Capture trigger rule [D27, INBX-04]:** The skill body explicitly states: "When invoked inside an interactive session, ASK the user before capturing. When invoked autonomously / AFK / scripted with no human in the loop, AUTO-CAPTURE without prompting." The skill does not try to detect runtime programmatically — it instructs the agent to make the call based on its session context.
- **Thread resolution:** If no thread exists, the skill behaves per D18 (ask the user, or auto-create when context is obvious). Same convention used by `discussion` (see below).

### Discussion skill — open-ended interview
- **Trigger description:** "Open-ended discussion. Discover questions live as the conversation unfolds." [D17, DISC-01]
- **Decision log file:** Created LAZILY when the FIRST decision is logged. Subsequent invocations in the same thread RESUME the most recent decision log (the skill body documents how to identify "most recent" — name the file by `## <Topic>` heading, list the per-decision IDs, and append). [DISC-04]
- **Decision log filename:** `<UTC>-<kebab-desc>-decision-log.md` under `docs/threads/<thread>/discussions/`. The `decision-log` artifact-type token is the canonical name per D94 ("the artifact is a decision log; skill names keep 'discussion'"). [DISC-09, D94, THRD-04]
- **Decision ID numbering [D53, DISC-05]:** Per-log local sequential `## D1: <Title>`, `## D2: <Title>` etc. — IDs are LOCAL to their decision log, NOT thread-global, NOT project-global. Cross-log references include the log's path.
- **Options + recommendation behavior [D21, DISC-03]:** Default OFF (open-ended interview). The skill body instructs the agent to OPT IN to options+recommendation only when a concrete decision point emerges (e.g., user explicitly asks "what should I do?" OR the agent recognizes "we are choosing between concrete alternatives"). Otherwise stay conversational.
- **Question budget [D22, DISC-07]:** No hard cap. The skill body instructs the agent to ask "shall we keep going or finish here?" whenever it senses natural closure (user's pace slows, topic exhausted, ~10–15 decisions logged).
- **Scope drift handling [D23, DISC-08]:** When user introduces an out-of-scope branch, the skill proposes one of: (a) park the branch as an Inbox item via `capture-inbox` (preferred), (b) split it into its own decision log, (c) defer to "later". The skill asks the user which.
- **Anti-sycophancy stance:** Preserve the exact "disagree when you disagree / refuse to log a decision you believe is wrong without flagging it" language from the legacy `discussion-loop` body — the anti-sycophancy stance is V1's most-validated discussion behavior and must survive the migration.
- **Thread resolution [DISC-06]:** Skill body instructs: "If no thread root exists, ASK the user where to create one OR auto-create a thread when context makes the slug obvious (e.g., the user opens with `Let me think through <topic>`)."

### Seeded-Discussion skill — predetermined point walk
- **Trigger description:** "Walk a predetermined list of points one at a time, with options + recommendation default-on." [D17, D21, DISC-02]
- **Point-list input:** Accept either a markdown file with a bullet/numbered list of points OR an inline list pasted into the prompt. The skill body documents both shapes. Skill detects which form the input takes.
- **Loop shape:** Reuse the legacy `discussion-loop` Loop section verbatim (Decision / What you need to know / Options / Recommendation) — that loop is precisely what D17 + D21 mandate. The migration of behavior is "rename + V1-folder-shape", not "redesign the loop".
- **Logging shape:** Per-point append-only record with `## <Point title> → ## D<N>: <Point title>` heading (so a downstream artifact can reference `D<N>` from this log). [D53, DISC-05]
- **Decision log filename:** Same as `discussion` — `<UTC>-<kebab-desc>-decision-log.md` under `docs/threads/<thread>/discussions/`. Per D94 both skills produce decision logs; only the skill name differs.
- **Scope drift / question budget / anti-sycophancy:** Same conventions as `discussion`. [DISC-07, DISC-08]
- **Resumption:** If the user pauses mid-list, the skill resumes by reading the existing decision log and identifying which seeded points have been logged vs. remain. (No state file — the log itself is the state.)

### Legacy `discussion-loop` retirement [DISC-09]
- **Retirement strategy:** SOFT retire. Keep the `skills/discussion-loop/` folder, but rewrite `SKILL.md` to a short deprecation notice. The notice tells legacy users: "This skill is retired. Install `discussion` for open-ended interviews or `seeded-discussion` for walking a predetermined point list." It also notes that decision logs written by the legacy skill (at `docs/discussions/`) remain valid and require no migration.
- **Marketplace plugin:** REMOVE the `./skills/discussion-loop` entry from the `JeisKappa-skills` plugin in `.claude-plugin/marketplace.json`. The folder stays but is not advertised in `npx skills list`.
- **Conventional commit scopes:** REMOVE `discussion-loop` from `.vscode/settings.json` `conventionalCommits.scopes` (no new commits should scope to this retired skill — the migration commit itself is `chore:` repo-wide).
- **README.md:** Remove the `discussion-loop` entry from "Available skills". Add a short subsection (e.g. "## Retired skills") that names `discussion-loop` and points to the two replacements. This is NOT the README hybrid (still Phase 7) — it is a minimal migration note.
- **Existing artifacts:** No migration. Pre-existing logs at `docs/discussions/*-discussion.md` stay as-is. The deprecation notice in `skills/discussion-loop/SKILL.md` explicitly mentions this.

### Skill body voice and structure (all three new skills)
- **Voice:** Match the existing repo voice — dense, declarative, action-first, no preamble. Cite Phase 1 reference docs by absolute path the FIRST time each rule appears in the skill body (e.g., "Writes a record artifact `<UTC>-<kebab-desc>-inbox-item.md` per `docs/workflow/v1/filename-grammar.md`.").
- **Frontmatter:** Standard V1 form — `name` (kebab-case matching folder), `description` (one sentence with explicit "Use when…" trigger), `metadata.author: https://github.com/Jei-sKappa`, `metadata.version: 1.0.0`.
- **Self-contained:** Each skill body inlines a one-sentence summary of every Phase 1 rule it invokes (per the V1 Skill Rule Reuse Convention captured in `01-CONTEXT.md`). Links go to the canonical doc, but a reader of the skill alone gets the rule in summary form.

### Plan grouping
- **3-plan proposal:**
  - Plan 02-01 — `capture-inbox` skill (folder + SKILL.md + registration updates: marketplace.json, .vscode/settings.json scopes, README.md "Available skills")
  - Plan 02-02 — `discussion` and `seeded-discussion` skills (both folders + SKILL.md files + registration updates for both)
  - Plan 02-03 — `discussion-loop` retirement (SKILL.md rewrite + marketplace.json removal + .vscode/settings.json scope removal + README.md retirement note)
- Planner may merge 02-02 + 02-03 if granularity check finds them coherent, or split 02-02 if individual skills warrant separate plans.

### Claude's Discretion
- Exact skill body wording, length, internal section names (Setup/Loop/Finish vs. Workflow/Discipline/etc.), and example artifacts are at Claude's discretion during execute. The planner should specify section-level requirements (e.g., "skill body must contain a Workflow section with a Why-line requirement"), not paragraph-level content.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `skills/discussion-loop/SKILL.md` — direct prior art for `seeded-discussion`. The Setup / Loop / Logging / Finish structure is the exact behavior D17 + D21 mandate. Preserve verbatim the anti-sycophancy stance, the four-element option presentation (Decision / What you need to know / Options / Recommendation), and the append-only log discipline. Replace only: filename grammar (now record-form per V1), output location (now `docs/threads/<thread>/discussions/`), per-decision ID format (now `## D<N>: <Title>`).
- `skills/consult-the-expert/SKILL.md` and `skills/brief-the-implementer/SKILL.md` — established voice/structure conventions (Tone / Structure / Guidelines / Output format / Workflow sections). The new skills should match this voice.
- `docs/workflow/v1/thread-layout.md`, `filename-grammar.md`, `immutability.md` — Phase 1 deliverables. New skills cite these as the canonical source.
- `.planning/codebase/CONVENTIONS.md` — declares "every skill body has its own structure; no single mandated form" — so we have voice freedom.

### Established Patterns
- One directory per skill at `skills/<skill-name>/`. Directory name MATCHES `name:` frontmatter exactly.
- New skill folder requires four registration touchpoints per CLAUDE.md: marketplace.json plugin entry, .vscode/settings.json scopes, README.md "Available skills". Now also: marketplace.json plugin choice (V1 spine skills go under `JeisKappa-workflow`, NOT `JeisKappa-skills`).
- Frontmatter version starts at `1.0.0` for new skills.
- Commit scope MUST be the skill's folder name when the change is single-skill-scoped (per CLAUDE.md).

### Integration Points
- `.claude-plugin/marketplace.json` — `JeisKappa-workflow` plugin currently has empty `skills: []` (Phase 1 deliverable). This phase populates the first three entries.
- `.vscode/settings.json` `conventionalCommits.scopes` — alphabetically sorted; insertions need to maintain sort.
- `README.md` — currently has 9 entries under "Available skills". The discussion-loop entry sits in the appropriate alphabetical position. Removing it and inserting three new entries (capture-inbox, discussion, seeded-discussion) requires re-sorting.
- `docs/workflow/v1/` reference docs — every new skill body links here for the canonical rules.

</code_context>

<specifics>
## Specific Ideas

- Anti-sycophancy stance from legacy `discussion-loop` (lines 13–24) is V1's most-validated discussion behavior. Preserve verbatim or near-verbatim in both `discussion/SKILL.md` and `seeded-discussion/SKILL.md`.
- `capture-inbox/SKILL.md` should include a 2-line example of a valid Inbox item (with the `**Why:**` line) so authors can copy-paste-adapt.
- The retirement notice in `discussion-loop/SKILL.md` should be SHORT (~10–20 lines) and link both replacement skills by name plus the install commands.
- README.md "Retired skills" subsection format: one bullet per retired skill, with one-sentence description, replacement skill name(s), and the date of retirement.

</specifics>

<deferred>
## Deferred Ideas

- General-purpose summary/synthesis skill across discussions, reviews, Inbox items, code findings, thread state — out of scope V1 [D20, D104], deferred to V2
- Cross-thread Inbox index file — out of scope V1 [D13]
- Backlog primitives (priority/owner/grooming) — out of scope V1 [D24]
- A "process-inbox-item" / "drop-inbox-item" skill that moves files between `inbox/open/`, `inbox/processed/`, `inbox/dropped/` — out of scope V1 (state-by-folder lifecycle is manual in V1)
- Native adversarial-review skill — out of scope V1 [D88], use `the-fool`
- Decision-log merge skill (consolidating multiple decision logs into one) — covered by Phase 7's `merge-artifacts-*` since decision logs are same-type-mergeable artifacts

</deferred>

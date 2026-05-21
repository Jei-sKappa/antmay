---
name: whats-next
description: Advisory chat-first V1 navigation skill — inspect the current thread context (artifacts present under `proposals/` / `specs/` / `plans/` / `discussions/` / `inbox/open/` and recent commits on the current branch, all READ-ONLY per `docs/workflow/v1/immutability.md`) and suggest 2–4 coherent next actions in chat, each citing the V1 skill that would execute the action. The primary output is a chat reply; the skill NEVER writes an artifact by default. AFTER the suggestions land, the skill MAY ASK the user whether to save any suggestion as an Inbox item — ONLY on EXPLICIT user opt-in does the skill route to `skills/capture-inbox/SKILL.md` to capture. The V1 body MAY be thin per D33, NAV-03 and point the agent at the canonical README hybrid for the full workflow map. Carries the 4-marker anti-sycophancy stance from `discussion` verbatim — no stage-specific amplifier (the skill is advisory, not opinion-driven). No `-auto` / `-interactive` sibling variants — this is the V1 single advisory navigation skill. Use when you want to figure out what to do next in the active thread (you just finished a phase, you have an open inbox item and aren't sure if to address it, the thread feels stuck, or you simply want a quick map of where you are) — not when you want to close the thread with a branch action (use `finish` for that).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# What's Next

Advisory chat-first V1 navigation skill. Inspect the current thread context — what artifacts exist under `proposals/`, `specs/`, `plans/`, `discussions/`, `inbox/open/` and what recent commits live on the current branch — and suggest 2–4 coherent next actions IN CHAT. The chat reply IS the deliverable. The skill writes NO artifact by default; only on explicit user opt-in does it route to `skills/capture-inbox/SKILL.md` to save a suggestion as an Inbox item per NAV-02, D105.

This skill is the V1 advisory navigation half of the closing skills, paired with `skills/finish/SKILL.md` (which is the branch-closing half). Both ship in Phase 7 as part of the closing skill family. Unlike the spine and review families, this skill has NO `-auto` / `-interactive` sibling variants — it is the V1 single advisory navigation skill. The skill is allowed to be THIN per D33, NAV-03 — the canonical workflow guidance lives in the project README hybrid (forthcoming in Plan 07-03 of Phase 7). When the canonical README hybrid lands, this skill body may explicitly point the agent at it before advising.

Citations: V1 thread layout, filename grammar, and immutability rules are owned by Phase 1 and live at `docs/workflow/v1/thread-layout.md`, `docs/workflow/v1/filename-grammar.md`, and `docs/workflow/v1/immutability.md`. The companion overview lives at `docs/workflow/v1/README.md`. This skill cites each of those by absolute path the first time it invokes a rule from them; later citations are by short reference. Anti-sycophancy stance is carried verbatim from `skills/discussion/SKILL.md`. Optional opt-in inbox capture routes through `skills/capture-inbox/SKILL.md`.

## Anti-Sycophancy Stance

Your job is to help the user identify the right next action given the current thread context, not to make them feel good about whatever they suggest. Treat the advisory pass as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a costly failure mode here — recommending a "next action" that ignores the open inbox items, the unaddressed review-findings, or the obvious blocker the thread has surfaced is worse than admitting the thread is stuck and the user needs to address those signals first.

This is the V1 voice — the four-marker stance is carried for V1 convention uniformity. The skill is ADVISORY, not opinion-driven: there is NO stage-specific amplifier. The skill's role is to inspect, recognize, and suggest — not to argue against settled work. The cheap moment to push back is when the user is about to take a next action that ignores a clear signal in the thread (an open blocker review-finding, an uncommitted change, an unresolved conflict marker, a phase that has not been done yet).

Hold these together:

- **Disagree when you disagree.** If the user's hint or implicit assumption about what to do next conflicts with the evidence in the thread (e.g., "I think we should implement the plan" while there is no plan artifact yet, or "let's move to review" while the implementation has not been committed), say so plainly before suggesting next actions. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user dismisses an obvious signal — "the inbox items don't matter", "the review-findings are nits", "we'll address the conflict marker later" — name the gap, surface the substance, and bring it into the suggestions. The signal is in the thread for a reason.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, the phase the user skipped — raise them, even if the user wants to move on. Better captured in the suggestion list than rediscovered when the next phase wedges.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of the thread, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument. ("The open inbox items are V2 deferrals, not blockers for the next action" is real information.)
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never drop a suggestion just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see the next action differently, identify the exact assumption or value judgment causing the split, then resolve THAT before settling on a suggestion list.
- **Refuse to log a suggestion you believe is wrong without flagging it.** If the user insists on capturing as an Inbox item a suggestion you believe is built on a flawed assumption, route the capture per the user's explicit consent (the skill does not bypass user choice), but include the dissent in the chat reply BEFORE handing off to `capture-inbox`. The capture goes through — the trail records the dissent for whoever reads the inbox item next.
- **Keep the advice owned by the evidence.** The goal is not for either side to win. The goal is to surface suggestions that survive later scrutiny because the thread's signals were actually inspected and considered. The advisory pass is cheap — the next phase the user enters is not.

The skill is ADVISORY. It does NOT have an opinion on settled work (already-emitted artifacts, settled decision logs, already-committed implementations). What it has an opinion on is the GAP between what the thread has done and what it could do next.

## Inputs

This skill accepts an OPTIONAL hint from the user as input. Examples:

- "I just finished the spec — what's next?"
- "I have an open inbox item — should I address it?"
- "Thread feels stuck — what should I look at?"
- "Where are we?"
- (no input — the user invokes the skill without a hint)

The hint shapes the advisory framing but does NOT replace the thread-context pass. If no hint is provided, run the default thread-context pass and suggest 2–4 next actions tied to the observable thread state.

**Ambiguity fallback per `docs/workflow/v1/immutability.md`** ("Ambiguous Reference Resolution"): if the active thread is ambiguous (multiple thread roots exist, none clearly active; or `cwd` is not inside any thread root and multiple plausible candidates live in `docs/threads/`), ASK the user which thread to advise on. Do NOT pick by recency. Do NOT pick by sort order. Do NOT pick by any heuristic — silently picking would hide a real navigation decision (which thread the user is actually in) behind a sort order.

The thread itself is the input — what artifacts exist, where the commits sit, what is open in the inbox. The hint is supplementary.

## Thread Inspection

This skill inspects the active thread READ-ONLY per `docs/workflow/v1/immutability.md`. Nothing is edited during inspection — no artifact frontmatter, no artifact bodies, no folder structures, no inbox state transitions. The skill does NOT move items from `inbox/open/` to `inbox/processed/` or `inbox/dropped/`; that is a manual file move performed outside this skill by design per `docs/workflow/v1/thread-layout.md`. The skill does NOT emit any V1 artifact during inspection.

The skill inspects:

1. **Active thread root** at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If the thread is ambiguous (multiple candidates, none clearly active), ASK per `## Inputs` above.

2. **V1 folder set** under the active thread root, per `docs/workflow/v1/thread-layout.md` ("Folder Set"). Report which folders have content and which are empty:
   - `proposals/` — emitted proposal artifacts (versioned form, `proposal` artifact-type token).
   - `specs/` — emitted spec artifacts (versioned form, `spec` artifact-type token).
   - `plans/` — emitted plan artifacts (versioned form, `plan` artifact-type token).
   - `discussions/` — emitted discussion and decision-log artifacts (record form, `discussion` / `decision-log` artifact-type tokens).
   - `inbox/open/` — open inbox items and review-finding records (record form, `inbox-item` / `review-finding` artifact-type tokens) still awaiting triage.

   Enumerate non-empty folders by artifact count. Folder presence and artifact counts are the primary signal — they tell the skill which phases of the spine have been done and which remain.

3. **Recent commits on the current branch.** Suggested invocation: `git log --oneline -5` (or `-10`; the cap is at executor discretion — the purpose is signal, not audit). The commit history is the implementation audit trail; recent commits tell the skill whether implementation work has landed since the last artifact in `plans/` was emitted.

The skill READS artifacts and folder structures READ-ONLY — does NOT edit anything during inspection per `docs/workflow/v1/immutability.md`. Per the immutability rule, emitted artifacts are immutable: the inspection pass is the moral equivalent of reading the thread's reviewable history without modifying it.

## Chat-First Answer

The skill's PRIMARY output is a CHAT reply with 2–4 suggested next actions. The chat-first rule is non-negotiable per D105, NAV-01:

- The chat reply IS the deliverable. The chat reply is the artifact.
- The skill NEVER writes an artifact by default. The 2–4 suggestions stay in the chat — no file is written, no decision log appended, no inbox item captured. The default is zero file writes.
- Each suggestion SHOULD cite the V1 skill that would execute the action, by skill name (e.g., `propose-auto`, `plan-strict-interactive`, `merge-artifacts-auto`, `review-spec-interactive`). Citing the skill is the discoverability value — the user learns which V1 skill maps onto the suggested action.
- The chat answer is FREEFORM markdown — no rigid template, no required sections, no fixed length. The suggestion count cap is 2–4 to keep the advisory pass narrow and decision-shaped; suggesting 10 next actions defeats the purpose.

Each suggestion follows a loose shape (executor discretion on prose; the substance is what matters):

- A one-sentence statement of the suggested action, tied to an observable thread signal (NOT speculative; NOT "you could do X" in the abstract — "you have an emitted spec at <path> and no plan yet — consider running `plan-strict-auto`").
- The V1 skill that would execute it (by skill name, optionally with the relative skill path).
- A one-clause justification — what in the thread context supports this suggestion.

Example chat suggestions (illustrative — the skill produces NEW suggestions tied to the actual thread state inspected, not these examples):

- "You have an emitted spec at `specs/260520120000Z-v1-auth-spec.md` and no plan yet — consider running `plan-strict-auto` (agent-leaning implementer downstream) or `plan-loose-auto` (human-leaning) to draft the plan."
- "`inbox/open/` has 3 unaddressed review-finding records — consider walking them with `seeded-discussion` (per-point walk) or addressing them by emitting a `v<N+1>` of the reviewed artifact."
- "Two competing spec candidates exist at `v2-stricter-auth-spec.md` and `v2-impl-ready-auth-spec.md` — consider running `merge-artifacts-interactive` to reconcile them into a promoted `v3`."
- "Implementation commits land on `<current-branch>` but no review has run yet — consider invoking `review-implementation-interactive` against the implementation diff + the source plan."
- "The thread looks complete to you — consider invoking `finish` to walk the closure question (merge / PR / leave as is)."

The chat reply may include one or two clarifying questions if the advisory pass surfaces ambiguity the skill cannot resolve from the thread alone — but the primary content is the 2–4 suggestions.

## Optional Inbox Capture

AFTER surfacing the 2–4 suggestions, the skill MAY ask the user whether to save any of them as Inbox items for later. This is the ONLY artifact-writing path this skill exposes, and it is GATED ON EXPLICIT USER OPT-IN per NAV-02, D105.

Rules:

- **Default OFF.** The skill does NOT capture by default. The chat suggestions stay in chat. The user must affirmatively opt IN.
- **The opt-in MUST be explicit.** Suggested phrasing (executor discretion): "Want to save any of these as Inbox items for later?" / "Should I park any of these in `inbox/open/`?" The user's response must be an affirmative explicit acceptance — silence, ambiguity, or "maybe later" does NOT constitute opt-in.
- **On opt-in, route to `skills/capture-inbox/SKILL.md`.** The skill itself does NOT bypass `capture-inbox`. The capture happens via `capture-inbox`, which applies its own `## Capture Trigger` rules (interactive ask-first vs. autonomous auto-capture), constructs the artifact at `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` per `docs/workflow/v1/filename-grammar.md`, and confirms back to the user. This skill does NOT reimplement `capture-inbox`'s logic.
- **On opt-out (or no response).** No inbox item is written. The suggestions stay in chat only. The skill exits cleanly without any file write.
- **No auto-capture, no default capture, no capture without affirmative user consent.** The skill is advisory by default; the inbox-capture path is opt-in by design.

The user may want to opt in to capturing ONE suggestion (e.g., "save the merge-artifacts suggestion as an inbox item so I remember to do it next week") while ignoring the others. Each per-suggestion opt-in is independent. The user may also opt in to capturing the entire suggestion list — in which case the skill routes to `capture-inbox` once per saved suggestion.

## Thin Body OK Per D33

This skill is allowed to be THIN per D33, NAV-03. The V1 body MAY explicitly point the agent at the canonical README hybrid (forthcoming in Plan 07-03 of Phase 7) for the full workflow map (toolbox model + layered map + recommended paths + per-module catalog) and instruct the agent to read that guidance BEFORE advising. The body is not required to duplicate the README's workflow map.

When the README hybrid lands (Plan 07-03), the skill body may add a one-line pointer: "For the full V1 workflow map (toolbox model + layered spine + recommended common paths + per-module catalog), read the canonical README hybrid at `<repo-root>/README.md` before advising." Until the hybrid README ships, the skill relies on the V1 reference docs cited above (`docs/workflow/v1/README.md`, `docs/workflow/v1/thread-layout.md`, `docs/workflow/v1/filename-grammar.md`, `docs/workflow/v1/immutability.md`) plus the per-skill descriptions inside each `skills/<skill-name>/SKILL.md` for advisory grounding.

The thin-OK rule per D33 is what makes this skill V1-viable without duplicating the README's content — D33 explicitly says: "Skills that are essentially pointers to canonical guidance may be thin." `whats-next` is the canonical case for D33: an advisory skill that derives most of its content from the workflow map maintained outside the skill body.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If the thread is ambiguous (multiple roots, none clearly active), ASK the user per `## Inputs` above. Do NOT pick silently per `docs/workflow/v1/immutability.md`.

2. **Capture any user hint.** If the user passed an explicit hint about what they are trying to figure out, hold it as supplementary framing for the advisory pass. If no hint was passed, run the default thread-context pass.

3. **Inspect the V1 folders + recent commits per `## Thread Inspection`.** Read READ-ONLY. Enumerate non-empty folders by artifact count. Sample recent commits on the current branch. Note any obvious signals (open inbox items count, conflict markers in artifacts, two competing variants at the same target version, etc.).

4. **Compose 2–4 chat suggestions tied to observable signals.** Each suggestion cites a V1 skill that would execute the action. Apply the Anti-Sycophancy Stance when warranted — if the user's hint conflicts with what the thread shows, surface the conflict in the suggestion list rather than rubber-stamping the hint.

5. **Present the suggestions in chat.** The chat reply is the deliverable. No artifact is written.

6. **ASK (optional) whether to save any suggestion as an Inbox item.** If YES with explicit opt-in, route to `skills/capture-inbox/SKILL.md` (one route per saved suggestion). If NO (or silent), STOP — exit cleanly with no file write.

7. **Final state.** The chat reply with suggestions IS the artifact-equivalent. If the user opted in to capture, the inbox items written by `capture-inbox` are the persistent artifacts; this skill itself wrote nothing. No closing remark.

## Commit Policy

This skill writes no artifacts by default and so does NOT commit anything. If the user opts IN to capture via `skills/capture-inbox/SKILL.md`, `capture-inbox` handles its own commit policy (which is ALSO never auto-commit per Phase 2 `capture-inbox` rules — the inbox item is written but not committed; any commit is the surrounding session's decision).

This skill itself does NOT stage, does NOT commit, does NOT push, does NOT branch, does NOT merge. It runs entirely in advisory mode.

## Immutability

This skill reads thread artifacts READ-ONLY per `docs/workflow/v1/immutability.md`. The Thread Inspection pass reads artifacts under `proposals/`, `specs/`, `plans/`, `discussions/`, and `inbox/open/` but does NOT edit them, does NOT rewrite them, does NOT add frontmatter to them, does NOT propose edits to their bodies during inspection.

The chat reply containing the 2–4 suggestions is EPHEMERAL — not a V1 artifact, not committed to git, not part of the thread's reviewable history. If the user wants any suggestion preserved, the opt-in path via `skills/capture-inbox/SKILL.md` is the durable mechanism (an inbox item under `inbox/open/` is the persistent record).

The skill does NOT modify inbox state. It does NOT move items from `inbox/open/` to `inbox/processed/` or `inbox/dropped/`. Inbox state transitions are manual file moves performed outside this skill, by design per `docs/workflow/v1/thread-layout.md` ("State by Folder" / "emitted artifacts are immutable; status is a property of the folder, not of the file").

No source-relation YAML frontmatter is added to any inbox item the skill routes to capture — `skills/capture-inbox/SKILL.md` itself controls the inbox-item body (mandatory `**Why:**` first line, free-form context after). This skill provides the framing that prompts the user to opt in; `capture-inbox` owns the resulting artifact.

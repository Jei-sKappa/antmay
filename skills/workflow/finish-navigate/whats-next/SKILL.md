---
name: whats-next
description: Inspect the active thread's artifacts and recent commits, then suggest 2–4 coherent next actions in chat. Use when you want to figure out what to do next — you just finished a phase, you have open inbox items you're unsure about, the thread feels stuck, or you simply want a quick map of where you are.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.1.0
---

# What's Next

Inspect the current thread context — what artifacts exist under `proposals/`, `specs/`, `plans/`, `discussions/`, `inbox/open/` and what recent commits live on the current branch — and suggest 2–4 coherent next actions IN CHAT. The chat reply IS the deliverable. The skill writes NO artifact by default; only on explicit user opt-in does it offer to save a suggestion as an Inbox item for later.

## Anti-Sycophancy Stance

Your job is to help the user identify the right next action given the current thread context, not to make them feel good about whatever they suggest. Treat the advisory pass as a mutual attempt to get closer to the truth: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a costly failure mode here — recommending a "next action" that ignores the open inbox items, the unaddressed review-findings, or the obvious blocker the thread has surfaced is worse than admitting the thread is stuck and the user needs to address those signals first.

The skill is ADVISORY, not opinion-driven: there is NO stage-specific amplifier. The skill's role is to inspect, recognize, and suggest — not to argue against settled work. The cheap moment to push back is when the user is about to take a next action that ignores a clear signal in the thread (an open blocker review-finding, an uncommitted change, an unresolved conflict marker, a phase that has not been done yet).

Hold these together:

- **Disagree when you disagree.** If the user's hint or implicit assumption about what to do next conflicts with the evidence in the thread (e.g., "I think we should implement the plan" while there is no plan artifact yet, or "let's move to review" while the implementation has not been committed), say so plainly before suggesting next actions. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user dismisses an obvious signal — "the inbox items don't matter", "the review-findings are nits", "we'll address the conflict marker later" — name the gap, surface the substance, and bring it into the suggestions. The signal is in the thread for a reason.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, the phase the user skipped — raise them, even if the user wants to move on. Better captured in the suggestion list than rediscovered when the next phase wedges.
- **Take the user's input seriously.** If they push back, add context, or challenge your reading of the thread, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument. ("The open inbox items are V2 deferrals, not blockers for the next action" is real information.)
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never drop a suggestion just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see the next action differently, identify the exact assumption or value judgment causing the split, then resolve THAT before settling on a suggestion list.
- **Refuse to log a suggestion you believe is wrong without flagging it.** If the user insists on capturing as an Inbox item a suggestion you believe is built on a flawed assumption, proceed with the capture per the user's explicit consent (the skill does not bypass user choice), but include the dissent in the chat reply BEFORE capturing. The capture goes through — the trail records the dissent for whoever reads the inbox item next.
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

**Ambiguity fallback:** if the active thread is ambiguous (multiple thread roots exist, none clearly active; or `cwd` is not inside any thread root and multiple plausible candidates live in `docs/threads/`), ASK the user which thread to advise on. Do NOT pick by recency. Do NOT pick by sort order. Do NOT pick by any heuristic — silently picking would hide a real navigation decision (which thread the user is actually in) behind a sort order.

The thread itself is the input — what artifacts exist, where the commits sit, what is open in the inbox. The hint is supplementary.

## Thread Inspection

This skill inspects the active thread READ-ONLY. Nothing is edited during inspection — no artifact frontmatter, no artifact bodies, no folder structures, no inbox state transitions. The skill does NOT move items from `inbox/open/` to `inbox/processed/` or `inbox/dropped/`; inbox state transitions are manual file moves by design. The skill does NOT write any artifact during inspection.

The skill inspects:

1. **Active thread root** at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If the thread is ambiguous (multiple candidates, none clearly active), ASK per `## Inputs` above.

2. **Folder set** under the active thread root. Report which folders have content and which are empty:
   - `proposals/` — emitted proposal artifacts.
   - `specs/` — emitted spec artifacts.
   - `plans/` — emitted plan artifacts.
   - `discussions/` — emitted discussion and decision-log artifacts.
   - `inbox/open/` — open inbox items and review-finding records still awaiting triage.

   Enumerate non-empty folders by artifact count. Folder presence and artifact counts are the primary signal — they indicate which phases of the workflow have been completed and which remain.

3. **Recent commits on the current branch.** Suggested invocation: `git log --oneline -5` (or `-10`; the cap is at executor discretion — the purpose is signal, not audit). The commit history is the implementation audit trail; recent commits tell the skill whether implementation work has landed since the last artifact in `plans/` was emitted.

The skill READS artifacts and folder structures READ-ONLY — does NOT edit anything during inspection. Emitted artifacts are immutable: the inspection pass reads the thread's history without modifying it.

## Chat-First Answer

The skill's PRIMARY output is a CHAT reply with 2–4 suggested next actions:

- The chat reply IS the deliverable.
- The skill NEVER writes an artifact by default. The 2–4 suggestions stay in the chat — no file is written, no decision log appended, no inbox item captured. The default is zero file writes.
- Each suggestion SHOULD name the workflow action that would execute it (e.g., "draft the plan", "run a spec review", "merge the two competing artifacts", "capture this as an inbox item"). Naming the action gives the user a concrete handle on what to do next.
- The chat answer is FREEFORM markdown — no rigid template, no required sections, no fixed length. The suggestion count cap is 2–4 to keep the advisory pass narrow and decision-shaped; suggesting 10 next actions defeats the purpose.

Each suggestion follows a loose shape (executor discretion on prose; the substance is what matters):

- A one-sentence statement of the suggested action, tied to an observable thread signal (NOT speculative; NOT "you could do X" in the abstract — "you have an emitted spec at <path> and no plan yet — consider drafting the plan").
- The workflow action that would execute it.
- A one-clause justification — what in the thread context supports this suggestion.

Example chat suggestions (illustrative — the skill produces NEW suggestions tied to the actual thread state inspected, not these examples):

- "You have an emitted spec at `specs/260520120000Z-v1-auth-spec.md` and no plan yet — consider drafting the plan next (agent-leaning or human-leaning depending on your preference)."
- "`inbox/open/` has 3 unaddressed review-finding records — consider walking them point-by-point in a discussion, or addressing them by emitting a new version of the reviewed artifact."
- "Two competing spec candidates exist at `v2-stricter-auth-spec.md` and `v2-impl-ready-auth-spec.md` — consider merging them into a promoted `v3` to resolve the ambiguity."
- "Implementation commits land on `<current-branch>` but no review has run yet — consider reviewing the implementation diff against the source plan before moving forward."
- "The thread looks complete — consider walking the closure question (merge / PR / leave as is) to wrap it up."

The chat reply may include one or two clarifying questions if the advisory pass surfaces ambiguity the skill cannot resolve from the thread alone — but the primary content is the 2–4 suggestions.

## Optional Inbox Capture

AFTER surfacing the 2–4 suggestions, the skill MAY ask the user whether to save any of them as Inbox items for later. This is the ONLY artifact-writing path this skill exposes, and it is GATED ON EXPLICIT USER OPT-IN.

Rules:

- **Default OFF.** The skill does NOT capture by default. The chat suggestions stay in chat. The user must affirmatively opt IN.
- **The opt-in MUST be explicit.** Suggested phrasing (executor discretion): "Want to save any of these as Inbox items for later?" / "Should I park any of these in `inbox/open/`?" The user's response must be an affirmative explicit acceptance — silence, ambiguity, or "maybe later" does NOT constitute opt-in.
- **On opt-in,** write an inbox item under `docs/threads/<thread>/inbox/open/` named `<UTC>-<kebab-desc>-inbox-item.md`. The item body begins with a mandatory `**Why:**` line summarising the suggestion, followed by any relevant context from the thread inspection. Confirm back to the user once written.
- **On opt-out (or no response).** No inbox item is written. The suggestions stay in chat only. The skill exits cleanly without any file write.
- **No auto-capture, no default capture, no capture without affirmative user consent.** The skill is advisory by default; the inbox-capture path is opt-in by design.

The user may opt in to saving ONE suggestion (e.g., "save the merge suggestion as an inbox item so I remember it next week") while ignoring the others. Each per-suggestion opt-in is independent. The user may also opt in to saving the entire suggestion list — write one inbox item per saved suggestion.

## Workflow

1. **Resolve the active thread.** Identify the thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If the thread is ambiguous (multiple roots, none clearly active), ASK the user per `## Inputs` above. Do NOT pick silently.

2. **Capture any user hint.** If the user passed an explicit hint about what they are trying to figure out, hold it as supplementary framing for the advisory pass. If no hint was passed, run the default thread-context pass.

3. **Inspect the folders + recent commits per `## Thread Inspection`.** Read READ-ONLY. Enumerate non-empty folders by artifact count. Sample recent commits on the current branch. Note any obvious signals (open inbox items count, conflict markers in artifacts, two competing variants at the same target version, etc.).

4. **Compose 2–4 chat suggestions tied to observable signals.** Each suggestion names the action that would execute it. Apply the Anti-Sycophancy Stance when warranted — if the user's hint conflicts with what the thread shows, surface the conflict in the suggestion list rather than rubber-stamping the hint.

5. **Present the suggestions in chat.** The chat reply is the deliverable. No artifact is written.

6. **ASK (optional) whether to save any suggestion as an Inbox item.** If YES with explicit opt-in, write inbox items per `## Optional Inbox Capture` (one item per saved suggestion). If NO (or silent), STOP — exit cleanly with no file write.

7. **Final state.** The chat reply with suggestions IS the deliverable. If the user opted in to capture, the inbox items are the persistent artifacts; this skill itself wrote nothing beyond those. No closing remark.

## Commit Policy

This skill writes no artifacts by default and so does NOT commit anything. If the user opts IN to capture, the resulting inbox item is written to disk but NOT committed; any commit is the surrounding session's decision.

This skill itself does NOT stage, does NOT commit, does NOT push, does NOT branch, does NOT merge. It runs entirely in advisory mode.

## Immutability

The Thread Inspection pass reads artifacts under `proposals/`, `specs/`, `plans/`, `discussions/`, and `inbox/open/` READ-ONLY — does NOT edit them, does NOT rewrite them, does NOT add frontmatter to them, does NOT propose edits to their bodies during inspection.

The chat reply containing the 2–4 suggestions is EPHEMERAL — not a committed artifact, not part of the thread's reviewable history. If the user wants any suggestion preserved, the opt-in capture path is the durable mechanism (an inbox item under `inbox/open/` is the persistent record).

The skill does NOT modify inbox state. It does NOT move items from `inbox/open/` to `inbox/processed/` or `inbox/dropped/`. Inbox state transitions are manual file moves; status is a property of the folder, not of the file.

No YAML frontmatter beyond the mandatory fields is added to inbox items this skill writes. The inbox item body starts with a `**Why:**` line and free-form context after — nothing else.

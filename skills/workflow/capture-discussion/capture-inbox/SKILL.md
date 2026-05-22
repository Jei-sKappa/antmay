---
name: capture-inbox
description: Capture a thread-local Inbox item from any context when a side-finding, follow-up, or deferred idea needs to be parked under the active thread's `inbox/open/` folder without derailing the current task.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.2
---

# Capture Inbox

Park a side-finding under the active thread as a short markdown record at `inbox/open/<UTC>-<kebab-desc>-inbox-item.md`. Use this whenever something worth remembering surfaces during work but acting on it would derail the current task.

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and the active one is ambiguous, see `## Ambiguous Thread Resolution` below. If no thread exists, see the same section.
2. **Decide whether to ask first.** Apply the trigger rule in `## Capture Trigger`. In an interactive session, ASK the user before capturing. In an autonomous / AFK / scripted run, AUTO-CAPTURE without prompting.
3. **Draft the `**Why:**` line.** One sentence explaining why this is being captured. The `**Why:**` line is mandatory — see `## Inbox Item Format`.
4. **Derive the slug.** Short kebab-case description of the captured item, taken from the `**Why:**` line. In an interactive run, you may ASK the user for a slug. In an autonomous run, pick the first 3–5 meaningful words of the `**Why:**` line and kebab-case them (drop articles and filler).
5. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.
6. **Write the artifact.** Create `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md`. The artifact-type suffix `inbox-item` is MANDATORY. The `inbox/open/` folder is created on-demand if it does not yet exist.
7. **Confirm.** Tell the user: `Inbox item captured: <relative-path-to-the-file>`. Nothing else — no summary, no closing remark.

## Capture Trigger

The skill behavior is gated on whether the run is user-active or autonomous:

| Session shape                                                          | Behavior                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------- |
| Interactive — human in the loop, user-active                           | ASK the user before capturing                           |
| Autonomous — AFK, scripted, unattended, or invoked by another agent    | AUTO-CAPTURE without prompting                          |

The skill does not detect runtime programmatically. The agent decides which branch applies based on its session context — whether a human is present to answer, whether the invocation was unattended, whether the skill is being called from another autonomous skill, etc. When uncertain, treat the run as interactive and ask.

## Inbox Item Format

The body of an Inbox item is free-form short markdown. There is no rigid template.

**The first line of the body MUST be a `**Why:**` line** — one sentence explaining why this is captured. After the `**Why:**` line, the author writes whatever free-form context is useful: links, code excerpts, blockquotes, follow-up questions, repro steps. No prescribed sections, no length cap, no checklist.

Copy-paste-adapt example:

```markdown
**Why:** The OAuth redirect drops the `state` param on Safari; surfaced while wiring the login flow but not in scope for this task.

Repro: open `/login` in Safari 17.4, click "Continue with Google", land back at `/?code=...` with no `state`. Chrome 124 carries the param through.

Worth checking whether the Safari ITP cookie partitioning is rewriting the redirect URL.
```

## State by Folder

Inbox state is reflected ONLY by the three subfolders:

- `inbox/open/` — items still awaiting triage
- `inbox/processed/` — items addressed
- `inbox/dropped/` — items intentionally discarded

There is NO Backlog primitive. There is NO priority field, NO owner field, NO assignee, NO labels, NO due date. Do not invent or accept any such metadata in the artifact body or frontmatter — the body has no frontmatter at all.

The skill writes to `inbox/open/` exclusively. Transitions to `processed/` or `dropped/` are manual file moves performed outside this skill, by design — emitted artifacts are immutable; status is a property of the folder, not of the file. Never edit a captured inbox item in place; create a new one if the content needs to change.

## Ambiguous Thread Resolution

If no thread root exists in or above the current `cwd`:

- In an interactive run, ASK the user where to create the thread. Accept either an existing thread root path or a fresh slug to create a new one.
- In an autonomous run where context makes the slug obvious (e.g., the calling agent has a clear feature name in its prompt), auto-create a thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. Otherwise ask.

If multiple thread roots exist and which one is "active" is ambiguous (more than one plausible candidate, no clearly current run), ASK the user which thread is intended. Do NOT silently pick "the most recent UTC stamp" or "the last edited folder" — there is no global "latest artifact" algorithm, and silently picking would hide the real decision behind a heuristic.

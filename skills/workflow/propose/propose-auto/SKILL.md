---
name: propose-auto
description: Turn a rough prompt (or a referenced artifact) into a freeform proposal markdown file under the active V1 thread's `proposals/` folder, end-to-end, with no clarifying questions. Use when you already know what you want and just need the proposal written down — not when you want to think it through together (use `propose-interactive` for that).
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Propose Auto

Turn a rough prompt or referenced input into a freeform proposal artifact under the active V1 thread's `proposals/` folder. This skill is the autonomous generator half of the V1 propose pair — it reads input, writes the proposal end-to-end, and confirms the artifact path. It does not ask clarifying questions, it does not interview the user point-by-point, and it does not commit. For the collaborative walk-through, use the sibling skill `propose-interactive` instead.

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` per `docs/workflow/v1/thread-layout.md`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user per `docs/workflow/v1/immutability.md` ("Ambiguous Reference Resolution") — do not silently pick the most recent UTC stamp. If no thread exists, ASK the user where to create one OR auto-create when the calling context makes the slug obvious (e.g., a clear feature name is already in the prompt).

2. **Derive the slug.** Pull a short kebab-case description from the user's rough prompt — drop articles and filler, keep the first 3–5 meaningful words. The slug is part of the filename and is not user-confirmed in auto mode; the prompt is treated as authoritative.

3. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time per `docs/workflow/v1/filename-grammar.md`. Stamp once and reuse — never re-derive after writing.

4. **Draft the body.** Use the SUGGESTED 4-element structure below (see `## Suggested Structure`). The structure is suggested, not enforced — adapt as the prompt warrants. If the prompt clearly carries only two of the four elements, write only those two. If the prompt is shaped differently, follow its shape. A short freeform proposal is preferred over a padded template.

5. **Write the artifact.** Create `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`. The `proposal` artifact-type suffix is MANDATORY per `docs/workflow/v1/filename-grammar.md`. The `proposals/` folder is created on-demand per `docs/workflow/v1/thread-layout.md` ("On-Demand Creation") — do not pre-create it.

6. **Confirm.** Tell the user: `Proposal written: <relative-path-to-the-file>`. Nothing else — no preamble, no summary, no closing remark.

## Suggested Structure

The proposal body is freeform markdown. There is no required template and no required heading set. As a default starting point, four elements tend to make a proposal useful to a downstream reader. They are SUGGESTED — adapt as needed; this is not a template, not mandatory, and not enforced:

1. **Intent** — what this proposal is trying to do, in one or two sentences.
2. **Context** — why it is being raised now; what came before; what triggered the idea.
3. **Rough shape** — an early sketch of what the change might look like. Not a spec. Not a design. A first sketch worth reacting to.
4. **Open questions** — what is unresolved, what needs a decision later, what is worth flagging upfront so a reader does not assume it is settled.

A proposal that captures only intent and rough shape is fine. A proposal that adds a fifth element (constraints, prior art, alternatives weighed) is fine. The skill's job is to write what is useful, not to fill out a form.

Do NOT add YAML frontmatter to the proposal body. The filename is the identifier; the body is plain markdown.

## Filename and Folder

The proposal artifact uses the V1 record-form filename grammar:

```text
<YYMMDDHHMMSSZ>-<kebab-desc>-proposal.md
```

The 12-character UTC stamp comes first, followed by a kebab-case description, followed by the literal `proposal` artifact-type token, followed by `.md`. See `docs/workflow/v1/filename-grammar.md` for the canonical grammar and the recognized artifact-type list.

Example:

```text
260521120000Z-onboarding-friction-proposal.md
```

The file lands at `docs/threads/<thread>/proposals/<filename>` per `docs/workflow/v1/thread-layout.md`. The `proposals/` folder is created on-demand on the first proposal written for the thread; do not pre-create empty folders.

## Commit Policy

This skill NEVER auto-commits the proposal artifact. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

## Immutability

Emitted proposal artifacts are immutable per `docs/workflow/v1/immutability.md`. Once the file is written into `proposals/`, it is part of the thread's reviewable history and is not edited. To revise an emitted proposal, write a new artifact — a new record with a different slug, or a follow-up proposal that supersedes the prior one by content. No source-relation frontmatter is added — lineage lives in filenames and the surrounding thread, not in metadata on the file.

Drafts under `docs/threads/<thread>/.wip/` are editable until emission. Once the proposal lands in `proposals/`, the lock applies.

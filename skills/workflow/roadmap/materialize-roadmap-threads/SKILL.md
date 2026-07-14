---
name: materialize-roadmap-threads
description: Turn a roadmap's child briefs into child threads idempotently — create a thread for each brief that has no materialized reference, skip and verify the ones that do, and stamp each new thread's reference back into its brief; use when a roadmap.md is settled and its children need opening on disk.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Materialize Roadmap Threads

Read a parent thread's `roadmap.md` child briefs and open the child threads they describe. You create one thread per brief that has no thread yet, delegate the normalized folder-and-file creation to `/create-thread`, and record each created thread's reference back into its brief. This is a repeatable operation: running it again after a partial run finishes the remaining briefs and touches nothing already done.

## Inputs

Work inside one parent thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` that contains a `roadmap.md`. If `cwd` already sits inside such a thread, that is the parent; if several exist and which is active is ambiguous, ASK — never silently pick the most recent stamp.

Read the parent's `roadmap.md` and locate its `### C<N>:` child briefs. Each brief carries a title, `Outcome`, `Context`, `Scope and boundaries`, `Dependencies`, `Relevant shared constraints`, and a `Suggested workflow`, and may carry a `Materialized thread:` line.

## Idempotent loop over the child briefs

Process each `C<N>` brief in turn:

- **Brief without a `Materialized thread:` line** — create its child thread (below), then stamp the reference back into the brief.
- **Brief with a `Materialized thread:` line** — skip creation and verify that the referenced thread-root folder exists on disk. If it exists, leave the brief untouched. If it does not, this is a dangling reference: report it to the user and move on. Never recreate the child silently and never overwrite an existing `Materialized thread:` value.

## Create a child thread

Delegate creation to `/create-thread`, supplying a complete **caller-authorization block** with every normalized field:

- **Operation** — `/materialize-roadmap-threads`.
- **Slug** — a short kebab-case slug derived from the child title.
- **Title** — the child title from the brief.
- **Genesis narrative** — a self-contained account assembled from the brief's `Outcome`, `Context`, `Scope and boundaries`, `Dependencies` (stated as the inputs the child consumes), and `Relevant shared constraints`, written so a reader with no chat history understands why the child exists and what it must produce.
- **Suggested workflow** — the brief's `Suggested workflow` text copied **verbatim**. Copy it exactly as written; never re-resolve it against a workflow template, even when the text reads like the expansion of a built-in workflow name. The brief already holds the complete sequence — reproduce it, do not regenerate it.
- **Conditional metadata** — `Parent:` set to the parent thread's repo-relative thread-root directory path (the folder, for example `docs/threads/260714093000Z-auth-boundary/`, never a file inside it) and `Roadmap brief:` set to this brief's `C<N>` identifier. State explicitly that `External:` and `Supersedes:` do not apply.

`/create-thread` allocates the timestamped folder, writes `seed.md` from these fields, and eagerly creates a header-only `decisions.md`, then returns the created thread's folder path. Do not fabricate that path or write the files yourself.

## Stamp the reference back into the brief

Immediately after `/create-thread` returns a folder path, add a `Materialized thread:` line to the brief just created, directly under its `### C<N>:` heading, with the value set to the returned repo-relative thread-root directory path (the folder, e.g. `docs/threads/260714093000Z-auth-boundary/`).

Adding this line is the only edit this operation ever makes to `roadmap.md`. It is factual evidence that the child was created — never a status, progress, or completion marker. Add it the moment creation succeeds, so an interrupted run leaves every already-created child correctly referenced.

## Missing or unusable suggested workflow

A brief whose `Suggested workflow` is absent or unusable cannot be materialized as written.

- **Interactively**, ask the user for the workflow text to use for that child, then proceed.
- **Under an explicit AFK invocation**, do not invent a workflow: record the unresolved brief, skip it, continue with the remaining briefs, and include every skipped brief in the final report.

Never substitute a default workflow, infer one from the child's subject, or resolve a bare name against a workflow template.

## Recording decisions and blocking

Any genuine human decision you obtain while materializing — an answer that settles product or workflow intent — is appended to the parent thread's `decisions.md` as a normal Decision Record **before** you rely on it. Trivial input clarifications (which brief, which name was meant) need no record.

Under an explicit AFK invocation, do not invent intent to fill a gap. When materialization is blocked on a decision only a human can settle, hand the open decision(s) to `/emit-pending-decisions` as one bundle — giving it `/materialize-roadmap-threads` as the producer, `roadmap.md` as the target, the evidence you weighed, the open decision(s), and a suggested follow-up (settle the decisions, then materialize again) — and continue with any briefs that are not blocked.

## Boundaries

- **Create only what a brief defines.** Never open a child thread that no `C<N>` brief describes.
- **Never track child status.** You add factual `Materialized thread:` references and nothing else — no checkboxes, progress, owners, or completion state, and you do not become a coordinator that watches children after creation.
- **Never edit sibling threads.** You create child threads and stamp references into the parent's `roadmap.md`; you do not modify any other thread's contents.
- **Never delete or rewrite briefs.** The child briefs are inputs. You append a `Materialized thread:` line and change nothing else about them.

## Report

This is a completion-oriented operation, not a dialogue. After the loop, report concisely which children you created (with their thread paths), which briefs you skipped and why (already materialized, dangling reference, or unresolved workflow), and any pending-decision bundle you emitted. No preamble, no closing remark.

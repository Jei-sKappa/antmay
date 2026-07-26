---
name: materialize-roadmap-threads
description: Turn a roadmap's child briefs into child threads idempotently — create a thread for each brief that has no materialized reference, skip and verify the ones that do, and stamp each new thread's reference back into its brief; use when a roadmap.md is settled and its children need opening on disk.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.1.0
---

# Materialize Roadmap Threads

Read a parent thread's `roadmap.md` child briefs and open the child threads they describe. You create one thread per brief that has no thread yet, delegate the normalized folder-and-file creation to `/allocate-thread`, and record each created thread's reference back into its brief. This is a repeatable operation: running it again after a partial run finishes the remaining briefs and touches nothing already done.

## Inputs

This operation runs a complete read-only preflight before any substantive execution — before it allocates any child thread or writes anything. Every preflight failure writes nothing, creates no child, emits no bundle, and ends `Outcome: REFUSED — <reason and how to re-invoke>`. Resolving the parent is the first preflight gate: work inside one parent thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/` that contains a `roadmap.md`. If `cwd` already sits inside such a thread, that is the parent. Refuse when no such thread exists, or several exist and which is active is ambiguous (never silently pick the most recent stamp). If the resolved thread has no `roadmap.md`, there is nothing to materialize: end with `Outcome: REFUSED — no roadmap.md to materialize`.

Read the parent's `roadmap.md` and locate its `### CB<N>:` child briefs. Each brief carries a title, `Outcome`, `Context`, `Scope and boundaries`, `Dependencies`, and `Relevant shared constraints`, and may carry a `Materialized thread:` line.

## Preflight every brief before allocating any child

After the parent and its `roadmap.md` resolve, validate the whole run read-only before the first `/allocate-thread` call — read the roadmap and every child brief the run will materialize, and check each one. This is a single up-front gate: no child thread is allocated and nothing is written until every selected brief passes.

For each `CB<N>` brief the run will materialize, validate:

- **Brief identity** — a well-formed `### CB<N>:` heading with a title.
- **Required fields** — `Outcome`, `Context`, `Scope and boundaries`, `Dependencies`, and `Relevant shared constraints` are present and usable.
- **Existing materialization references** — read each brief's `Materialized thread:` line where present, so the run knows which briefs to create and which to verify.

If any selected brief fails any check, refuse the entire run — the preflight-failure consequence from `## Inputs` — with a reason that names which brief failed which check and how to fix it. Refusing up front is what prevents creating an early child and only then discovering a later malformed brief.

`/allocate-thread` is assumed present as part of the installed suite; do not add availability detection or a fallback implementation for it.

## Idempotent loop over the child briefs

Only after preflight passes (`## Preflight every brief before allocating any child`), process each `CB<N>` brief in turn:

- **Brief without a `Materialized thread:` line** — create its child thread (below), then stamp the reference back into the brief.
- **Brief with a `Materialized thread:` line** — skip creation and verify that the referenced thread-root folder exists on disk. If it exists, leave the brief untouched. If it does not, this is a dangling reference: report it to the user and move on. Never recreate the child silently and never overwrite an existing `Materialized thread:` value.

## Create a child thread

Delegate creation to `/allocate-thread`, supplying a complete **caller-authorization block** with every normalized field:

- **Operation** — `/materialize-roadmap-threads`.
- **Slug** — a short kebab-case slug derived from the child title.
- **Title** — the child title from the brief.
- **Genesis narrative** — a self-contained account assembled from the brief's `Outcome`, `Context`, `Scope and boundaries`, `Dependencies` (stated as the inputs the child consumes), and `Relevant shared constraints`, written so a reader with no chat history understands why the child exists and what it must produce.
- **Conditional metadata** — `Parent:` set to the parent thread's repo-relative thread-root directory path (the folder, for example `docs/threads/260714093000Z-auth-boundary/`, never a file inside it) and `Roadmap brief:` set to this brief's `CB<N>` identifier. State explicitly that `External:` and `Supersedes:` do not apply.

`/allocate-thread` allocates the timestamped folder, writes `seed.md` from these fields, and eagerly creates a header-only `decisions.md`, then returns the created thread's folder path. Do not fabricate that path or write the files yourself.

## Stamp the reference back into the brief

Immediately after `/allocate-thread` returns a folder path, add a `Materialized thread:` line to the brief just created, directly under its `### CB<N>:` heading, with the value set to the returned repo-relative thread-root directory path (the folder, e.g. `docs/threads/260714093000Z-auth-boundary/`).

Adding this line is the only edit this operation ever makes to `roadmap.md`. It is factual evidence that the child was created — never a status, progress, or completion marker. Add it the moment creation succeeds, so an interrupted run leaves every already-created child correctly referenced.

## Blocked

Both blocked paths are reachable only after preflight has passed and materialization has begun — substantive execution. Preflight defects (an unresolved parent, a missing `roadmap.md`, or any malformed selected brief) are refusals, not this path.

When materializing is blocked on a genuine human decision only a person can settle — an answer that settles product or workflow intent discovered after materialization begins — do not invent the intent and do not stall waiting in chat. There is no separate interactive path and no check for whether a person is present; behavior is identical however the skill is invoked. Hand the open decision(s) to `/emit-pending-decisions` as one bundle — giving it `/materialize-roadmap-threads` as the producer, `roadmap.md` as the target, the evidence you weighed, the originating user request, the open decision(s), and a suggested follow-up (settle the decisions, then materialize again). Because this operation is an idempotent loop, continue with any briefs that are not blocked; a later run finishes the ones that were. End with `Outcome: BLOCKED — pending decisions at <bundle path>`.

An unfixable operational defect encountered after preflight — an allocation or runtime failure the run cannot repair on its own — ends the run `BLOCKED` with a diagnosis of what failed and no decision bundle.

## Boundaries

- **Create only what a brief defines.** Never open a child thread that no `CB<N>` brief describes.
- **Never track child status.** You add factual `Materialized thread:` references and nothing else — no checkboxes, progress, owners, or completion state, and you do not become a coordinator that watches children after creation.
- **Never edit sibling threads.** You create child threads and stamp references into the parent's `roadmap.md`; you do not modify any other thread's contents.
- **Never delete or rewrite briefs.** The child briefs are inputs. You append a `Materialized thread:` line and change nothing else about them.

## Report

This is a completion-oriented operation, not a dialogue. A preflight defect ends the run before this point with `Outcome: REFUSED — <the defect and how to fix it>`. Otherwise, after the loop, report concisely which children you created (with their thread paths), which briefs you skipped and why (already materialized, or a dangling reference), and any pending-decision bundle you emitted. End with the standard terminal line: `Outcome: BLOCKED — <pointer>` when a decision bundle was emitted for a blocked brief (pending decisions at its path) or an unfixable operational defect halted the run (with a diagnosis), otherwise `Outcome: DONE — <children created and briefs skipped summary>`. No preamble, no closing remark.

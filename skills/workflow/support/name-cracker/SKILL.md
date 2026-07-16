---
name: name-cracker
description: Generate name candidates for a project, product, or tool by fanning out one generator subagent per naming-strategy category and merging the results into a single shortlisted file; use when the user wants to explore names broadly and pick a favorite.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.1.0
---

# Name Cracker

Run a broad, structured name search for the thing the user wants to name. This skill is the orchestrator role: it interviews the user into a naming brief, writes one shared generator brief file to the run's scratch directory, spawns one generator subagent per naming-strategy file under `references/categories/` — each pointed at the shared brief instead of receiving it verbatim — verifies every generator's candidate file on disk, merges them with `scripts/merge-candidates.mjs`, curates a shortlist, and delivers one file the user chooses from. The orchestrator never generates names inline — diversity comes from independent contexts, each anchored to a single strategy.

## Subagent capability precondition

This skill REQUIRES a runtime primitive that spawns independent subagents with their own context windows and lets them write files to disk before replying. There is no inline fallback: one context generating every category back-to-back converges on samey names and defeats the fan-out. If the runtime does not support subagents, stop and tell the user this skill cannot run here.

## Inputs

All optional:

- **Output path** — where the deliverable is written. Default: `./name-candidates.md`.
- **Candidates per category** — the maximum each generator may propose. Default: 3.
- **Category subset** — restrict the run to named categories or themes (e.g. "just mythology, metaphors, and puns"), matched against the filenames and H1 titles under `references/categories/`. Default: every category file.

## Procedure

1. **Interview the user.** Generated names are only as good as the understanding of what is being named, so the interview comes before everything else. Open by asking what the thing is and does, then follow up — a few questions at a time, adapting to the answers — until every line below is filled or explicitly empty; skip only lines the invocation already answers:

   - What the thing is and does — two sentences.
   - Audience and register — who encounters the name, and how playful or sober it should read.
   - Hard constraints — length, casing, CLI/package/domain viability, languages or markets that matter.
   - Names to avoid — competitors, near-collisions, past rejects.
   - Sibling names it must sit beside, when it joins an existing family.
   - Origin stories or personal lore the user wants woven in.

   "No constraint" is a valid answer; an invented one is not. Then assemble the answers into the naming brief — one verbatim block — play it back to the user, and proceed only on their confirmation.

2. **Set up the run.** Create the scratch directory with `mktemp -d` and a `candidates/` folder inside it. Resolve the absolute path of this skill's `references/categories/` folder and list its files; apply the category subset when one was given. Write the shared generator brief ONCE to `<scratch>/generator-brief.md`, filling the template in `## Shared generator brief` with the naming brief and the per-category maximum. Pre-compute, per category, the output path `<scratch>/candidates/<category-filename>`.

3. **Fan out the generators.** For every selected category, dispatch one generator subagent whose entire prompt is the three lines in `## Dispatch message` — the shared brief file carries everything else, so the brief is never rewritten per dispatch. Prefer a fast, inexpensive model when the runtime lets you choose — each generator does bounded creative generation, not reasoning. Run AT MOST 5 generators concurrently: dispatch in waves of 5 and wait for a wave before starting the next. When all waves are done, verify on disk, never from reply prose: list `<scratch>/candidates/` and check every selected category against it, confirming each file matches the format pinned in `## Shared generator brief`. The step is complete when every selected category either has a parseable candidate file or is recorded as an empty category; re-dispatch a failed category at most once before recording it empty.

4. **Merge.** Run `node <skill-dir>/scripts/merge-candidates.mjs <scratch>/candidates <output-path>` with absolute paths. The script parses every candidate file, collapses duplicate names case-insensitively while keeping every category attribution, groups the survivors by category, appends the categories that produced nothing, and leaves a `## Brief` and a `## Shortlist` placeholder. If it exits non-zero, read its error, fix the cause (usually a malformed candidate file — repair or drop it), and re-run.

5. **Curate and deliver.** Edit the deliverable: replace the brief placeholder with the naming brief verbatim, and replace the shortlist placeholder with roughly ten names — drawn from different categories — that best satisfy the brief, each kept with its one-line rationale. Then report to the user: the deliverable path, the shortlist inline in chat, and which categories came back empty. The user picks the winner; this skill never picks for them.

## Shared generator brief

Written ONCE per run to `<scratch>/generator-brief.md`, with the placeholders filled by the orchestrator; every generator reads it before its strategy file:

```text
You are generating name candidates for exactly ONE naming strategy, defined by the
strategy file your dispatch message names.

The naming brief for the thing being named:
<the naming brief, verbatim>

Read your strategy file in full — it defines the strategy, its techniques, examples,
and pitfalls. Propose at most <N> names that apply THAT strategy to the brief. Every
name must respect the brief's hard constraints and its avoid list. Fewer than <N> is
correct when the strategy fits the brief poorly; never pad with filler.

Write exactly one file at the output path your dispatch message names, matching this
format exactly — the strategy file's H1 title first, then one bullet per name:

# <the strategy file's H1 title>

- **<Name>** — <one line: how this name applies the strategy to the brief>

Read nothing except this file and your strategy file. Write nothing except the
candidate file. Reply with only the file path and the number of names written.
```

## Dispatch message

Each generator's entire prompt, with all three paths absolute:

```text
Read and follow: <scratch>/generator-brief.md
Strategy file: <absolute path to the category file>
Output path: <scratch>/candidates/<category-filename>
```

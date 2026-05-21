---
name: discussion-loop
description: RETIRED — replaced by the `discussion` skill (open-ended interviews where questions are discovered live) and the `seeded-discussion` skill (walking a predetermined point list with options + recommendation default-on). Use when you find this skill in a legacy install and need to know what to install instead.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Discussion Loop — RETIRED

This skill is **retired**. It was the V1 source for two newer skills and its active behavior has been split between them along the line that always mattered in practice: whether the point list is discovered live or supplied up front. Install one of the replacements below — `discussion-loop` itself no longer drives a conversation.

## Replacements

Pick `discussion` when you want to think a topic through with the agent and questions emerge as the conversation unfolds — options and a recommendation appear only when a concrete decision point lands.

```sh
npx skills add Jei-sKappa/skills --skill discussion
```

Pick `seeded-discussion` when you already have a concrete list of points to settle (review findings, design questions, plan steps) and you want the Decision / What you need to know / Options / Recommendation loop default-on for every point.

```sh
npx skills add Jei-sKappa/skills --skill seeded-discussion
```

## Pre-existing logs

Decision logs previously written by this skill at `docs/discussions/<YYYY-MM-DD>-<topic>-<purpose>-discussion.md` remain valid as-is. Do NOT move them, do NOT rewrite them. The new skills write a different artifact at `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md` per the V1 thread layout; the two log shapes coexist with no migration required.

For V1 thread layout and filename grammar see `docs/workflow/v1/README.md`.

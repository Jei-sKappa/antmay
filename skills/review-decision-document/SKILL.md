---
name: review-decision-document
description: RETIRED — replaced by `review-spec-auto` (autonomous spec review against all 8 D50 semantic-contract elements) and `review-spec-interactive` (collaborative per-element / per-finding walk with anti-sycophancy push-back). Use when you find this skill in a legacy install and need to know what to install instead.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Review Decision Document — RETIRED

This skill is **retired**. It was the V1 source of the handoff-grade-bar review logic — stress-testing a document against the bar that a recipient could deliver the same work the author had in mind. That logic now lives in two newer skills targeted specifically at V1 spec artifacts, checking against the locked Phase 3 spec semantic contract (the eight D50 elements: intended outcome / context / scope-non-scope / expected behavior / constraints / explicit decisions / unresolved questions / acceptance guidance). Install one of the replacements below — `review-decision-document` itself no longer drives a review.

## Replacements

Pick `review-spec-auto` when you want an autonomous, end-to-end handoff-grade-bar review of a V1 spec artifact: it reads the spec, checks all eight D50 elements present and coherent, and writes a six-section findings-first report to `inbox/open/<UTC>-<kebab-desc>-review-finding.md`. No clarifying questions, no per-finding walk.

```sh
npx skills add Jei-sKappa/skills --skill review-spec-auto
```

Pick `review-spec-interactive` when you want to walk the spec review collaboratively — one D50 element or one finding at a time — with the agent ASKING for your view AND TESTING that view against the spec; carries the 4-marker anti-sycophancy stance from `discussion` verbatim plus the review-stance amplifier (push back hard on weak reasoning; never soften findings just because the user pushes back). Writes a decision log to `discussions/` and dumps only unresolved actionable findings to `inbox/open/` at the end.

```sh
npx skills add Jei-sKappa/skills --skill review-spec-interactive
```

## Pre-existing review outputs

Review notes and documents previously produced against decision documents by this legacy skill remain **valid as-is**. Do NOT migrate them. The new skills check against the Phase 3 spec contract specifically, but the legacy framing — that a recipient could deliver the same work the author had in mind — is preserved in the new handoff-grade bar.

For V1 thread layout and filename grammar see `docs/workflow/v1/README.md`.

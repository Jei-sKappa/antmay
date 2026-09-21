# Emit a pending review

Record a review's validated, evidenced findings in one self-contained bundle under the thread's `.pending-reviews/` folder, creating the folder on demand.

When the review produced zero actionable findings, write no file: return the concise pass result in chat instead.

## Allocate the bundle

Every review run writes its own file: never append to an existing bundle, and never reuse a shared singleton file.

Name it `<UTC>-<suffix>-<slug>.md` — the current UTC timestamp, a short unique suffix, and a kebab-case slug summarizing the review — for example `260712142301Z-a3f9-spec-handoff.md`.

## Shape

Write the routing header first:

```markdown
# Pending review: <review title>

Reviewer: /<your own name>
Target: <the implementation folder, or the thread-relative artifact path>
Created: <UTC>
Findings: <count>
```

The target is the implementation folder `implementations/<yymmddhhmm>[-<slug>]/` when the review assessed an implementation, and the thread-relative artifact path otherwise.

When a short overall assessment is needed to interpret the findings, write it immediately after the header:

```markdown
## Context

<concise overall assessment>
```

Then write the findings under a single heading, one section per finding:

```markdown
## Findings

### FND1: <short title>

Severity: <blocker | issue | nit>
Category: <review-specific category>

Finding: <what is wrong>

Evidence: <precise supporting reference>

Impact: <why it matters>

Suggested action: <a useful next action, when supportable>
```

## Rules

- `FND<N>` numbering is sequential and local to the bundle, starting at `FND1`.
- Every finding carries `Severity:` (`blocker`, `issue`, or `nit`), `Category:`, `Finding:`, `Evidence:`, and `Impact:`. Include `Suggested action:` only when the finding supports a useful next step; omit the line otherwise.
- Order the findings by severity — blockers first, then issues, then nits — and keep the assigned category order within one severity.
- Never fabricate a missing field or invent a finding to fill a bundle.
- The bundle records findings and nothing more: no field naming how to address one, no status, disposition, or other lifecycle marker, and no instruction to rerun or auto-retry any operation.
- Write nothing to `.pending-decisions/` here, and route no finding onward; how the recorded findings are addressed is decided elsewhere.

---
name: emit-pending-review
description: Use when a read-only reviewing caller supplies a target and one or more findings it has already validated, evidenced, and categorized, and needs them recorded for later attention — allocate a uniquely named bundle under the active thread's `.pending-reviews/` folder and write its routing header and severity-ordered findings.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Emit Pending Review

Record a review's findings in a single self-contained bundle. You take the findings the caller hands you — each already validated, evidenced, and assigned a severity and a review-specific category — allocate a uniquely named bundle file, write its routing header, and lay the findings out in the schema below. You own only the bundle's allocation, shape, ordering, and the refusals here. You do not judge whether a finding is valid, fixable, or worth raising, you do not correct the reviewed target, and you route nothing anywhere else.

## Precondition and refusal

Act only when the caller supplies both of:

- **Target** — the thread-relative code or artifact reference the review assessed.
- **Findings** — one or more actionable findings, each carrying a severity, a review-specific category, a finding statement, precise evidence, and an impact.

When the caller reports zero actionable findings, write no file and tell the caller to return its concise pass result in chat. Never create an empty bundle.

Otherwise refuse, naming exactly what is missing, and write no file, when the target is absent or the findings are not supplied as structured findings with the fields above. Do not fabricate a missing field or invent a finding to fill a bundle.

## Bundle allocation

Write one bundle file per review run under the active thread's `.pending-reviews/` folder, creating the folder on demand. Never append to an existing bundle, and never reuse a shared singleton file.

Each filename must be unique even when several reviewers finish within the same second, and must stay human-readable. Compose it from a UTC timestamp, a short unique suffix, and a kebab-case slug summarizing the review — for example `260712142301Z-a3f9-spec-handoff.md`. Concurrent reviewers therefore always allocate distinct files.

## Bundle shape

Write the file in this order: the routing header, an optional context section, then the findings.

The routing header contains exactly these fields:

```markdown
# Pending review: <review title>

Reviewer: /<review-skill>
Target: <thread-relative code or artifact reference>
Created: <UTC>
Findings: <count>
```

When the caller supplies a short overall assessment, write it immediately after the header:

```markdown
## Context

<concise overall assessment needed to interpret the findings>
```

Then write the findings under a single heading:

```markdown
## Findings

### F1: <short title>

Severity: <blocker | issue | nit>
Category: <review-specific category>

Finding: <what is wrong>

Evidence: <precise supporting reference>

Impact: <why it matters>

Suggested action: <a useful next action, when supportable>
```

Give each finding its own `### F<N>: <short title>` section. `F<N>` numbering is sequential and local to this bundle, starting at `F1`. Every finding carries `Severity:` (`blocker`, `issue`, or `nit`), `Category:` (the review-specific category the caller assigned), `Finding:`, `Evidence:`, and `Impact:`. Include `Suggested action:` only when a useful next step is supported by the finding; omit it otherwise.

Order the findings by severity — blockers first, then issues, then nits — and within one severity keep the caller's category order.

## Ownership boundary

The caller owns every domain judgment: whether a finding is real, the correctness of the evidence, the severity, and the review-specific categories. You own the bounded side effect: unique file allocation, the header and finding schema, `F<N>` numbering, severity ordering, and the refusals above.

The bundle records findings and nothing more. It carries no field naming how to address a finding, no status, disposition, or other lifecycle marker, and no instruction to rerun or auto-retry any operation. You never write to `.pending-decisions/` and never route a finding to another operation; how the recorded findings are addressed is decided elsewhere.

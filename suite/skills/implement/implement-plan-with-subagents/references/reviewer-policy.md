# Merged reviewer — shared lane policy

> Loaded by the single merged reviewer subagent alongside the two lane method files — `references/plan-compliance-reviewer.md` and `references/code-quality-reviewer.md` — in this same `references/` folder. The orchestrator passes the absolute path of this file together with the two lane files in the reviewer subagent's brief. This file owns the rules that hold IDENTICALLY for both lanes; each lane method file defines only what is distinctive to its lane and points here for these shared rules. The orchestrator itself does not read this file.

## Unverified criteria

Some criteria cannot be verified from within the run — they depend on external configuration, runtime-only behavior, or credentials nobody has. Do not manufacture a blocking finding you cannot substantiate, and do not silently pass over it. Record it as a named **"unverified" concern**: state the criterion, why it cannot be checked from within the run, and what would settle it. An unverified concern is **non-blocking by default** — it rides a `PASS` in its lane and carries into the task's `DONE_WITH_CONCERNS` outcome rather than failing the lane. Reserve `NEEDS_CONTEXT` for the case where proceeding without the answer would be reckless (your judgment) — then that lane's verdict is `NEEDS_CONTEXT`, not a `PASS` carrying the concern.

## Verdict

Each lane's verdict is EXACTLY ONE of four tokens. The merged reviewer returns BOTH lane verdicts — one per lane — in its single reply on EVERY dispatch, each named per lane; a report missing either verdict is not accepted.

- `PASS` — no BLOCKING finding remains in this lane; the diff meets this lane's bar (the lane's `## What <Lane> Is` defines that bar). A `PASS` MAY still carry non-blocking concerns (including unverified concerns).
- `ISSUES` — at least one BLOCKING finding exists in this lane. This drives the orchestrator's fix loop (a fresh implementer addresses the findings, then a fresh merged reviewer re-reviews both lanes). `ISSUES` never becomes a `BLOCKED` verdict directly.
- `BLOCKED` — a RARE can't-assess escape: a hard external impossibility prevents you from assessing this lane at all. Routes to the orchestrator's matching `BLOCKED` terminal verdict.
- `NEEDS_CONTEXT` — a RARE can't-assess escape: assessing this lane needs a judgment call you cannot make alone (e.g., an implementer assumption rests on information from outside the run, or proceeding on an unverified criterion would be reckless). Routes to the orchestrator's matching `NEEDS_CONTEXT` terminal verdict.

`BLOCKED` and `NEEDS_CONTEXT` are escapes, not your normal output — reach for them only when you genuinely cannot produce a `PASS` / `ISSUES` verdict.

### Classify each finding — blocking vs. non-blocking

Classify every finding as BLOCKING or a NON-BLOCKING concern, defaulting to BLOCKING when uncertain. A BLOCKING finding is a problem in this lane's dimensions (the lane's `## What <Lane> Is`) serious enough to require a fix before the cycle commits; the verdict is `ISSUES` IFF at least one blocking finding exists. A NON-BLOCKING concern is worth surfacing but does not by itself warrant a fix; with zero blocking findings the verdict is `PASS`, and the non-blocking concerns ride that `PASS` in a `Concerns:` section.

### The plan-mandated label

A finding may trace to the plan's own text: the diff faithfully implements something the plan mandated, but the mandated thing is itself defective. Label such a finding **plan-mandated**. Do not treat it as an implementer failure — the implementer built what the task said. Surface it, mark it `[plan-mandated]`, and let the orchestrator route it through its existing plan-fault path (the deviation policy — `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` per severity). The orchestrator never silently accepts the defect and never patches the plan mid-run; you never patch the plan either.

### Out-of-task observations

A plan is being implemented in task batches, and each lane's focus is the CURRENT task's diff. There is no prohibition on reporting discoveries beyond it — an issue in a different task's territory, in pre-existing code the diff did not touch, or in the plan as a whole. Record such observations in the distinct out-of-task section of the review file (see the lane's `## Output Template`). Out-of-task observations NEVER drive the current task's fix loop and NEVER enter its blocking classification — blocking is defined solely against the current task's diff. The orchestrator routes these through its existing concern / follow-up mechanisms.

### Assess supplied assumptions

The orchestrator may inject — unclassified — the assumptions / known-risks the implementer surfaced for this dispatch. Assess those that fall within your lane's lens (the lane's `## Focus Area` defines that lens):

- An assumption that is unsound or unverifiable becomes a finding (classify it blocking / non-blocking like any other; if it cannot be checked from within the run, record it as an unverified concern).
- An assumption that needs a judgment call you cannot make alone becomes `NEEDS_CONTEXT`.
- An assumption outside your lane's lens belongs to the other lane, not to yours.

## Output file

The merged reviewer writes ONE `SS-review.md` per review dispatch, containing one section per lane, to the path the orchestrator named in the brief (a scratch file under the run's workspace directory). The file is written only when at least one lane has content to record — a finding, a concern (including an unverified concern), an out-of-task observation, or an `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT` verdict in either lane. When BOTH lanes are a clean no-findings `PASS`, NO file is written; both verdicts are reported in the reply alone. Write-once — never overwrite or append a prior dispatch's file.

When the file IS written, each lane contributes its own `## <Lane> Lane` section from the template in its method file; a clean lane still states its `PASS` verdict (with no findings/concerns subsections rendered). Omit any subsection that has no content (a clean lane keeps only the `Verdict:` line and `References:`; `Reason:` appears only for `BLOCKED` / `NEEDS_CONTEXT`).

The orchestrator reads each lane's `Verdict:` and its findings / concerns / out-of-task observations / reason from the file. The merged reviewer's single reply carries BOTH lane verdicts on every dispatch, each named per lane, plus the review file's path when one was written, and a 2–3 sentence summary alongside the verdicts. Do not paste the review file's contents back in the reply.

## Hard constraints (both lanes)

- DO NOT modify code. You are a reviewer, not an implementer. A fresh fix-iteration implementer subagent will address your findings; you only surface them.
- DO NOT modify the plan folder (index or task files). It is immutable. Read it; do not write to it.
- DO NOT commit. The orchestrator commits per the skill's `## Commit Policy` once both lane verdicts are clean; subagents do not commit.

Each lane's method file adds its own lane-scoping constraint and any lane-specific limit in its `## Hard Constraints`.

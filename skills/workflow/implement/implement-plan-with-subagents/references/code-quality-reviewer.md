# Code-Quality Reviewer

> Loaded by the single merged reviewer subagent dispatched by this skill, alongside the plan-compliance method file in this same `references/` folder. The orchestrator itself does not read this file — it passes the absolute path of this file (and the plan-compliance file) in the reviewer subagent's brief, and the reviewer loads both. This file defines ONE of the two review lanes.

## Focus Area

The SINGLE question this lane answers: **"Is the diff well-structured, safe, idiomatic given the codebase?"**

ONE reviewer dispatch loads both method files and produces TWO lane verdicts — plan-compliance (the sibling file) and code-quality (this file). Each lane is judged **independently**, strictly within its own scope, with **no cross-lane trust**: this lane never assumes what the plan-compliance lane concluded, and a diff may fail plan-compliance and still receive code-quality findings in the same report. This lane's scope is code-quality only — whether the diff implements what the task said it would is the plan-compliance lane's scope. Stay in your lane: is the diff well-structured, safe, idiomatic, and low-regression-risk?

## What Code-Quality Is

Code-quality is the contract between the diff and the codebase. You read the diff and you read enough surrounding code to evaluate fit. You ask:

- **Readability** — Are variable names clear and consistent with the project's conventions? Is function decomposition reasonable (no functions that obviously want splitting; no premature abstraction)? Is dead code introduced (unused imports, unreachable branches, vestigial helpers)?
- **Safety** — Does the diff validate inputs at the boundaries the diff introduces? Are error conditions handled (null checks where null is possible; type guards where the type widens; bounds checks where indices are computed)? Are there obvious null-deref / type-cast hazards / off-by-one risks the implementer should address?
- **Idiomatic patterns** — Does the diff use the project's existing helpers, types, and conventions where applicable, instead of re-inventing them? Is the diff consistent with how similar functionality is implemented elsewhere in the codebase?
- **Regression risk** — Does the diff break anything that was passing before (look at adjacent code paths the diff touches indirectly)? Are there files modified by the diff that should NOT be modified (an unrelated file caught in the change)? Does the diff alter a shared utility in a way that affects unrelated callers?

## What Code-Quality Is NOT

You do NOT evaluate:

- Whether the diff implements what the plan task said it would — that is the plan-compliance lane's scope. You do not re-grade plan-compliance and you do not assume its verdict; the two lanes are judged independently, and this lane may raise code-quality findings whatever the plan-compliance lane concludes.
- Whether the plan task is well-conceived. You critique the diff, not the plan. The one exception is the *plan-mandated* label (see `## Verdict`): when the diff faithfully implements something defective the plan itself mandated, surface the diff-level finding and mark it plan-mandated so the orchestrator can route it — you still do not patch or rewrite the plan.
- Whether the codebase as a whole has good code quality. Your review is scoped to the diff for this orchestration cycle.

If a finding sits at the boundary between the two lanes (e.g., "the diff implements the task but the implementation is so unsafe it nearly defeats the task's verification"), record the code-quality side in this lane's section; the plan-compliance side belongs in that lane's section of the same report. Your job here is the safety / structure / idiomatic-fit angle.

## Read Permission

The diff is the review **target**; the repo is readable **context**. Reading unchanged code — imports, callers of changed functions, adjacent files in the same module, the task file, the index, and the artifact the index's `Source:` line names — to evaluate idiomatic fit and regression risk is in-scope and expected. Reading is unrestricted; stop once you have enough context to evaluate the diff, and do not turn this into a full codebase audit.

## Unverified Criteria

Some criteria cannot be verified from within the run — they depend on external configuration, runtime-only behavior, or credentials nobody has (e.g., whether a code path is safe under a production config nobody can see here). Do not manufacture a blocking finding you cannot substantiate, and do not silently pass over it. Record it as a named **"unverified" concern**: state the criterion, why it cannot be checked from within the run, and what would settle it. An unverified concern is **non-blocking by default** — it rides a `PASS` in this lane and carries into the task's `DONE_WITH_CONCERNS` outcome rather than failing the lane. Reserve `NEEDS_CONTEXT` for the case where proceeding without the answer would be reckless (your judgment) — then this lane's verdict is `NEEDS_CONTEXT`, not a `PASS` carrying the concern.

## Verdict

This lane's verdict is EXACTLY ONE of four tokens. The merged reviewer returns BOTH lane verdicts — this one and the plan-compliance lane's — in its single reply on EVERY dispatch, each named per lane; a report missing either verdict is not accepted.

- `PASS` — the diff is well-structured, safe, idiomatic, and low-regression-risk; no BLOCKING finding remains in this lane. A `PASS` MAY still carry non-blocking concerns (including unverified concerns).
- `ISSUES` — at least one BLOCKING code-quality finding exists. This drives the orchestrator's fix loop (a fresh implementer addresses the findings, then a fresh merged reviewer re-reviews both lanes). `ISSUES` never becomes a `BLOCKED` verdict directly.
- `BLOCKED` — a RARE can't-assess escape: a hard external impossibility prevents you from assessing code-quality at all. Routes to the orchestrator's matching `BLOCKED` terminal verdict.
- `NEEDS_CONTEXT` — a RARE can't-assess escape: assessing code-quality needs a judgment call you cannot make alone (e.g., an implementer assumption rests on information from outside the run, or proceeding on an unverified criterion would be reckless). Routes to the orchestrator's matching `NEEDS_CONTEXT` terminal verdict.

`BLOCKED` and `NEEDS_CONTEXT` are escapes, not your normal output — reach for them only when you genuinely cannot produce a `PASS` / `ISSUES` verdict.

### Classify each finding — blocking vs. non-blocking

Classify every finding as BLOCKING or a NON-BLOCKING concern, defaulting to BLOCKING when uncertain:

- A BLOCKING finding means a readability / safety / idiomatic-fit / regression-risk problem serious enough to require a fix before the cycle commits. The verdict is `ISSUES` IFF at least one blocking finding exists.
- A NON-BLOCKING concern is worth surfacing but does not by itself warrant a fix. With zero blocking findings the verdict is `PASS`, and the non-blocking concerns ride that `PASS` in a `Concerns:` section.

### The plan-mandated label

A finding may trace to the plan's own text: the diff faithfully implements something the plan mandated, but the mandated thing is itself defective (an unsafe pattern the task told the implementer to write, say). Label such a finding **plan-mandated**. Do not treat it as an implementer failure — the implementer built what the task said. Surface it, mark it `[plan-mandated]`, and let the orchestrator route it through its existing plan-fault path (the deviation policy — `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` per severity). The orchestrator never silently accepts the defect and never patches the plan mid-run; you never patch the plan either.

### Out-of-task observations

A plan is being implemented in task batches, and this lane's focus is the CURRENT task's diff. There is no prohibition on reporting discoveries beyond it — a code-quality issue in a different task's territory or in pre-existing code the diff did not touch. Record such observations in the distinct out-of-task section of the review file (see `## Output Template`). Out-of-task observations NEVER drive the current task's fix loop and NEVER enter its blocking classification — blocking is defined solely against the current task's diff. The orchestrator routes these through its existing concern / follow-up mechanisms.

### Assess supplied assumptions

The orchestrator may inject — unclassified — the assumptions / known-risks the implementer surfaced for this dispatch. Assess those that fall within THIS lane's lens (does the assumption hold for safety / structure / idiomatic-fit / regression-risk?):

- An assumption that is unsound or unverifiable becomes a finding (classify it blocking / non-blocking like any other; if it cannot be checked from within the run, record it as an unverified concern).
- An assumption that needs a judgment call you cannot make alone becomes `NEEDS_CONTEXT`.
- Assumptions outside this lane's lens (plan-compliance matters) are the plan-compliance lane's to assess, not this one's.

## Process

1. **Read the task file and the index READ-ONLY.** Your brief names the task file (`plan-tasks/NN-<slug>.md`) and the plan index (`plan.md`), and grants reading the artifact the index's `Source:` line names when a question is left open. The plan is immutable — open all of these for reading only. You read the task primarily to anchor your understanding of the diff's intent — not to grade plan-compliance, which is the other lane, judged independently.
2. **Inspect the diff.** Run `git status --porcelain` and `git diff` (or file-by-file reads of the modified paths) to see the current post-implementer state. On a fix-loop re-review the diff reflects the implementer's original work plus any fix iterations.
3. **Read surrounding code as needed.** Open related files (imports, callers of changed functions, adjacent files in the same module) to evaluate idiomatic fit and regression risk (reading is in-scope per `## Read Permission`). Stop reading once you have enough context to evaluate the diff; do not turn this into a full codebase audit.
4. **Evaluate readability, safety, idiomatic fit, and regression risk** using the prompts in `## What Code-Quality Is` above. Each evaluation produces zero or more findings.
5. **Identify code-quality gaps as ACTIONABLE FINDINGS, and assess any supplied assumptions.** Each finding must be concrete (cite the specific file + lines in the diff, the specific concern, and a suggested fix), not vague ("the code feels off"). Vague findings are useless to the fix-iteration implementer; the next implementer needs to know what to change. Label any finding that traces to the plan's own text `[plan-mandated]`; record any criterion you cannot verify from within the run as an unverified concern; note any discovery beyond the current task in the out-of-task section. Assess any implementer-supplied assumptions that fall within this lane's lens per `## Verdict`.
6. **Classify each finding and determine the verdict.** Mark each finding BLOCKING or non-blocking (default to blocking when uncertain) per `## Verdict`. The verdict is `ISSUES` iff at least one blocking finding exists; otherwise `PASS` (carrying any non-blocking concerns in a `Concerns:` section). Reserve `BLOCKED` / `NEEDS_CONTEXT` for the rare can't-assess escapes.
7. **Write this lane's section of the review output** using the `## Output Template` below, to the single `SS-review.md` path the orchestrator named in your brief (a scratch file under the run's workspace directory) — see the write condition below. Do NOT modify code, do NOT modify the plan.

## Output Template

The merged reviewer writes ONE `SS-review.md` per review dispatch, containing one section per lane. The file is written only when at least one lane has content to record — a finding, a concern (including an unverified concern), an out-of-task observation, or an `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT` verdict in either lane. When BOTH lanes are a clean no-findings `PASS`, NO file is written; both verdicts are reported in the reply alone. When the file IS written, this lane contributes the **Code-Quality Lane** section below (the plan-compliance lane contributes its own section to the same file per its method file); a clean lane still states its `PASS` verdict (with no findings/concerns subsections rendered).

```markdown
## Code-Quality Lane

Verdict: <PASS | ISSUES | BLOCKED | NEEDS_CONTEXT>

Findings:
1. **<short title>** [blocking] — Concern: <readability | safety | idiomatic | regression-risk>. Location: <file:lines>. Observed: <what the diff does>. Suggested fix: <concrete instruction the next implementer can act on>.
2. **<short title>** [non-blocking][plan-mandated] — Concern: <…>. Location: <file:lines>. Observed: <the diff faithfully implements it, but the mandate is defective because …>. Suggested fix: <what a corrected plan would say — routed as a plan fault, not patched here>.

Concerns:
- <non-blocking concern — surfaced for the orchestrator to weigh; no fix required>
- unverified: <criterion that cannot be checked from within the run> — <why> — <what would settle it>.

Out-of-task observations:
- <a code-quality discovery beyond the current task's diff — different task's territory or pre-existing code; never drives this task's fix loop or blocking>.

Reason: <BLOCKED / NEEDS_CONTEXT only — the hard impossibility that blocks assessment, or the judgment call you cannot make alone>.

References:
- Plan index: plan.md
- Task file: plan-tasks/NN-<slug>.md
- Modified files:
  - <path>
```

Omit any subsection that has no content (a clean lane keeps only the `Verdict:` line and `References:`; `Reason:` appears only for `BLOCKED` / `NEEDS_CONTEXT`).

The orchestrator reads each lane's `Verdict:` and its findings / concerns / out-of-task observations / reason. The merged reviewer's single reply carries BOTH lane verdicts on every dispatch, each named per lane, plus the review file's path when one was written; reply with a 2–3 sentence summary alongside the verdicts. Do not paste the review file's contents back in the reply.

## Hard Constraints

- DO NOT modify code. You are a reviewer, not an implementer. A fresh fix-iteration implementer subagent will address your findings; you only surface them.
- DO NOT modify the plan folder (index or task files). It is immutable. Read it; do not write to it.
- DO NOT commit. The orchestrator commits per the skill's `## Commit Policy` once both lane verdicts are clean; subagents do not commit.
- Keep this lane's section scoped to code-quality. A plan-compliance observation (missing substep, unmet acceptance criterion) belongs in the plan-compliance lane's section of the same report, not here — the two lanes are judged independently.
- DO NOT make findings that essentially re-author the diff into a different design. If the diff meets the readability / safety / idiomatic / regression-risk bars, `PASS` this lane — even if a different design would be cleaner. Architectural redesign is not your role.

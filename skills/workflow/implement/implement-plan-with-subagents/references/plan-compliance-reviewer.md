# Plan-Compliance Reviewer

> Loaded by the single merged reviewer subagent dispatched by this skill, alongside the code-quality method file in this same `references/` folder. The orchestrator itself does not read this file — it passes the absolute path of this file (and the code-quality file) in the reviewer subagent's brief, and the reviewer loads both. This file defines ONE of the two review lanes.

## Focus Area

The SINGLE question this lane answers: **"Does the diff implement what the task said it would?"**

ONE reviewer dispatch loads both method files and produces TWO lane verdicts — plan-compliance (this file) and code-quality (the sibling file). Each lane is judged **independently**, strictly within its own scope, with **no cross-lane trust**: this lane never assumes what the other lane concluded, and a diff may fail plan-compliance and still receive code-quality findings in the same report. This lane's scope is plan-compliance only — code style, naming, architectural taste, refactor opportunities, idiomatic-fit, and regression risk belong to the code-quality lane, not here. Stay in your lane: did the implementer build what the plan task described?

## What Plan-Compliance Is

Plan-compliance is the contract between the plan task and the diff. You read the task file and the plan index READ-ONLY (see `## Process`) and you read the diff. You ask:

- Did the implementer touch the files the task said it would? The task file's `Files modified` list is the authoritative list — use it.
- Does the diff satisfy the task's verification block, if present? (The named test passes, the `grep` returns the expected result, the `test -f` finds the file, the `npm test` invocation runs clean.)
- Does the diff produce the post-conditions the acceptance criteria list, where acceptance criteria are present? Each criterion: SATISFIED / MISSING / PARTIAL.
- Did the implementer implement EVERY substep the task names? Missing substeps are findings even when the diff "looks like" it covers the task.
- Did the implementer SKIP any task substep silently? Silent skips are findings.
- Does the diff honor the task's `Consumes:`/`Produces:` hand-off lines — using what earlier tasks were to produce, and producing what later tasks are to rely on?

## What Plan-Compliance Is NOT

You do NOT evaluate:

- Code style, formatting, variable naming, function decomposition — that is the code-quality lane's scope.
- Whether the implementation is idiomatic for the codebase — code-quality lane.
- Refactor opportunities or architectural taste — code-quality lane.
- Regression risk in adjacent code paths the implementer did not touch — code-quality lane.
- Whether the implementation is "good code" — only whether it implements what the plan task said it would.

If a finding spans both lanes (e.g., "the implementer satisfied the task but introduced a security hazard"), record the plan-compliance side in this lane's section; the code-quality side belongs in the code-quality lane's section of the same report. The two lanes are judged independently — you do not defer to, wait on, or assume the other lane's outcome.

## Read Permission

The diff is the review **target**; the repo is readable **context**. Reading unchanged code — callers, imports, sibling files, the task file, the index, and the artifact the index's `Source:` line names — to verify a criterion is in-scope and expected. Reading is unrestricted. What stays bounded is **test execution**: run only what the task's verification block prescribes (see `## Hard Constraints`). Reading the whole repo to understand the diff is fine; running extra tests is not.

## Unverified Criteria

Some criteria cannot be verified from within the run — they depend on external configuration, runtime-only behavior, or credentials nobody has. Do not manufacture a blocking finding you cannot substantiate, and do not silently pass over it. Record it as a named **"unverified" concern**: state the criterion, why it cannot be checked from within the run, and what would settle it. An unverified concern is **non-blocking by default** — it rides a `PASS` in this lane and carries into the task's `DONE_WITH_CONCERNS` outcome rather than failing the lane. Reserve `NEEDS_CONTEXT` for the case where proceeding without the answer would be reckless (your judgment) — then this lane's verdict is `NEEDS_CONTEXT`, not a `PASS` carrying the concern.

## Verdict

This lane's verdict is EXACTLY ONE of four tokens. The merged reviewer returns BOTH lane verdicts — this one and the code-quality lane's — in its single reply on EVERY dispatch, each named per lane; a report missing either verdict is not accepted.

- `PASS` — the diff implements what the plan task said it would and no BLOCKING finding remains in this lane. A `PASS` MAY still carry non-blocking concerns (including unverified concerns).
- `ISSUES` — at least one BLOCKING plan-compliance finding exists. This drives the orchestrator's fix loop (a fresh implementer addresses the findings, then a fresh merged reviewer re-reviews both lanes). `ISSUES` never becomes a `BLOCKED` verdict directly.
- `BLOCKED` — a RARE can't-assess escape: a hard external impossibility prevents you from assessing plan-compliance at all. Routes to the orchestrator's matching `BLOCKED` terminal verdict.
- `NEEDS_CONTEXT` — a RARE can't-assess escape: assessing plan-compliance needs a judgment call you cannot make alone (e.g., an implementer assumption rests on information from outside the run, or proceeding on an unverified criterion would be reckless). Routes to the orchestrator's matching `NEEDS_CONTEXT` terminal verdict.

`BLOCKED` and `NEEDS_CONTEXT` are escapes, not your normal output — reach for them only when you genuinely cannot produce a `PASS` / `ISSUES` verdict.

### Classify each finding — blocking vs. non-blocking

Classify every finding as BLOCKING or a NON-BLOCKING concern, defaulting to BLOCKING when uncertain:

- A BLOCKING finding means the diff does not satisfy the plan task — a missing substep, a failed verification, an unmet acceptance criterion, a broken `Consumes:`/`Produces:` hand-off. The verdict is `ISSUES` IFF at least one blocking finding exists.
- A NON-BLOCKING concern is worth surfacing but does not by itself fail plan-compliance. With zero blocking findings the verdict is `PASS`, and the non-blocking concerns ride that `PASS` in a `Concerns:` section.

### The plan-mandated label

A finding may trace to the plan's own text: the diff faithfully implements something the plan mandated, but the mandated thing is itself defective. Label such a finding **plan-mandated**. Do not treat it as an implementer failure — the implementer built what the task said. Surface it, mark it `[plan-mandated]`, and let the orchestrator route it through its existing plan-fault path (the deviation policy — `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` per severity). The orchestrator never silently accepts the defect and never patches the plan mid-run; you never patch the plan either.

### Out-of-task observations

A plan is being implemented in task batches, and this lane's focus is the CURRENT task's diff. There is no prohibition on reporting discoveries beyond it — an issue in a different task, in pre-existing code, or in the plan as a whole. Record such observations in the distinct out-of-task section of the review file (see `## Output Template`). Out-of-task observations NEVER drive the current task's fix loop and NEVER enter its blocking classification — blocking is defined solely against the current task. The orchestrator routes these through its existing concern / follow-up mechanisms.

### Assess supplied assumptions

The orchestrator may inject — unclassified — the assumptions / known-risks the implementer surfaced for this dispatch. Assess those that fall within THIS lane's lens (does the assumption hold for plan-compliance?):

- An assumption that is unsound or unverifiable against the plan task becomes a finding (classify it blocking / non-blocking like any other; if it cannot be checked from within the run, record it as an unverified concern).
- An assumption that needs a judgment call you cannot make alone becomes `NEEDS_CONTEXT`.
- Assumptions outside this lane's lens (code-quality matters) are the code-quality lane's to assess, not this one's.

## Process

1. **Read the task file and the index READ-ONLY.** Your brief names the task file (`plan-tasks/NN-<slug>.md`) and the plan index (`plan.md`), and grants reading the artifact the index's `Source:` line names when a question is left open. The plan is immutable — open all of these for reading only. From the task file, record the objective, the `Files modified` list, the verification block (if any), the acceptance criteria (if any), and the `Consumes:`/`Produces:` hand-off lines. From the index, note the Global Constraints that bind every task.
2. **Inspect the diff.** Run `git status --porcelain` and `git diff` (or file-by-file reads of the modified paths) to see what the implementer did. Make sure the working-tree state you are inspecting is the current post-implementer state for THIS task — the orchestrator gave you the cycle's starting state via the brief; the diff is the difference from there.
3. **Run the task's verification block if present.** If the task file has a mechanical verification (a `grep` invocation, a `test -f` check, a named test, an `npm test` or equivalent invocation), execute it and record the result. PASS / FAIL with the output snippet for the finding.
4. **Compare against acceptance criteria.** For each criterion in the task file's acceptance criteria block, mark it SATISFIED / MISSING / PARTIAL. When a task file carries no explicit acceptance criteria, evaluate against its objective sentence.
5. **Identify plan-compliance gaps as ACTIONABLE FINDINGS, and assess any supplied assumptions.** Each finding must be concrete (cite the specific plan-task statement and the specific diff observation), not vague ("the diff feels incomplete"). Vague findings are useless to the fix-iteration implementer; the next implementer needs to know what to fix. Label any finding that traces to the plan's own text `[plan-mandated]`; record any criterion you cannot verify from within the run as an unverified concern; note any discovery beyond the current task in the out-of-task section. Assess any implementer-supplied assumptions that fall within this lane's lens per `## Verdict`.
6. **Classify each finding and determine the verdict.** Mark each finding BLOCKING or non-blocking (default to blocking when uncertain) per `## Verdict`. The verdict is `ISSUES` iff at least one blocking finding exists; otherwise `PASS` (carrying any non-blocking concerns in a `Concerns:` section). Reserve `BLOCKED` / `NEEDS_CONTEXT` for the rare can't-assess escapes.
7. **Write this lane's section of the review output** using the `## Output Template` below, to the single `SS-review.md` path the orchestrator named in your brief (a scratch file under the run's workspace directory) — see the write condition below. Do NOT modify code, do NOT modify the plan.

## Output Template

The merged reviewer writes ONE `SS-review.md` per review dispatch, containing one section per lane. The file is written only when at least one lane has content to record — a finding, a concern (including an unverified concern), an out-of-task observation, or an `ISSUES` / `BLOCKED` / `NEEDS_CONTEXT` verdict in either lane. When BOTH lanes are a clean no-findings `PASS`, NO file is written; both verdicts are reported in the reply alone. When the file IS written, this lane contributes the **Plan-Compliance Lane** section below (the code-quality lane contributes its own section to the same file per its method file); a clean lane still states its `PASS` verdict (with no findings/concerns subsections rendered).

```markdown
## Plan-Compliance Lane

Verdict: <PASS | ISSUES | BLOCKED | NEEDS_CONTEXT>

Findings:
1. **<short title>** [blocking] — Expected: <what the plan task said>. Observed: <what the diff did>. Suggested fix: <concrete instruction the next implementer can act on>.
2. **<short title>** [non-blocking][plan-mandated] — Expected: <what the plan mandated>. Observed: <the diff faithfully implemented it, but the mandate is defective because …>. Suggested fix: <what a corrected plan would say — routed as a plan fault, not patched here>.

Concerns:
- <non-blocking concern — surfaced for the orchestrator to weigh; no fix required>
- unverified: <criterion that cannot be checked from within the run> — <why> — <what would settle it>.

Out-of-task observations:
- <a discovery beyond the current task — different task, pre-existing code, or the plan as a whole; never drives this task's fix loop or blocking>.

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
- Keep this lane's section scoped to plan-compliance. A code-quality observation (style, safety, idiomatic-fit, regression risk) belongs in the code-quality lane's section of the same report, not here — the two lanes are judged independently.
- DO NOT run tests beyond what the task's verification block prescribes. Reading unchanged code for context is unrestricted (see `## Read Permission`); running additional tests "for completeness" is out of scope (and risks confusing the diff state for the review).

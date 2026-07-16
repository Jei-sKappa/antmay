# Plan-Compliance Reviewer

> Loaded by the single merged reviewer subagent dispatched by this skill, alongside the code-quality method file and the shared lane policy `references/reviewer-policy.md` in this same `references/` folder. The orchestrator itself does not read this file — it passes the absolute paths of this file, the code-quality file, and the policy file in the reviewer subagent's brief, and the reviewer loads all three. This file defines the plan-compliance lane; the rules common to both lanes live in `references/reviewer-policy.md`.

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

## Process

1. **Read the task file and the index READ-ONLY.** Your brief names the task file (`plan-tasks/NN-<slug>.md`) and the plan index (`plan.md`), and grants reading the artifact the index's `Source:` line names when a question is left open. The plan is immutable — open all of these for reading only. From the task file, record the objective, the `Files modified` list, the verification block (if any), the acceptance criteria (if any), and the `Consumes:`/`Produces:` hand-off lines. From the index, note the Global Constraints that bind every task.
2. **Inspect the diff.** Run `git status --porcelain` and `git diff` (or file-by-file reads of the modified paths) to see what the implementer did. Make sure the working-tree state you are inspecting is the current post-implementer state for THIS task — the orchestrator gave you the cycle's starting state via the brief; the diff is the difference from there.
3. **Run the task's verification block if present.** If the task file has a mechanical verification (a `grep` invocation, a `test -f` check, a named test, an `npm test` or equivalent invocation), execute it and record the result. PASS / FAIL with the output snippet for the finding.
4. **Compare against acceptance criteria.** For each criterion in the task file's acceptance criteria block, mark it SATISFIED / MISSING / PARTIAL. When a task file carries no explicit acceptance criteria, evaluate against its objective sentence.
5. **Identify plan-compliance gaps as ACTIONABLE FINDINGS, and assess any supplied assumptions.** Each finding must be concrete (cite the specific plan-task statement and the specific diff observation), not vague ("the diff feels incomplete"). Vague findings are useless to the fix-iteration implementer; the next implementer needs to know what to fix. Label any finding that traces to the plan's own text `[plan-mandated]`, record any criterion you cannot verify from within the run as an unverified concern, and note any discovery beyond the current task in the out-of-task section — all per `references/reviewer-policy.md`. Assess any implementer-supplied assumptions that fall within this lane's lens per that same policy file.
6. **Classify each finding and determine the verdict** per `references/reviewer-policy.md` (`## Verdict`), reserving `BLOCKED` / `NEEDS_CONTEXT` for the rare can't-assess escapes.
7. **Write this lane's section of the review output** using the `## Output Template` below, to the single `SS-review.md` path the orchestrator named in your brief (a scratch file under the run's workspace directory) — see the write condition in `references/reviewer-policy.md` (`## Output file`). Do NOT modify code, do NOT modify the plan.

## Output Template

The write condition, the single-file / one-section-per-lane rule, and the reply shape are in `references/reviewer-policy.md` (`## Output file`). This lane contributes the **Plan-Compliance Lane** section below:

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

## Hard Constraints

The constraints binding both lanes (do not modify code, do not modify the plan, do not commit) are in `references/reviewer-policy.md` (`## Hard constraints (both lanes)`). This lane adds:

- Keep this lane's section scoped to plan-compliance. A code-quality observation (style, safety, idiomatic-fit, regression risk) belongs in the code-quality lane's section of the same report, not here — the two lanes are judged independently.
- DO NOT run tests beyond what the task's verification block prescribes. Reading unchanged code for context is unrestricted (see `## Read Permission`); running additional tests "for completeness" is out of scope (and risks confusing the diff state for the review).

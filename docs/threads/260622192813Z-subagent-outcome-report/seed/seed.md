# Seed: A structured implementer-subagent outcome report (a "verification index", not a verdict)

External: none — personal skills repo; no tracker ticket.

## What triggered this

While reviewing the subagent-driven implementation skill
(`implement-plan-with-subagents-auto` / `-interactive`), a gap surfaced in the
**implementer-subagent → orchestrator handshake**, and an unbiased external
consultation (run blind, with no project context and without revealing the
solution we were leaning toward) independently confirmed and sharpened it.

## The current design (objective)

The orchestrator dispatches, per plan task and sequentially on the same working
tree, a fresh **implementer subagent** plus two reviewer subagents
(plan-compliance, then code-quality), looping fix-and-re-review until both pass.
The **implementer subagent's only return** to the orchestrator is a **2–3
sentence prose summary plus the list of modified files**. The orchestrator
deliberately treats that reply as **acknowledgment only**: it inspects the
working tree itself (`git diff`), reads the reviewers' structured outputs from
disk, and from that evidence **synthesizes its own four-state per-task status**
(`DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`). Note: this is a
deliberate deviation from the pattern this skill descends from (obra/superpowers
`subagent-driven-development`), where the four-state status is the **subagent's**
report to the orchestrator. V2 repurposed the four labels as the *orchestrator's*
report and reduced the implementer's reply to prose.

## The problem / intuition

Disk is ground truth for **what changed**, but it is blind to **why it changed,
what was attempted, what was impossible, and what uncertainty remains.** Several
outcomes are facts only the subagent can know and that the working tree cannot
reveal:

- it could not finish (and *why* — a missing credential, a contradictory task);
- it needs information it was never given;
- it finished but holds a **reservation about a judgment call** it was forced to
  make.

A diff can show "missing / partial," never the reason. So the orchestrator cannot
reliably learn everything it needs from disk inspection alone when the subagent's
report is free-form prose. `NEEDS_CONTEXT` is the clearest case — it is
definitionally a message *to* the orchestrator, with no disk artifact behind it.

### The verification-gating asymmetry

Verification exists to catch **false positives** (the subagent hallucinates
success it did not deliver) — a real, common failure mode. The opposite, a
**false negative** (claiming blocked while having actually succeeded), is
practically nonexistent. So a positive outcome should be **verified**; a negative
outcome should **route the signal** (provide context / escalate / stop) — running
the reviewers on incomplete work is wasted and misleading.

## The expert's principle (the gist worth keeping)

The implementer's return should be a **structured claim set treated as a
verification *index*, not a verdict**:

> The report is evidence of the implementer's **claims, uncertainty, and
> attempted validation** — not evidence of correctness. The orchestrator verifies
> the claims against disk, tests, and reviewers.

This reconciles the two halves of the intuition into one mechanism: the report (a)
carries the epistemic state the diff can't, and (b) tells the orchestrator **what
to verify** — while **preserving "verify, don't trust"** (the report directs
verification, it does not replace it). Our original four-state token survives as
*one field* of this claim set.

The expert's proposed (heavyweight) shape, for reference — an untrusted-but-
mandatory outcome artifact carrying: `status` (completed / partial / blocked /
failed / no-op), `summary`, `files_changed` (+reasons), `requirements_addressed`
(+evidence), `validation` (commands run / not-run +reasons), `assumptions`,
`blockers`, `open_questions`, `known_risks` — which the orchestrator then checks
(diff vs reported files; requirement coverage; rerun claimed validation;
assumptions and risks passed to reviewers as first-class input).

## The single highest-value idea beyond our original token

**Surface assumptions / judgment calls explicitly so the *reviewers* see them.**
A bug very often hides in a wrong assumption the implementer had to make — and a
reviewer staring only at the diff *cannot see or assess that assumption*. Routing
assumptions to the reviewers closes a gap a bare status token never addressed.

## Take vs. adapt for this workflow (do NOT adopt wholesale)

- **Reuse the existing artifacts; do not bolt on a parallel schema.** The workflow
  already has the four-state vocabulary, the reviewers' structured review files,
  and the implementation report. The outcome report's fields should map onto
  these: `status` → the existing four-state labels (now reported at the *subagent*
  level too, with the orchestrator's four-state becoming the aggregate verified
  verdict); assumptions / risks / open-questions / deviations → fed to the
  reviewers and folded into the implementation report.
- **`files_changed` / `requirements_addressed` *compose*, not duplicate.** The
  orchestrator already cross-checks the diff, and the plan-compliance reviewer
  already maps the diff to the task's acceptance — so these become the *claims*
  those steps verify (claim → verify), not a redundant layer.
- **Calibrate the weight.** The full schema is heavy, and the workflow was just
  deliberately made lean. Favor a small **mandatory core** (status + one-line
  summary + assumptions + blockers/open-questions) with the heavier fields
  **optional, scaled by tier and plan granularity.**
- **Location:** a transient **`.wip/` outcome artifact** (the same pattern as the
  reviewer review files) that the orchestrator reads as the verification index —
  **not** a new committed artifact; the durable bits fold into the implementation
  report.
- **Verification gating stays:** `completed` → verify the claims (disk + reruns +
  reviewers); `partial` / `blocked` / `failed` / `needs-context` → route the
  signal, do not review incomplete work.

## Open design decisions (for this thread to settle)

1. **Richness / weight** — the lean mandatory core vs. the expert's full schema;
   how it scales by tier and by loose/strict plan granularity.
2. **Format** — Markdown (consistent with every other artifact) vs. a
   structured/parseable form (YAML/JSON) that better serves the future CLI and the
   determinism goal. This is the one decision genuinely worth deliberating.
3. **Mandatory vs. optional fields**, and exact status vocabulary (reconcile our
   `DONE`/`DONE_WITH_CONCERNS`/`BLOCKED`/`NEEDS_CONTEXT` with the expert's
   completed/partial/blocked/failed/no-op).
4. **Mapping / de-duplication** against the orchestrator's diff check, the
   plan-compliance reviewer, and the implementation report.
5. **Reviewers** — they already return a structured `Verdict: PASS|ISSUES`; do they
   also need a `NEEDS_CONTEXT`-style status for the can't-review case?
6. **Scope** — the two `implement-plan-with-subagents-*` skills primarily; whether
   the single-agent implement skills' self-review benefits from the same structured
   claim/verify split.

## Relationship to prior work

Sharpens the **implement stage** of the workflow defined in
`docs/threads/260612174045Z-agentic-workflow-v2/`. Sibling to
`docs/threads/260622102452Z-workflow-dx-orchestration/` (the orchestrator/driving
model) and aligned with its determinism / CLI direction — a structured,
machine-parseable subagent report is exactly what a deterministic orchestrator (or
CLI) wants. The blind external consultation is the genesis input behind the
"verification index, not a verdict" framing.

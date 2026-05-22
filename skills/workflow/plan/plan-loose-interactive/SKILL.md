---
name: plan-loose-interactive
description: Walk the user through a loose-granularity plan one task at a time, then write the resulting plan artifact when the user wants to think through a human-leaning implementation plan collaboratively.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.2
---

# Plan Loose Interactive

Walk the user through a loose-granularity plan task-by-task, accept freeform answers per task, push back on weak reasoning per the `## Anti-Sycophancy Stance`, run a self-review pass before emission, and write the artifact to the active thread's `plans/` folder. This is the collaborative counterpart to autonomous plan generation: it interviews, it disagrees when warranted, it surfaces what wasn't asked about, and it leaves a loose plan behind. Bad plan decisions become expensive in implementation — plans are downstream-consumed by an implementer (human or agent) who will not have you to ask follow-ups, so the cheap moment to push back is the walk.

## Anti-Sycophancy Stance

Your job is to help the user reach a plan that survives later scrutiny, not to make them feel good about whatever task list they walk in with. Treat plan authoring as a mutual attempt to get closer to an implementable artifact: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a particularly costly failure mode here — bad plan calls become expensive in the implementation phase because the plan is downstream-consumed by a future implementer (human or agent) who will not have you to ask follow-ups. Forward-direction artifacts get heightened pushback because the asymmetry of cost between cheap-now-objection vs expensive-later-discovery is large.

Hold these together:

- **Disagree when you disagree.** If the user's task list conflicts with the evidence, your read of the upstream spec or proposal, or the codebase reality, say so plainly before they commit it to the plan body. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user's proposed task ordering rests on an unexamined assumption, ignores a known constraint, or skips a risk or trade-off that the implementation will pay for, name the gap and bring it into the conversation before writing.
- **Surface what they didn't ask about.** Risks, hidden costs, ordering pitfalls, alternatives they dismissed too fast, missing prerequisite tasks — raise them, even if it slows the walk down. Better captured as a plan task (or as a note flagged for the implementer) now than rediscovered during implementation.
- **Take the user's input seriously.** If they push back, add context, or challenge your framing, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never soften your read of a task just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see a task differently, identify the exact assumption or value judgment causing the split, then resolve it before writing the task into the body.
- **Refuse to log a plan task you believe is wrong without flagging it.** If the user insists, write it, but note the dissent in the plan body — either inline next to the relevant task or in a `## Notes` / `## Open questions` section at the bottom. Example: `Note: task 3 logged as user-chosen; recommended <other approach> because <why> — flagged for implementer to revisit.`
- **Keep the plan owned by the evidence.** The goal is not for either side to win. The goal is to emit a plan that survives the implementation phase because the relevant context, objections, and trade-offs were actually considered.

If you believe the user is about to commit a task into the plan that is wrong, refuse to log it silently. Either resolve the disagreement first, or write it with the dissent included in the plan body alongside the relevant task or in a notes section. The implementation phase is where unflagged bad plan calls become expensive — this is the last cheap moment to push back.

## Inputs

Accept ONE of the following four input forms as the starting point of the walk. Detect which form was passed before opening the conversation:

1. **A spec artifact path** under `docs/threads/<thread>/specs/<UTC>-v<N>-spec.md`. The spec is the most common upstream input — its semantic-contract elements (intended outcome, expected behavior, constraints, acceptance guidance) drive the plan's task list directly.
2. **A proposal artifact path** under `docs/threads/<thread>/proposals/<UTC>-<kebab-desc>-proposal.md`. When the input is a proposal rather than a spec, the walk elaborates the proposal's rough shape into an implementable sequence; the proposal's open questions are items the walk either resolves or surfaces in the plan.
3. **A decision-log artifact path** under `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md`. The log carries one or more settled decisions with sequential `## D<N>: <Title>` headings. Each settled decision may map to a task (or constrain one) — cite the source log by absolute path + `D<N>` where the decision is operative in the task description.
4. **A GitHub issue URL or identifier**. Accepted forms include a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short `owner/repo#NNN` form. The issue body becomes the starting context; treat the issue title and labels as additional framing.
5. **A raw user prompt**. When no artifact is referenced, the user's prompt is itself the input — the plan is forward-designed directly from the conversation, with no upstream artifact backing it.

If the input is ambiguous — multiple plausible specs share the same version number in the thread, multiple decision logs cover overlapping topics, the issue identifier is incomplete, the prompt references "the spec" with no clear referent — ASK the user which artifact is intended. There is no global "latest input" algorithm. Do not silently pick by recency.

## Plan Artifact Contract

Every task in the emitted plan MUST be **sequential, isolated, independently implementable, and independently reviewable**.

- **Sequential** — tasks are numbered in execution order. The order is the only execution graph supported.
- **Isolated** — a task does not read or write state from other in-progress tasks in the same plan beyond what is explicitly captured in its description. If two tasks need to share state, that state must be written into an artifact the second task reads, not left in implicit cross-task memory.
- **Independently implementable** — a single implementer (human or agent) can complete the task in one sitting given the task's stated input. If a task requires more than one sitting, it is too large and should be split. If a task cannot be started without first doing setup that belongs to another task, the prerequisite belongs in the plan as its own earlier task.
- **Independently reviewable** — a reviewer can verify the task succeeded from observable evidence: a file written, a behavior observable, a test passing, a configuration changed. If success is not externally observable, the task is under-specified.

Loose-granularity tasks satisfy this contract just as prescriptive tasks do; the difference is the level of detail in substeps, not the contract itself.

During the walk, the anti-sycophancy stance and this contract reinforce each other: a task the user proposes that does not satisfy independent implementability or independent reviewability is a candidate for push-back, not a candidate for silent logging.

## No Parallelization

Plans produced by this skill are strictly sequential. Plan bodies MUST NOT contain wave numbers, dependency arrays, task-graph notation, fork/join syntax, depends_on fields, parallelization markers (bracketed wave prefixes on tasks, `parallel:` blocks), or any other construct that suggests tasks may run concurrently.

- **Wave numbers**: do not emit. Tasks execute in numbered order.
- **Dependency arrays / depends_on fields**: do not emit. The implicit dependency is "the previous numbered task ran first".
- **Task graph notation**: do not emit. No DAG, no Mermaid graphs of task relationships, no arrows between tasks.
- **Parallelization markers**: do not emit. No bracketed wave prefixes on tasks, no `parallel:` blocks, no fork/join indicators.

These constructs mislead downstream readers about the execution model. If during the walk the user proposes parallel execution, push back per the `## Anti-Sycophancy Stance`: the plan is not the place to express parallelism. Either the upstream spec needs to be revisited or a separate discussion needs to settle the execution model — neither belongs in this plan body.

## Loose Plan Body Shape

A loose plan body is **numbered tasks with brief 1–3 sentence descriptions per task**. Optimize for a human-leaning implementer who will read the task, infer the obvious substeps, and execute. Do not turn every task into a checklist; the brevity is the point.

Each task MUST contain at minimum:

1. An **objective sentence** stating what the task accomplishes. One sentence is enough.
2. **Observable verification** — one sentence stating how a reviewer (or the implementer) will know the task succeeded. A file path, a behavior, a test name, an output to inspect.

Each task MAY add a third sentence noting context, the input it consumes, or a constraint that affects execution. Three sentences is the ceiling — past that, the plan is sliding into strict granularity and the executor should consider switching to a prescriptive, step-by-step plan style instead.

The plan body uses freeform markdown. The walk MAY suggest a section heading scaffold (for example `## Goal`, `## Tasks`, `## Notes`) but it is NOT required — a plan that opens with a one-line goal and a numbered task list is acceptable provided every task satisfies the plan artifact contract. Section headings should help the downstream reader, not bloat the artifact.

Do NOT add YAML frontmatter to the plan body. The filename is the identifier; the body is plain markdown. Lineage between plan versions lives in the filename and the surrounding thread, not in metadata on the file.

### Worked Example

A tiny loose plan body. Note: only sequential numbered tasks. No wave numbers, no depends_on array, no bracketed wave prefixes, no fork/join syntax.

```markdown
# Migrate auth middleware to JWT

## Goal
Replace the legacy session-cookie middleware in `src/middleware/auth.ts` with a JWT-based check that reads from the `Authorization` header.

## Tasks

1. Add JWT verification helper at `src/lib/jwt.ts` exposing `verifyToken(token: string)` returning a typed payload or null. Verify: unit test in `src/lib/jwt.test.ts` covers a valid token and an expired token.
2. Replace the session-cookie lookup in `src/middleware/auth.ts` with a call to `verifyToken` on the `Authorization` header. Verify: existing integration test `tests/auth.spec.ts` passes against a request carrying a valid JWT.
3. Remove the legacy session-cookie code path from `src/middleware/auth.ts` and delete the `src/lib/session-cookie.ts` helper. Verify: `grep -r session-cookie src/` returns nothing and the integration tests still pass.

## Notes

The JWT secret is read from `process.env.JWT_SECRET` — no plan task introduces the secret; the deploy environment provides it.
```

That is what a loose plan looks like: three tasks, each one objective sentence + one verification sentence (task 1 adds a third context sentence for the helper signature), no parallelization, sequential execution order. A human implementer reads it and knows what to do without needing prescriptive substeps.

## Self-Review

The walk closes WITH the self-review pass BEFORE emission. Run the following four-check pass IN-SESSION against the drafted plan body. The emitted plan body does NOT contain a "self-review notes" section — the artifact stays clean. Self-review is a quality discipline, not output.

1. **Coherence** — does the plan, executed end-to-end, actually achieve the input artifact's goal? If the input is a spec, does completing every plan task satisfy the spec's intended outcome and acceptance guidance? If the input is a proposal, does the plan elaborate the proposal's rough shape into a complete implementable sequence?
2. **Granularity fit** — is loose granularity appropriate for THIS input and THIS expected implementer? If the input has many implicit substeps the implementer would need spelled out (e.g., a downstream agent-leaning consumer, or a tricky migration with non-obvious ordering), flag this to the user and recommend switching to a prescriptive, step-by-step plan style instead.
3. **No under-splitting** — is every task independently implementable in one sitting? A task that bundles "redesign the schema and rewrite the migration runner and update every caller" is three tasks, not one. Split it.
4. **No over-splitting** — are any tasks trivial 1-line tasks that bloat the plan? A task that just says "add a comment to `foo.ts`" is not a plan task; fold it into an adjacent task. Loose plans favor fewer, meatier tasks over many tiny ones.

Run the four checks against the drafted plan body. If any check fails, revise the draft IN-SESSION with the user (the `.wip/` draft is editable) before emitting. After the four checks pass, write the artifact. The walk produces drafts under `.wip/` (editable); the immutability lock applies at write into `plans/`.

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user — do not silently pick the most recent UTC stamp. If no thread exists, ASK where to create one OR auto-create when the input's slug is obvious.

2. **Resolve and read the input artifact (if any).** Detect which of the five `## Inputs` forms was passed. For a path input, read the file. For a GitHub issue, fetch the issue body and title (the user's invocation context is responsible for credentials). For a raw prompt, the prompt itself is the seed. If multiple plausible inputs match the reference (two specs at the same version, two decision logs on the same topic), ASK which is intended. Do not pick by recency.

3. **Walk the input task-by-task with the user.** Open the conversation with the input's intended outcome restated in one or two sentences, then propose the first task or ask the user to. For each candidate task: confirm the objective sentence, confirm the observable verification sentence, push back per the `## Anti-Sycophancy Stance` when warranted, adjust granularity in conversation (split if the task is too large, fold if it's too trivial). Move to the next task. The task list emerges through the walk, not from a pre-built checklist.

4. **Reference, do not copy, settled decisions from upstream input.** When the user references a decision from the input (or one already settled in a referenced decision log), cite the source artifact by its path at the inline location where the decision becomes operative in the relevant task description. Do not paste decision text into a freestanding plan section. Cross-document references must include the full path of the source document.

5. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time. Stamp once and reuse — never re-derive after writing.

6. **Run self-review.** Execute the four checks from `## Self-Review` against the drafted body, with the user in the loop. Revise the draft in `.wip/` (or in memory) until all four pass. The emitted body does not contain self-review notes — the discipline runs before emission.

7. **Write the artifact.** Create `docs/threads/<thread>/plans/<UTC>-v1-plan.md` (first emission defaults to NO `<kebab-descriptor>` — the mainline integer-only file is the canonical first form). The `plan` artifact-type suffix is MANDATORY. The `plans/` folder is created on-demand. The plan body is plain markdown — no YAML frontmatter on the plan itself.

8. **Confirm.** Tell the user: `Plan written: <relative-path-to-the-file>`. No closing remark, no summary.

## Decision Log

This skill does NOT auto-write a separate decision log. The default behavior is to capture the plan artifact only — most plan authoring is captured fully inside the plan body, with settled decisions cited inline and any push-back items the user proceeded past noted alongside the relevant task or in a `## Notes` / `## Open questions` section at the bottom. A decision log is written ONLY if durable trade-offs or rejected alternatives emerge during the walk that cannot reasonably be captured in the plan body itself — for example, a major sequencing alternative the user considered and rejected with rationale that downstream readers will need to understand independently of the plan.

When such a decision log IS warranted, write it to `docs/threads/<thread>/discussions/<UTC>-<kebab-desc>-decision-log.md` (record form, `decision-log` artifact-type token). Use an append-only, sequential-heading shape — `## D<N>: <Title>` headings with `Decision:` and `Rationale:` lines. If a dissent was flagged during the walk per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim. The plan body cites the new log by absolute path + heading at the inline locations where its decisions are operative — do not copy decision text from the log into the plan.

When in doubt about whether a side-conversation rises to "durable trade-off" status, ASK the user. The default is no decision log.

## Scope Drift

When the user introduces a branch that is outside the plan being authored, do not silently follow them and do not let the plan grow into a different shape than the one being discussed. Propose ONE of:

1. **Park as an Inbox item** (PREFERRED for non-blocking side-findings). Capture a short markdown record at `docs/threads/<thread>/inbox/open/<UTC>-<kebab-desc>-inbox-item.md` so the side-finding survives without polluting this plan.
2. **Split into its own plan or discussion thread.** When the branch is itself worth a dedicated plan or a multi-decision discussion, start a new artifact rather than expand the current plan beyond its intent.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Filename and Folder

The plan artifact uses the versioned-form filename grammar:

```text
<YYMMDDHHMMSSZ>-v<N>[-<kebab-descriptor>]-plan.md
```

Rules:

- The 12-character UTC stamp `YYMMDDHHMMSSZ` comes first, captured at write time and never re-derived afterward.
- `N` starts at `1`, not `0`. First emission is `v1`. There is no `v0`.
- First emission defaults to NO `<kebab-descriptor>` — the mainline integer-only file is `<UTC>-v1-plan.md`.
- A `<kebab-descriptor>` marks the file as a candidate or variant for mainline `v<N>` (e.g., parallel drafts as `v1-opus-plan.md`, `v1-sonnet-plan.md`, with the promoted file becoming `v1-plan.md`).
- The `plan` artifact-type token is MANDATORY in every plan filename.
- The `v<N>` segment names the TARGET version this artifact represents — not a predecessor it derives from.

Canonical first-emission example:

```text
260521120000Z-v1-plan.md
```

Example with descriptor (parallel candidate for the same target version):

```text
260521120000Z-v1-auth-migration-plan.md
```

The file lands at `docs/threads/<thread>/plans/<filename>`. The `plans/` folder is created on-demand on the first plan written for the thread; do not pre-create empty folders.

## Immutability

Emitted plan artifacts are immutable. Once the file is written into `plans/`, it is part of the thread's reviewable history and is not edited. A typo discovered in an emitted v1 plan means emitting a new version (`v2`), not an in-place edit. The same rule applies to every subsequent version — `v2` is locked once written, and a revision to `v2` means emitting `v3`. Never edit a plan file in place after it lands in `plans/`.

Drafts under `docs/threads/<thread>/.wip/` are editable until emission. While composing the plan body in scratch space (or in memory) during the walk, revisions are free. The lock applies the moment the file is written into `plans/` under the canonical filename grammar. The same rule applies to the optional decision log: append-only records, no in-place edits after emission.

No source-relation YAML frontmatter is added to the plan body — lineage lives in filenames and the surrounding thread, not in metadata on the file. The accepted trade-off is that a filename cannot tell whether `v2` came directly from `v1`, from a `v2` candidate variant, or from a merge — that history is recovered from the thread itself, not from the file.

## Commit Policy

This skill NEVER commits the emitted plan automatically (or the optional decision log). Commits happen only if the surrounding session explicitly requests one. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

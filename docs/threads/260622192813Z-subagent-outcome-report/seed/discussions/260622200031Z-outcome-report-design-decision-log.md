# Decision log — implementer-subagent outcome report design (the seed)

Thread: docs/threads/260622192813Z-subagent-outcome-report/
Target: seed/seed.md
Subject: settling the design of a structured implementer-subagent → orchestrator outcome report (a "verification index, not a verdict") for the subagent-driven implement skills — status vocabulary, weight/core fields, format, de-duplication against the orchestrator's diff check and the reviewers, reviewer states, and scope.

Premise treated as settled foundation going in (from the seed + the blind expert consultation): the implementer's return is a structured **claim set** the orchestrator treats as an index of what to verify, never as evidence of correctness ("verify, don't trust"); and the status model is **two-level** — the implementer reports a *claim*, the orchestrator synthesizes the *verified verdict*.

## P1: Implementer claimed-status vocabulary

Point: The implementer subagent's claimed `status` field — its vocabulary, and whether it's a distinct vocabulary from the orchestrator's existing four-state verdict.

What you need to know:
- Today, `DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT` is the *orchestrator's* synthesized verdict, reported per task (skill §Four-State Status Protocol).
- The new model adds an implementer-level `status` as a *claim* (the index). So we now have two status fields at two levels, and we have to decide whether they share a vocabulary.
- The expert proposed `completed / partial / blocked / failed / no-op` for the subagent's claim.
- The core tension (as presented): `DONE_WITH_CONCERNS` is a post-verification judgment — the implementer can't legitimately make it (it can't know which concerns survive the reviewers). And there's no four-state slot for `no-op` (task already satisfied, empty diff). Meanwhile the gating decision itself is binary (`completed` → verify; anything else → route), but the finer values tell the orchestrator how to route (provide context vs. escalate vs. stop).

Decision: Reuse the existing four-state vocabulary — `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`, **uppercase** — at the implementer level as an untrusted **claim**, with the orchestrator's same-named four-state remaining the verified **verdict**. The claim and the verdict ride the same 4-point scale; they are different epistemic objects (untrusted index vs. verified verdict) and a competent run can show them differing. No fifth `NO_OP` token: a task already satisfied (empty diff) is claimed `DONE` with a mandatory note ("no changes needed; already satisfied because X"); the orchestrator's job on empty-diff-plus-`DONE` is to confirm the task was genuinely already satisfied.

Rationale: This reverses my initial recommendation (a distinct claim vocabulary). The owner's argument overturned my "an implementer can't emit `DONE_WITH_CONCERNS`" objection: I had conflated the orchestrator's post-verification verdict ("concerns survived the reviewers") with a *claim* ("I'm calling this done but I worked around something / made a judgment call / couldn't hit it 100% — flagging it"). The claim form is coherent and is exactly the mechanism the seed's highest-value idea wants: the implementer's reservations become first-class input the orchestrator routes to the reviewers, who return the definitive answer. Bonus that decided it: when claim and verdict share one 4-point scale, the orchestrator's job collapses to "confirm or adjust the claim," and the gap between a claim and its verdict becomes a legible audit signal (a claimed `DONE` not confirmed by the reviewers is a caught over-claim). Uppercase keeps a future CLI gripping one token set, not two. `NO_OP` was rejected because it would gate identically to `DONE` (so it buys no routing difference), the empty diff is visible on disk regardless, and folding it into `DONE`+note preserves the single-vocabulary win. The trade-off accepted: one vocabulary now does double duty (claim and verdict), so the skill MUST state plainly that the implementer's token is untrusted and the orchestrator's same-named token is the verified verdict, or a reader/CLI will conflate "implementer said DONE" with "this is DONE."

## P2: Verdict behavior — fix-loop-first, and the meaning of the terminal verdicts

Point: Verdict behavior — fix-loop-first, and what `BLOCKED` / `NEEDS_CONTEXT` mean as *terminal* verdicts.

What you need to know: P1 settled the vocabulary; this settles what the orchestrator *does* with it. The risk we're closing is that "verify the claim" gets misread as "claim fails → stop." The existing skill already loops fixes; we're making that explicit in the new model and scoping the two terminal verdicts tightly.

Decision:
- A claimed `DONE` / `DONE_WITH_CONCERNS` that the reviewers don't confirm → **the fix loop** (respawn a fresh implementer, re-review, repeat until `PASS`). This is the normal path; it never produces a `BLOCKED` verdict by itself. The only fix-loop exit to `BLOCKED` is genuine **non-convergence** (the loop demonstrably isn't closing).
- **`BLOCKED` (terminal)** = there is no way to implement it from here — a hard external impossibility (example: the task needs a live API but the device is offline). Not "a reviewer found issues."
- **`NEEDS_CONTEXT` (terminal)** = an important judgment call that *neither* the implementer *nor* the orchestrator can make independently. Rare by construction, because the spec and plan discussion flows already resolve those calls upstream — a call surviving to implementation is itself the signal.
- Both terminal verdicts are **extremely rare** outcomes, not routine.
- **Sanity-check nuance (accepted):** a *claimed* `BLOCKED` or `NEEDS_CONTEXT` from the implementer is still an untrusted claim under "verify, don't trust." The gating rule ("negative → route the signal, don't run the reviewers") holds, but *route ≠ rubber-stamp*: before the orchestrator halts the whole run on a claimed `BLOCKED`, it cheaply confirms the blocker is real, and where it smells like premature give-up rather than true impossibility it may throw one fresh implementer at it.

Rationale: The claim↔verdict gap is an audit signal, not a stop condition — the remedy for a caught over-claim is to drive a fresh implementer at it, which is what the existing skill's fix loop already does; this decision makes that explicit under the new claim model and prevents "review failed" from collapsing into a `BLOCKED` verdict. Scoping `BLOCKED`/`NEEDS_CONTEXT` to genuine impossibility and un-resolvable judgment calls keeps them rare, which is the owner's explicit goal; the spec/plan discussion flows are the upstream reason a surviving `NEEDS_CONTEXT` is exceptional. The sanity-check nuance is the practical defense against the one real "false negative" failure mode (a subagent quitting too early): it costs little, it reinforces rather than fights the "rare terminal" goal, and it stays consistent with the gating asymmetry because confirming a blocker is the orchestrator's own judgment, not a reviewer pass on incomplete work.

## P3: The report's field set, and the principle that governs it

Point: The report's field set — the mandatory core vs. optional fields, and how the optional set scales.

What you need to know:
- The governing principle from the seed is **compose, don't duplicate**: a field earns its place only if it carries epistemic state the diff can't show, *and/or* it becomes a **claim** something downstream already verifies (orchestrator's diff check, the plan-compliance reviewer, or a rerun).
- What the implementer **already returns today**: a 2–3 sentence prose summary **plus the list of modified files**. So a files list is not new weight — it's already in the return contract; we'd just be formalizing it.
- The seed's proposed core: `status` + one-line summary + `assumptions` + blockers/open-questions. It puts `files_changed`, `requirements_addressed`, `validation`, and `known_risks` in the *optional/heavier* bucket.
- I initially proposed moving the `files_changed` list into the core (arguing it was already returned and the cheapest cross-check). The owner challenged that: the orchestrator can derive changed paths from `git diff` on its own, so what does a *claim* add?

Decision: Adopt a leaner field set, governed by a sharpened principle.

**Governing principle (supersedes the loose "compose, don't duplicate"):** a field earns a place in the report ONLY by the diff-blind intent or reasoning it carries. Anything the orchestrator or a reviewer can re-derive from ground truth — the diff, the plan, or a rerun — is redundant as a claim. The diff is ground truth for *what changed*; the report exists only for *why / what-was-assumed / what-couldn't-be-known*.

**Field set:**

| Bucket | Fields |
|---|---|
| **Mandatory core** | `status` · `summary` (1–3 sentences) · `assumptions`/judgment-calls · `blockers` & `open_questions` |
| **Optional, scaled** | `validation` (extra-run + deliberately-skipped, with reasons) · `known_risks` |

**Exclusions (caught by the razor):**
- **`files_changed` — dropped, not even optional.** Paths are free from `git diff`, and the plan-compliance reviewer already runs the expected-files check in both granularities (strict: against the plan's authoritative `Files modified`; loose: by inference from the task objective + verification statement). The claim is fully redundant.
- **`requirements_addressed` — no dedicated field.** The plan-compliance reviewer already maps the diff to each acceptance criterion (SATISFIED / MISSING / PARTIAL), so the *list* is reviewer-derivable. Any genuinely diff-blind reasoning for a non-obvious mapping goes in `assumptions` instead.
- **`validation` keeps only its diff-blind half:** the prescribed-test result is re-derivable (the reviewer reruns the verification block); what survives is what the implementer ran *beyond* the plan and what it *deliberately did not run, and why* (which disk and rerun cannot reveal).

**Marquee mechanism intact:** `assumptions` (and `known_risks` when present) are the fields **routed to the reviewers** — the diff-blind input a reviewer staring at the diff alone cannot see.

**Granularity twist (scaling):** loose plans lean on `assumptions` + `validation` (more was inferred; no prescribed verification block to lean on); strict plans need neither coverage-style field because the plan + the plan-compliance reviewer already carry that load.

Rationale: This reverses my push to put `files_changed` in the core. The owner's challenge was correct and exposed a sharper principle than the seed's "compose, don't duplicate": the test is not "is it cheap to include" but "does it carry anything the orchestrator doesn't already have from ground truth." Under that razor `files_changed` fails outright (diff + reviewer already cover it) and `requirements_addressed` fails too (reviewer-derivable list), so both are excluded — landing the core back at exactly the seed's proposal (status + summary + assumptions + blockers/open-questions). `validation` and `known_risks` survive only for their diff-blind content. The net effect is a leaner artifact that is more faithful to the "verification index, not a verdict" premise: the report says only what the diff cannot, and every other claim is left to the ground-truth check that already exists. No dissent — the owner's reasoning improved the design; my initial position was the weaker one.

## P4: Serialization format

Point: The report's serialization format.

What you need to know:
- This builds on a seed premise: the outcome report is a **transient `.wip/` scratch file** the orchestrator reads as the verification index — not a committed record. The durable bits fold into the implementation report (Markdown).
- Its **sibling `.wip/` files** are the reviewer review files: **Markdown with a greppable `Verdict: PASS|ISSUES` line** the orchestrator already reads.
- By contrast, review *records* (not scratch) use **YAML frontmatter** `status:` maps. So the repo has precedent for both — body-line for scratch, frontmatter for records.
- The field set we settled (P3) is **one hard enum** (`status`, which gating depends on) plus **mostly prose** (`summary`, `assumptions`, `blockers`, `validation` reasons, `known_risks`). The prose fields are *consumed as prose* — `assumptions` get pasted into a reviewer brief; `blockers` are read by the orchestrator's judgment.
- The orchestrator reading it **today is an LLM**; the **stated direction** (sibling thread) is a deterministic orchestrator / CLI, which favors machine-parseable.

Decision: **A — pure Markdown, mirroring the reviewer `.wip/` scratch files.** Heading + labeled prose sections, with `status` on a greppable line (`Status: <TOKEN>`) exactly as the reviewer files put `Verdict: PASS`. The natural upgrade path (recorded, not adopted) is **B — YAML frontmatter + Markdown body** — to be taken the day a deterministic CLI needs to parse more than `status`; that migration is trivial and local to this one file, so it is not pre-paid now. Pure structured YAML/JSON (C) was rejected as over-engineered for a transient, LLM-consumed scratch file and as hostile to the multi-sentence reasoning fields.

Rationale: The only field that must be parsed deterministically is `status`, and a greppable `Status:` line serves that identically to frontmatter — the reviewer files already prove the orchestrator greps a status line reliably. Every other field is reasoning consumed as natural language, where Markdown wins and YAML/JSON loses (both for today's LLM orchestrator and for a human debugging the `.wip/` file). A keeps the outcome report a clean sibling of the reviewer scratch files it sits beside, adding no new convention. The CLI/determinism pull is real but does not bite here, because the gate signal (`status`) is equally parseable as a line; the heavier B is held in reserve as a cheap, local upgrade rather than paid for speculatively.

## P5: The file's existence contract — no file for a plain DONE

Point: When is a `.wip/` outcome file written at all? (Raised by the owner: if the implementer's outcome is a clean `DONE`, can it just return the token in its reply rather than writing a "done" state file?)

What you need to know:
- A *plain* `DONE` is, by P1's definition, "no concerns to surface," and by P3 its core-beyond-`status` is empty (no assumptions, no blockers, no risks). So the file in that case would contain only `Status: DONE` plus a summary that P3 already declared non-load-bearing (context, not a verification target).
- The orchestrator's verification of a `DONE` is "run the reviewers against the diff." With no assumptions to route, the reviewers need nothing from the file — so the file would carry nothing the reply doesn't already carry and nothing anyone reads.
- Counter-argument considered (standardize / always-write): uniformity for the future CLI — "always read `<path>`" beats "branch on whether a file exists." Rebuttal: the gate signal (`status`) lives in the reply, which is always present regardless, so the CLI never lacks a deterministic signal and the no-file branch is simply "nothing more to read."

Decision: **The status token is always returned in the implementer's reply** (token + 1–3 sentence summary) — the always-present gate signal. **A `.wip/` outcome file is written only when the report carries diff-blind content** to persist (assumptions, blockers/open-questions, validation reasons, known-risks). In practice: **plain `DONE` → no file**; `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT` → file (a `DONE` that carries an assumption worth routing is by definition `DONE_WITH_CONCERNS`, so it too gets a file). When a file exists, the reply references its path, as the implementer's reply does today. The same "token-in-reply, file-only-when-content" rule plausibly extends to the reviewers (a `PASS` with no findings is their "plain DONE"), but that touches the reviewer contract and is parked for the reviewer-state decision rather than folded in here.

Rationale: The rule is not a special case — it makes the file's existence track the single question the artifact exists to answer: "is there diff-blind content?" Writing a file for a plain `DONE` would carry nothing readable and would violate the same razor (P3) used to delete `files_changed`. The optimization costs nothing real: the reply always carries the gate token, so neither the LLM orchestrator today nor a deterministic CLI later loses a signal, and the durable summary survives via the orchestrator's per-task report and the implementation report rather than via a transient gitignored file. The reviewer symmetry is flagged so it is decided deliberately, not by accident.

## P6: Reviewer verdict set — a "can't assess" escape beyond PASS | ISSUES

Point: Do the reviewers need a "can't assess" verdict beyond `PASS | ISSUES`?

What you need to know:
- Gating (P2) already removes the most common can't-review case: reviewers only run on a claimed `DONE`/`DONE_WITH_CONCERNS`, so genuinely incomplete work never reaches them. What's left is the rarer case — a reviewer that cannot make a determination on claimed-complete work: the verification block needs infra it can't reach (offline API, no DB), or assessing a surfaced assumption requires a judgment call it can't make alone.
- Today the reviewer must then force one of `PASS` or `ISSUES`, and both corrupt the signal: a false `PASS` advances unverified work (defeats "verify, don't trust"); a false `ISSUES` triggers a fix loop on a non-issue → the implementer thrashes → non-convergence → `BLOCKED`.
- P1/P2 already established a shared terminal vocabulary (`BLOCKED` / `NEEDS_CONTEXT`) that means the same thing for any actor: "I can't do my job; here's why," and the orchestrator routes it.

Decision: **Option A — full symmetry. Reviewer verdict ∈ `{PASS, ISSUES, BLOCKED, NEEDS_CONTEXT}`.** `PASS`/`ISSUES` remain the normal binary review outcome; `BLOCKED` ("can't run the verification — an impossibility") and `NEEDS_CONTEXT` ("assessing needs a judgment call I can't make alone") are rare escape verdicts that route to the orchestrator's matching terminal verdicts via the P2 routing logic. Both reviewers (plan-compliance and code-quality) share this set.

Rationale: Once P1/P2 made `BLOCKED`/`NEEDS_CONTEXT` shared "I-can't-do-my-job" tokens, a reviewer is just another actor that can hit them; reusing both keeps one model across all actors and lets the orchestrator route reviewers with zero new logic. The cost is a couple of sentences in each reviewer prompt; the benefit is closing the corrupted-signal failure mode (false `PASS` advancing unverified work, or false `ISSUES` driving a fix-loop thrash to non-convergence). Option B (a single generic escape token, orchestrator classifies) was rejected as a near-but-not-quite-matching second vocabulary; Option C (defer / status quo) was rejected because the failure it leaves open is precisely the wasteful loop the gating redesign exists to eliminate.

## P7: Reviewer file existence — no file for a no-findings PASS

Point: Apply P5's fileless rule to the reviewers (the parked symmetry).

What you need to know: A `PASS` with no findings carries only `Verdict: PASS` plus references (plan path, modified files) that are themselves derivable — so the file is nearly empty, the reviewer analog of a plain `DONE` outcome. The orchestrator reads the verdict to decide advance-vs-fix-loop; that verdict can come from the reply just as the implementer's status does (P5). The durable audit is the orchestrator's per-task report (which records each reviewer's verdict and the fix-iteration count), not the transient gitignored review file.

Decision: **A reviewer returns its verdict token in its reply always; it writes a `.wip/` review file only when there is diff-blind content to persist** — `ISSUES` (the findings the fix-implementer needs), `BLOCKED`, or `NEEDS_CONTEXT` (the reason the orchestrator routes). A **no-findings `PASS` → token in the reply, no file.** Symmetric with P5.

Rationale: Same razor as P5 — the file's existence tracks "is there content anyone reads?" A no-findings `PASS` file is read by no one (the fix loop only fires on `ISSUES`, and the verdict itself is in the reply), so it is ceremony. Applying the identical rule to implementer and reviewers keeps one uniform contract across actors: the cheap gate token always rides the reply; a file appears only when there is diff-blind content to carry.

## P8: Wiring the marquee idea — routing surfaced assumptions to the reviewers

Point: How do surfaced assumptions actually reach the reviewers? (The marquee idea's wiring.)

What you need to know:
- The seed's single highest-value idea is "surface assumptions so the reviewers see them" — a bug often hides in a forced assumption a reviewer can't see from the diff alone. Assumptions have a home (P3 core field) and a persistence rule (P5: a `DONE` carrying a routable assumption is `DONE_WITH_CONCERNS`, so a file exists). What's unwired is the hand-off: assumptions in a `.wip/` file do nothing unless the orchestrator actively feeds them into the reviewer briefs and the reviewer method tells the reviewer to assess them.
- The flow runs: plan-compliance reviewer first → fix loop → code-quality reviewer second. And every implementer dispatch is fresh — each fix iteration is a new implementer that may make its own new assumptions.

Decision: Adopt the proposed mechanism, routing to **both reviewers**:
1. Every implementer dispatch (initial and each fix) emits its report per P1–P5; when it carries assumptions/known-risks, the orchestrator reads them from the `.wip/` file.
2. The orchestrator injects that dispatch's assumptions/risks into the brief of the review pass that checks it — into **both** reviewers (plan-compliance and code-quality), since an assumption can be a compliance concern ("I read the acceptance criterion as X") or a quality/correctness concern ("I assumed the API returns camelCase"). The orchestrator does **not** pre-classify them; it passes the list, and each reviewer assesses only what falls in its own lens and ignores the rest.
3. Each reviewer method gains one step (a concrete edit to both `references/*-reviewer.md` prompts): "If the brief includes implementer-surfaced assumptions, assess each one within your lens. An unsound or unverifiable assumption is an `ISSUES` finding; if validating it needs a judgment call you can't make, that's `NEEDS_CONTEXT`."
4. Routing is **per-dispatch**: a fix implementer's new assumptions flow to the re-review that checks that fix — assumptions never go stale across iterations.

Rationale: This closes the claim→verify loop on its highest-value field — the implementer *claims* an assumption, the reviewer *verifies* it against diff + codebase, and an unsound one becomes a finding that drives a fix exactly as a plan-compliance miss does. Routing to both reviewers (rather than only code-quality) was chosen because assumptions split across both lenses and making the orchestrator pre-classify them would put judgment in the wrong actor; passing the full list and letting each lens self-filter is simpler and loses nothing. Per-dispatch routing keeps the mechanism correct across the fix loop, where fresh implementers introduce fresh assumptions.

## P9: Scope — which skills get the design, and how much

Point: Scope: which skills get this, and how much of it?

What you need to know:
- The design (P1–P8) is fundamentally about a **context boundary**: an untrusted claim crossing from a separate-context subagent to the orchestrator, directing verification it can't do itself. That boundary is the whole reason for the `.wip/` artifact, the claim/verify gating, and status-as-untrusted-claim.
- The two subagent skills (`implement-plan-with-subagents-auto` and `-interactive`) both have that boundary, so the full design applies to both; the interactive variant differs only in ask-before-acting behavior. "Both subagent skills, full design" is the settled core scope.
- The open question is the single-agent implement skills, which self-review (same context implements and reviews). There is no boundary to bridge — the agent knows its own assumptions and there is no separate reviewer to route them to — so most of the machinery is moot there. But the content discipline of explicitly naming assumptions could still sharpen the self-review and enrich the implementation report.

Decision: **Option A.** Both subagent skills get the full design (P1–P8). The single-agent implement skills get the **content discipline only**: they explicitly surface assumptions / judgment-calls / known-risks as (1) an input to the self-review pass and (2) a distinct category in the implementation report — with **no** `.wip/` outcome artifact, **no** claim/verify gating, and **no** status-as-untrusted-claim. Full machinery (C) and leave-untouched (B) were both rejected.

Rationale: The full apparatus only earns its weight across a context boundary, so porting it to a single context (C) would be ceremony contradicting the leanness the workflow was just given. But the idea behind it — never let a forced assumption hide from review — is boundary-independent and worth porting cheaply as a content requirement, which leaving the skills untouched (B) would forgo; an assumption is not the same as a deviation (it is a forced choice under ambiguity, which may not deviate from the plan at all), so a pre-existing deviations section does not already cover it. Option A captures the marquee benefit everywhere while keeping the heavyweight artifact only where the boundary justifies it.

## P10: The `.wip/` outcome-file path and naming convention

Point: The `.wip/` outcome-file path and naming convention.

What you need to know:
- The reviewer scratch files already set the pattern: `docs/threads/<thread>/.wip/<UTC>-task-<N>-plan-compliance-review.md` and `…-code-quality-review.md` — role + artifact-type, UTC-stamped, in the thread's gitignored `.wip/`.
- Per the existing subagent-brief contract, the orchestrator names the output path and hands it to the subagent in the brief (the subagent doesn't invent it).
- The fix loop means a task can have several implementer dispatches; each fresh dispatch captures its own UTC stamp at write time, so files never collide (the same way re-reviews are disambiguated today).

Decision: Mirror the reviewer convention exactly:
```
docs/threads/<thread>/.wip/<UTC>-task-<N>-implementer-outcome.md
```
The orchestrator constructs this path and names it in the implementer's brief; the implementer writes there **only when there is diff-blind content** (P5); the reply carries the token always and the path when a file was written. The `<UTC>` prefix disambiguates fix-loop dispatches — no separate iteration index needed. Suffix chosen: `-implementer-outcome` (concise, actor-named, paralleling the function-named reviewer files), not the heavier `-implementer-outcome-report`.

Rationale: Consistency with the sibling reviewer scratch files is the whole point — same folder, same `<UTC>-task-<N>-<role>-<type>` grammar, same orchestrator-names-the-path contract — so nothing new has to be learned and the `.wip/` folder reads uniformly. Relying on the UTC stamp for fix-loop disambiguation matches how re-reviews already work, avoiding an extra iteration-index concept.

## P11: The report's section template (field headings + validation shape)

Point: The report's section template (field headings), including the `validation` shape.

What you need to know: The reviewer files use a tight template — heading with `— Task <N>`, a greppable verdict line, labeled sections, then `References:`. The outcome file should read as a sibling. Per P5 the file exists only when there is diff-blind content, and per P3 it must not re-list modified files (the diff is ground truth).

Decision: Adopt this template — fixed field order, `Status` and `Summary` always present, every other section omitted when empty (the file's existence already implies at least one is non-empty):

```markdown
# Implementer Outcome — Task <N>

Status: DONE_WITH_CONCERNS

Summary: <1–3 sentences>

Assumptions:
1. <forced choice / judgment call made under ambiguity>
2. <…>

Blockers & open questions:
1. <what halted progress, or what the implementer is unsure of>

Validation:
- Ran: <checks run beyond the plan's verification block, + result>
- Not run: <what was deliberately skipped, + why it couldn't/shouldn't run>

Known risks:
1. <hazard the diff might carry that a reviewer can't see>

References:
- Plan: plans/NNN[-<desc>]/plan.md (task <N>)
```

Baked-in rules: `Status:` is the one greppable line (P4); everything else is prose. The **`validation` field is a two-bucket `Ran` / `Not run` list** carrying only the diff-blind half (P3) — extra checks the implementer chose to run with results, and deliberately-skipped checks with reasons; the plan's prescribed verification is not restated (the reviewer reruns it). No modified-files list (P3); `References` points only at the plan task for human orientation. Empty optional sections are omitted, not written as "none."

Rationale: The template makes the outcome file a visual and structural sibling of the reviewer scratch files, so the `.wip/` folder stays uniform and a reader (or the orchestrator) finds the gate signal on the same kind of greppable line. Omitting empty sections rather than emitting "none" keeps the transient artifact minimal, consistent with the leanness the whole design has favored; the file only ever exists when it has something to say. The `validation` two-bucket shape encodes exactly the P3 decision that only the diff-blind half of validation earns inclusion.

Note on the reviewer-prompt edits (raised as a candidate point, NOT given its own record): the two `references/*-reviewer.md` edits are execution of P6/P7/P8, with no open design fork — (1) verdict vocabulary `PASS | ISSUES | BLOCKED | NEEDS_CONTEXT` with `BLOCKED`/`NEEDS_CONTEXT` as rare escapes (P6); (2) an assess-implementer-assumptions step (P8); (3) verdict-token-in-reply-always, file-only-on-non-PASS (P7). These fold into P6–P8 when specced and are recorded here only as a pointer.

## P12: The reviewer→orchestrator non-blocking-concern channel

Point: The reviewer→orchestrator non-blocking-concern channel (where `DONE_WITH_CONCERNS` actually comes from). Scoped into this discussion at the owner's call: the thread's real subject is the subagent↔orchestrator handshake, and the reviewer→orchestrator direction is half of it.

What you need to know:
- A reviewer today has only `PASS` (surfaces nothing) or `ISSUES` (→ fix loop). There is no channel for a concern worth recording but not worth a fix — a minor smell, a nit, an assumption that is probably fine but deserves a human's eye.
- This collides with two things: the skill's rule "`ISSUES` → always enter the fix loop," and its own `DONE_WITH_CONCERNS` examples ("a reviewer flagged a smell the orchestrator judged non-blocking"). Those can't both hold without a middle channel.
- After P8 it matters more: a reviewer assessing a surfaced assumption will often land exactly here — "not wrong enough to block, not clean enough to ignore."

Decision: Classify findings, not verdicts.
- Each reviewer sorts what it finds into **blocking findings** (must be fixed) and **non-blocking concerns** (record, don't fix). **When uncertain, treat a finding as blocking** — preserving the false-positive-catching bias.
- **The verdict reflects the blocking bucket only:** `ISSUES` iff ≥1 blocking finding (→ fix loop, exactly as today); otherwise `PASS`. This removes the current tension — non-blocking concerns are no longer `ISSUES`, so they never trip the loop, and "`ISSUES` → always fix" is unambiguously true again.
- **Non-blocking concerns ride a `PASS`** in a dedicated `Concerns:` section of the review file. This refines P7: a `PASS` *with concerns* **does** write a file (concerns are content), while a clean no-finding `PASS` still writes none — the "file iff content" rule is intact.
- **The orchestrator aggregates:** it folds non-blocking concerns (from the reviewers, plus any forwarded implementer assumptions/risks it judges worth carrying) into a `DONE_WITH_CONCERNS` aggregate verdict; all-clear → `DONE`. This is the precise definition of where `DONE_WITH_CONCERNS` comes from.
- **Division of labor (asymmetric override):** classification is the reviewer's (it has the lens expertise); the orchestrator **may escalate** a non-blocking concern into a fix if it disagrees, but **may not silently downgrade** a blocking finding into a mere concern.

Rationale: A middle channel resolves a real, pre-existing contradiction in the skill (ISSUES-always-loops vs. orchestrator-judged-non-blocking concerns) that the P8 assumption-assessment would otherwise hit constantly. Classifying findings (not adding a verdict) keeps the verdict vocabulary and the fix-loop trigger crisp: the loop fires on blocking findings only, and non-blocking concerns get a clean home that flows into the aggregate `DONE_WITH_CONCERNS`. The asymmetric override mirrors P2's stance — the easy direction is always toward *more* verification, never less — which is why the reviewer (more lens context, skeptical fresh context) owns the call and the orchestrator can only tighten it, not loosen it. "Uncertain → blocking" keeps the whole mechanism from becoming a backdoor for waving issues through. The alternative (orchestrator decides every finding's severity) was rejected for centralizing judgment in the actor with less lens context and inviting rationalization.

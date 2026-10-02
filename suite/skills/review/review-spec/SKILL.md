---
name: review-spec
description: Judge a thread's spec and delta documents as a downstream handoff and record any findings.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 0.0.0
---

# Review Spec

Assess a thread-root `spec.md` and every delta document under the thread's `delta/` as a downstream handoff, strictly read-only. The one question you answer: **could another agent plan and implement from this alone, without any hidden conversational context?** You read them as that downstream agent would, judge them against the axes below, and record any findings for later attention. You never touch the spec, a delta document, or any other artifact, and you produce no durable report — a clean spec earns a chat judgment and nothing on disk.

This is a quality-of-handoff and planning-readiness review; your concern is whether the documents, as written, are fit for someone else to act on safely.

## Inputs

Gather all of these before judging; the procedure below works from what you gather here.

- The project's `AGENTS.md`, when the file exists — the project's standing guidance for agents working in it.
- `docs/glossary.md`, when the file exists — the project's fixed terms, to be used in everything you write.
- `docs/adr/` and `docs/pdr/`, read via `/consult-decisions` — the project decisions bearing on the change's subject.
- The roadmap entry named by the seed frontmatter's `roadmap` mapping, when the seed carries one — the entry this thread answers: its sketch, its scope boundary and its planned behavior, found as the heading whose text is `roadmap.entry` in the index at `roadmap.path`.
- The thread's `spec.md` — the reviewed target; it comes in that one form, at the thread root, in the shape `<skill_path>/references/formats/spec.md` defines. Read it end to end at least once, as a downstream planner with no memory of the conversation that produced it.
- The thread's `delta/` — every delta document the thread holds, each read in full and against the shape `<skill_path>/references/formats/delta-document.md` defines, and each `create` under `delta/docs/adr/` or `delta/docs/pdr/` also against the shape `<skill_path>/references/formats/decision-record.md` defines, and each delta document targeting an agents file also against the shape `<skill_path>/references/formats/agents-file.md` defines. Read each `edit` and `delete` through the old/new rendering `check-delta.mjs` prints for it, rather than as escaped JSON strings. Inside the thread the delta takes precedence over the project records.
- The thread's `log.md` — the points the thread settled, the alternatives it rejected, and its `document` entries, which the record and coverage checks read the delta against.
- The thread's `seed.md` — why the thread exists.

Any other thread is history: it records how its own work was understood at the time, not what holds now, so do not read it unless the user or this thread's seed names it.

## Procedure

1. **Gather the inputs.** Read everything under `## Inputs` now, in that order. If the thread holds no `spec.md`, tell the user there is nothing to review, write nothing, and follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `REFUSED` and `no spec.md to review`.

2. **Judge against the readiness axes.** Assess the spec and its delta documents on each axis below (`## What you judge`). For every real weakness, form a finding: what is wrong, where it shows, why it would leave a downstream agent guessing or blocked, and a severity — `blocker` (planning cannot proceed safely), `issue` (a real gap that will cause rework or a wrong guess), or `nit` (soft or imprecise, but survivable). Tether every finding to downstream impact: "this is vague" is not a finding; "this is vague, so a planner must guess whether X means A or B" is.

3. **Decide the outcome.** If the spec passes the bar — a downstream agent could plan and implement from it and the delta without hidden context — the review is clean. Otherwise you hold one or more findings to record.

4. **Report.** A clean review returns a concise readiness judgment in chat and writes no file; a review with findings records exactly one bundle (`## Recording findings`) and reports its path. Follow `<skill_path>/references/instructions/emit-terminal-outcome.md` with `DONE` and the readiness judgment for a clean review, or `DONE` and `findings at <bundle path>` when a bundle was written. No preamble, no closing remark.

## What you judge

Read the spec against these axes; each weakness you find maps to the axis it concerns:

- **Clarity** — the prose says one thing, not several. Soft language ("robust", "scalable", "clean", "appropriate", "as needed") is the common signal that two agents would read a passage two different ways.
- **Completeness** — the information a planner needs is present, not left to inference at the boundaries (what is out of scope, which constraints bind, what "done" looks like).
- **Internal consistency** — no two parts point in different directions; the intended goal, scope, constraints, and acceptance guidance agree, and the body agrees with the delta documents it cites.
- **Scope boundaries** — what is in and, explicitly, what is out. An open boundary is an invitation to interpretation.
- **Observable behavior** — the state changes, outputs, error surfaces, and side effects a downstream executor must produce are stated, not implied.
- **Constraints** — the technical, repository, harness, and safety limits that bind the work are written down, not assumed obvious.
- **Degrees of freedom** — where the spec deliberately leaves choices open, it says so, so a planner knows what is free versus pinned.
- **Inferences** — every item in the spec's inferences is really an inference: a point that follows from the settled material or has one plainly sensible answer. An item reasonable people could settle differently, whose answer would change what a reviewer checks or what the user experiences, is a fork the authoring settled on its own, and a finding — a planner would build on a decision nobody made.
- **Acceptance guidance** — how a reviewer will know the result is right, so the downstream can self-verify without returning to the author for every ambiguous case.
- **Planning readiness** — taken as a whole, the spec and its delta are something a planner or implementer can act on directly.

A spec's section names, ordering, and structure are the author's discretion; what you check is that the substance behind these axes is present and coherent.

### Spec checks

Run these six checks as well. Each one is a finding wherever it fails.

1. **No restated document in the body.** No passage of the spec's body restates a project-layer document the change lands: a record's text, a glossary row, an agents-file passage. That text belongs in its delta document and is cited from the body; finding it in the body is the failure, whether or not a delta document also carries it.

2. **Citations resolve.** Check that every citation in the body resolves. A delta document path cited from the body resolves to a file under the thread's `delta/`. A decision record cited by stem resolves in `delta/docs/adr/`, `delta/docs/pdr/`, `docs/adr/` or `docs/pdr/`. A roadmap entry cited by index path and slug resolves to that heading in that index. Nothing cites another thread: a path into any thread but this one is a finding on its own. The form each kind is cited by is the one `<skill_path>/references/instructions/read-and-cite-the-project-layer.md` fixes.

3. **Every delta document is well-formed.** Run `node <skill_path>/references/scripts/check-delta.mjs <thread root>` from the project root. It writes nothing, so running it keeps the review read-only. Every failure it reports is a finding under the `delta` category, with the delta document's path as the finding's target and the script's message — malformed or conflict, and the edit position where one is named — as the evidence. Beyond the script, check three things yourself: the thread holds one document per target; each `create` conforms to its kind's format, a decision record carrying only its own frontmatter; and every edit is literal text rather than an instruction to make a change.

4. **Every drafted record is short and two-part.** Each `create` under `delta/docs/adr/` or `delta/docs/pdr/` has frontmatter carrying `description`, plus `supersedes` when it replaces a record, and nothing else. Its body is at most three sentences, followed by `## Rejected alternatives` with one line per alternative, and it holds no other section. A body over three sentences is a finding, and so is a missing `## Rejected alternatives`. A rejected alternative the record names that no line of the log argued is a finding, and so is a record filed in the wrong folder for the question it answers — a choice about what the product does or for whom belongs in `delta/docs/pdr/`, one about how the system is structured or built in `delta/docs/adr/`.

5. **Every `document` entry has its delta, and only those.** Each `document` entry in force in `log.md` has its delta document, or its edit within one, and every delta document answers a `document` entry in force. An entry without a delta document is a finding, and so is a delta document without an entry.

6. **Criteria carry no identifiers.** The acceptance checklist is a flat list of behavior statements with no `FR-` prefix, no `AC-` prefix, no other identifier and no numbering, so a plan task, a report row or a review finding can reference a criterion by quoting it verbatim.

An agents file's word count is not this review's to check.

You do not perform an exhaustive claim-by-claim fidelity mapping between the spec and the records that bind it. You may, however, report an **obvious contradiction** with the thread's delta or with a project decision record or a project glossary term, when you notice one, because a spec that visibly commits to the opposite of a record authoritative over it harms readiness — a downstream agent would act on a claim that has already been overruled. A contradiction the thread has deliberately taken on is not one of these; classify it as `/consult-decisions` instructs. Treat this as a readiness finding when it is plain on the page, not as a mandate to audit fidelity line by line.

## Recording findings

When you hold one or more findings, record them by following `<skill_path>/references/instructions/emit-pending-review.md`, with yourself as the reviewer and `spec.md` as the target — or the delta document's path as the target when the finding sits in one.

Use the readiness axes and the spec checks above as your category vocabulary — `clarity`, `completeness`, `consistency`, `scope`, `behavior`, `constraints`, `freedom`, `inference`, `acceptance`, `readiness`, `delta`, `citation` — assigning each finding the one it concerns. You emit one bundle per review run: that bundle is the only place findings go, and recording them there is where your job ends.

That bundle is the one thing a review run writes, and only when it holds findings. Nothing else you touch is written: `spec.md` itself, the thread's `delta/`, `seed.md`, `log.md`, `docs/adr/`, `docs/pdr/` and `docs/glossary.md` are read here and never written.

## After the review

Addressing the findings is the user's explicit next step, on their initiative. You do not prescribe who addresses them or how, attach no status or disposition to the bundle, and start no retry or re-review loop. If the user later wants an independent recheck, they rerun this review explicitly — a fresh run judges the spec again from scratch and, if it still finds problems, emits a new bundle.

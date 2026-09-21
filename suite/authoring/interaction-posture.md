# Interaction posture

Interaction posture is an authoring principle, not a runtime schema. A skill
carries no `interaction:` frontmatter field and no mandatory interaction-mode
section: its posture is inferred from its purpose, its description, and its
operating instructions, and only behaviour that would otherwise surprise the
agent warrants an explicit per-skill rule. The central question a posture answers
is whether obtaining new human input is part of the skill's normal job or an
exceptional blocker — sending a result through chat does not by itself make a
skill interactive.

## The three postures

- **Dialogue-driven** — the skill exists to obtain human input and settle points
  with the user, as `discussion` and `resolve-pending-decisions` do. Questions are
  expected output, more than one turn is normal, and needing another answer is
  not failure.
- **Completion-oriented** — the skill consumes supplied and durable inputs and
  produces an outcome without ongoing conversation: `change`, the plan skills,
  `check-plan`, the implement skills, the reviews, `roadmap`, and `close-thread`.
  It finishes autonomously whenever that is safe. Asking is exceptional,
  justified only when the inputs are insufficient and proceeding would invent
  intent, exceed authority, or choose outside a granted freedom; discovering a
  missing human decision mid-run does not change the posture.
- **One-shot deliverable** — the skill consumes an input and returns a finished
  message or handoff, as `open-ticket` and `open-thread` do. Reading, copying, or
  forwarding the result afterwards does not make the operation a dialogue: its
  shape is input → finished message.

A one-shot deliverable may still confirm once before it acts, and whether it does
follows from where its write lands. `open-ticket` confirms, because filing a
ticket lands outside the repository on a service other people read, and that write
is authorized by the user approving it. `open-thread` does not, because it writes
a folder inside the user's own repository that nothing has read yet, where a wrong
field is an edit rather than something to withdraw. A confirming pass on a
repository-local write costs a turn and buys nothing, and a pass users learn to
wave through is worse than none — it looks like a gate while gating nothing.

A completion-oriented skill behaves identically whether a person or a tool
invoked it, and carries no branch that detects which.

## Preflight and refusal

Every completion-oriented skill runs a preflight before any substantive
execution. It validates the invocation input, the artifacts the run reads, and
the tooling, credentials, and safety gates the run depends on. It resolves no
thread: the thread a skill works in is the folder holding the artifact the
invocation names, and an artifact that cannot be resolved is an ordinary input
failure like any other.

Any failure caught at that stage — a malformed invocation, an ambiguous artifact
reference, an unmet prerequisite, missing tooling or credentials, an unsatisfied
safety gate — writes no artifact and ends the run `REFUSED` with a precise
instruction for how to re-invoke or remediate. A preflight refusal is never a
pending-decision bundle: the run never started, so the terminal outcome carries
the whole state.

Advance authorization to work in a dirty worktree counts only when it
acknowledges that the existing changes will be preserved and may enter the run's
implementation commits. An instruction to ignore the dirty tree does not satisfy
the gate, and the preflight refuses.

## The two blocked paths

Once substantive execution has begun, two situations stop the run, and both end
`BLOCKED`.

- **Queued human intent** — a genuine product or process decision the run cannot
  safely derive. The run first finishes everything else it can safely derive,
  then queues the irreducible judgment as a bundle through the shared
  pending-decisions instruction, returns a concise terminal notification, and
  stops. It never asks in chat and never invents the answer.
- **An unfixable operational defect** — a failure the run cannot repair on its
  own. It ends with a diagnosis and writes no decision bundle.

Whether a queued point was a genuine decision or a mere clarification is
distinguished at resolution time, not at emission time: the operation that
resolves a bundle records genuine new intent as a durable record, while an answer
that only clarifies which input was meant settles the point without one.

## The terminal outcome

Every completion-oriented skill ends its final chat message with exactly one
line:

```text
Outcome: <TOKEN> — <one-line reason or pointer>
```

The vocabulary is closed to three tokens, and no other token exists:

- `DONE` — the skill completed its requested job, non-blocking concerns
  included. A review that emitted a findings bundle is `DONE`.
- `BLOCKED` — substantive execution started and then stopped, on either of the
  two paths above.
- `REFUSED` — preflight prevented the run from starting.

The line composes with the skill's own confirmation message: the confirmation
becomes the reason part, as in
`Outcome: DONE — Change document written: change.md`. The emission procedure
itself is the shared instruction `instructions/emit-terminal-outcome.md`, which
each emitting skill declares and points at from every exit the run can reach.

The name is fixed. This protocol — the three-token vocabulary and the closing
line together — is called the **terminal outcome** wherever it is named, in skill
bodies, in reports, and in these documents alike; prose that needs to name the
line itself calls it the terminal outcome line. It is never renamed to run
status, stage status, completion status, or any other status phrase. It always
names a *run's* end state: a completed *thread's* lasting artifact is its **final
deliverable**, a different concept with its own name.

A dialogue-driven skill has no terminal outcome, and a one-shot deliverable skill
returns its deliverable unframed. A model-invoked skill emits none either,
because the run that invoked it owns the closing line. That absence is held by
authoring silence, not by a runtime prohibition: a skill that emits no terminal
outcome does not mention the protocol, the line, or the tokens anywhere in its
body, and does not label its own posture. An agent never told the vocabulary
exists cannot emit it, while a sentence forbidding the line would teach the
concept in order to ban it. What a body spells out is the completion-oriented
behaviour where it applies.

## Internal progress and local return tokens

The three-token terminal outcome is the one outcome vocabulary the suite shares.
A single agent working through sequential internal tasks has no caller at each
task boundary, so it defines no per-task status vocabulary: its progress is
recorded as factual prose or ordinary structured fields — the task attempted, the
changes made, the verification performed, any concerns, the commit, the next
action — in its run state and its report. Such a run still ends `DONE` when the
requested operation completed, `BLOCKED` when execution started and could not
finish, and `REFUSED` when preflight stopped it.

A skill defines **skill-local return tokens** only where its own topology
genuinely consumes them, as when an orchestrator dispatches subagents and must
classify each untrusted reply quickly. Those return contracts stay inside the
owning skill and are never promoted into a second suite-wide vocabulary. Their
generic name is fixed: prose calls them skill-local return tokens — a body may
name each role more narrowly inside itself, a reply token or a lane verdict — and
never calls them statuses or outcomes. A return token never appears in a terminal
outcome line.

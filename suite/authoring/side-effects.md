# Side effects

Every skill has one predetermined mutation contract. The user never chooses a
behaviour variant at invocation time, and no skill offers a report-only,
queue-only, or auto-fix mode switch. Each body that writes states inline exactly
what the skill writes, and that everything else it touches is read and never
written.

## The suite-wide write boundaries

This map covers the durable artifacts; the temporary workspaces below are
governed by their own section. Each body realises one slice of the map, and no
skill writes outside its own slice or into another thread's files:

- Thread creation writes the new thread folder with `seed.md` and `log.md`, and
  nothing else.
- `discussion`, `resolve-pending-decisions`, and `spec` append lines to the
  thread's `log.md`; they are its only writers.
- `discussion` and `resolve-pending-decisions` write the thread's `adr/` drafts
  and its `glossary.md`.
- `spec` writes the thread's `spec.md`, and `resolve-pending-decisions` amends it
  in place.
- A plan skill writes the plan folder it creates; `check-plan` writes inside the
  one plan folder it targets.
- The implement skills write the project's code, tests, configuration, and the
  living documentation within the implementation's scope, plus the invocation's
  own implementation folder with its `report.md` and its `.runs/`.
- `close-thread` alone writes the project layer: the landed records in
  `docs/adr/`, the records they supersede into `docs/adr/superseded/`, the merged
  `docs/glossary.md`, and the closing line beneath one roadmap entry. It leaves
  the thread folder where it is.
- `roadmap` alone creates a roadmap index under `.wip/roadmaps/`.

An implement skill reads its spec and its plan and edits neither: a plan is
input, not a record rewritten afterwards to make delivered work look planned. A
deviation that stays within accepted intent proceeds and is recorded in the
report's deviations section; a contradiction of a thread record or of a spec
decision is a change of intent and is queued as a pending decision.

## Reviews

A review inspects delivered work read-only and produces an independent
assessment. It never edits the reviewed target and never turns the invocation
into a repair pass. Its one output is a findings bundle under `.pending-reviews/`
when it finds issues, and a concise pass in chat when it does not. A review never
writes `.pending-decisions/`, and never decides whether a finding is fixable,
needs human intent, should be accepted, or should be rejected: its
responsibility ends with an accurate bundle.

## Filesystem deletion

A skill never carries an instruction that deletes, empties, or erases user
filesystem content unless the user explicitly asks for it. The one exception is
pending-queue consumption: removing a settled point or an exhausted bundle from a
pending folder is how that communication completes, so the operation that
resolves the queue performs it. Everywhere else a body stays silent about
deletion in both directions — it carries neither a "never delete" clause nor a
"you may delete" clause — because mentioning deletion authority at all can prime
a long-running agent to erase the wrong thing. Where a body needs to say that a
workspace stays behind, it says so in one positively framed sentence — the
directory remains in place as the run's operational trace — worded without any
delete or remove token.

## Temporary workspaces

Three workspaces hold operational state, each created on demand by the run that
needs it.

`.pending-decisions/` and `.pending-reviews/` sit at the thread root and hold one
uniquely named bundle per producing invocation, so concurrent producers never
collide on a shared file. The normal case is one bundle per invocation; a
producer writes separate bundles only when subsets of its points have
meaningfully different targets. A bundle leaves the folder once its points are
settled, its findings are judged addressed, or a newer bundle supersedes it.
There are no statuses, dispositions, or automatic retry loops.

`.runs/`, inside an implementation folder, holds that run's working material:
progress tracking, recovery after a context compaction, and, for the subagent
executor, the scratch files agents hand to one another. One implementation folder
belongs to one run, so its `.runs/` belongs to that run alone, and every producer
writing into it is given a uniquely named, write-once path. What it records is
factual run trace, in the form `interaction-posture.md` fixes for internal
progress. It remains in place after the run as the run's operational trace, and
durable information is carried into the implementation's `report.md`. No durable
artifact cites a path inside it.

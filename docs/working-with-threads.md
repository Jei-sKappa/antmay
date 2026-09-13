# Working with threads in this repository

This repository is the reference home of the Antmay method, and it runs on the
suite it ships: its own work is carried in threads, and its own decisions and
terms live in the project layer the suite writes to. Read this before working
here without an Antmay skill running — it is what a session needs in order to
find the record of what has already been settled, and to respect it.

## Where things live

```text
.wip/threads/yyyy/mm/dd-hhmm-slug/   one thread — one unit of work, from idea to shipped code
.wip/roadmaps/<yymmddhhmm>-<slug>.md one roadmap index — one larger direction, as ordered entries
docs/adr/                            the project's current decisions, one file per record
docs/glossary.md                     the project's terms, one meaning each
```

A thread folder is named by the year, the month, and a leaf carrying the day, the
creation time in UTC at minute resolution, and a short kebab-case slug. The
thread's identifier is that path relative to `.wip/threads/` — write it that way
wherever a thread is named. What a folder holds is whatever the skills that ran
wrote into it; `README.md` lists those artifacts at overview level.

A thread stays where it is once its work is delivered; what marks it closed is
that its `adr/` drafts have landed in `docs/adr/` and its glossary terms have
merged into `docs/glossary.md`.

`.wip/` begins with a dot on purpose. Ripgrep and the agent harnesses skip
dot-folders by default, so a search across the repository returns the code and
the project layer without the accumulated history of every thread. Reading that
history is a deliberate act: pass `rg --hidden`, or name the path on a `grep`.
Conversely, a search meant to cover the working tree only needs nothing special.

## Reading the project's decisions and terms

Invoke `/consult-adrs` to read the project decisions relevant to what you are
about to do, and `/consult-glossary` to write the terms the project has fixed.
Both are model-invoked, so reach for them directly, whether or not another skill
is running. They also carry what to do when your material contradicts a landed
record. Use them in place of listing `docs/adr/` by hand — the catalog is
something a command prints, never something a document copies.

## Which skill to reach for

The suite is composable rather than sequential — reach for the skill that matches
the situation you are in, skip what the work does not need, and go back for a
skill you skipped when it turns out to be needed. `README.md` indexes every skill
with what it expects and what it leaves behind; this is the short map from
situation to name.

- A unit of work needs a home on disk — `open-thread`. An idea should be filed
  for later rather than started now — `open-ticket`.
- A topic needs thinking through with someone who will push back — `discussion`.
- The design has settled and must be written where downstream work can read it —
  `spec`.
- The spec needs turning into an implementation order — `plan-brief` for
  lightweight work, `plan-strict` when the implementer is an agent that needs a
  prescriptive brief per task.
- A plan exists and must be made to match the spec before anyone builds from it —
  `check-plan`.
- Something must be carried to working code — `implement` from any input,
  `implement-plan` from a strict plan, `implement-plan-with-subagents` when the
  work wants a reviewer loop and the runtime supports subagents.
- Delivered work needs judging — `review-spec` before planning, then
  `review-implementation` for fidelity to intent and `review-code` for quality.
  All three are read-only.
- A queue under `.pending-decisions/` is waiting on a human —
  `resolve-pending-decisions`.
- A larger direction has been agreed and needs writing down as a map —
  `roadmap`.
- The work is delivered and its records are ready to become the project's —
  `close-thread`.

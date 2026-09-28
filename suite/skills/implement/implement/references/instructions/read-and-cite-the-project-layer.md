# Read and cite the project layer

The project layer is the set of standing documents the method owns in a project: `docs/adr/` and `docs/pdr/` for its decision records, `docs/glossary.md` for its terms, the agents files (every `AGENTS.md` or `CLAUDE.md`) for its standing guidance to agents, and the roadmap indexes under `.work/roadmaps/`. Each path is created lazily by the first work that needs it and is never a prerequisite: a path that is not there yet means nothing has been recorded there, never that a step was skipped. Read what exists in the order below before you read the thread, so the standing picture frames the thread-local one rather than the other way round, and cite what you read by the form its kind fixes.

## Read in this order

1. The project's `AGENTS.md` — the standing guidance for agents working in this project.
2. `docs/glossary.md` — the project's fixed terms, to be used in everything you write.
3. `docs/adr/` and `docs/pdr/`, listed rather than read whole, opening the records that touch the work.
4. The roadmap entry, when the thread was opened from one — its sketch, its scope boundary and its planned behavior.
5. The thread.

Any other thread is history: it records how its own work was understood at the time, not what holds now, so do not read it unless the user or this thread's seed names it.

## Cite by kind

- Nothing under `.work/` is cited from `docs/` or from code. A thread path appears outside its thread only as commit provenance.
- A decision record is cited by stem, for the reason behind a choice, never for what the system does.
- A roadmap entry is cited by index path and entry slug, from thread artifacts only.
- Code, comments, test names and migrations carry no thread path and no reference to a thread artifact; a test is named for the behavior it proves.
- A commit message explains the change concisely in its own words, may name the thread path once as provenance, and never carries a task number, a criterion, a progress block or a thread artifact as the explanation.

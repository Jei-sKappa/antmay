# Read and cite the project layer

The project layer is what the method owns at fixed paths in every project: `docs/adr/` and `docs/pdr/` for its decision records, `docs/glossary.md` for its terms, `docs/product/` for what the product does, `docs/architecture/` for how the system is structured, and the roadmap indexes under `.work/roadmaps/`. Each path is created lazily by the first work that needs it and is never a prerequisite: a path that is not there yet means nothing has been recorded there, never that a step was skipped. Read what exists in the order below before you read the thread, so the standing picture frames the thread-local one rather than the other way round, and cite what you read by the form its kind fixes.

## Read in this order

1. The project's `AGENTS.md` — the standing guidance for agents working in this project.
2. `docs/glossary.md` — the project's fixed terms, to be used in everything you write.
3. The architecture description of each module the work touches — how the system is structured now.
4. The product behavior of each capability the work touches — what the product does now.
5. `docs/adr/` and `docs/pdr/`, listed rather than read whole, opening the records that touch the work.
6. The roadmap entry, when the thread was opened from one — its sketch, its scope boundary and its planned behavior.
7. The thread.

## Cite by kind

- Nothing under `.work/` is cited from `docs/` or from code. A thread path appears outside its thread only as commit provenance.
- A decision record is cited by stem, for the reason behind a choice, never for what the system does.
- A description is cited by path and heading.
- A roadmap entry is cited by index path and entry slug, from thread artifacts only.
- Code, comments, test names and migrations carry no thread path and no reference to a thread artifact; a test is named for the behavior it proves.
- A commit message explains the change concisely in its own words, may name the thread path once as provenance, and never carries a task number, a criterion, a progress block or a thread artifact as the explanation.

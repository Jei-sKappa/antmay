# The Antmay method

## How a unit of work moves

- A unit of work is a thread, one folder on disk whose shape is fixed by `suite/shared/references/formats/thread.md`.
- Intent is written down before it is built, so that a teammate reviewing a pull request and a fresh agent session resuming the work read the same durable Markdown rather than a chat log.
- A thread's design of one change is its spec, which holds only what is thread-only and cites the thread's delta documents for every standing behavior or structure the change adds, replaces or removes.
- Everything a thread drafts for the project layer is its delta, authoritative inside the thread from the moment it is written and landed only when the thread closes.
- The skills are composable rather than sequential: a session reaches for the one that matches the situation it is in, skips what the work does not need, and comes back for a skipped skill when it turns out to be needed.
- A thread stays where it is once its work is delivered, as the record of how the work was understood while it was being done.
- Every skill that reads a thread treats any other thread as history and reads it only when the user or the thread's seed names it.

## The project layer

- The project layer is what the method owns at fixed paths in every project; it is created lazily and is never a prerequisite for starting work.
- `close-thread` is the only skill that writes the decision records, the descriptions and the glossary.
- A roadmap index is written once and edited in place by hand from then on: `roadmap` refuses an index that already exists, and the only line a skill adds afterwards is the closing line `close-thread` writes beneath the entry a thread came from.
- `docs/adr/<yymmddhhmm>-<slug>.md` holds one decision about how the system is structured or built, with superseded records under `docs/adr/superseded/`.
- `docs/pdr/<yymmddhhmm>-<slug>.md` holds one decision about what the product does or for whom, in the same shape and with the same lifecycle.
- A decision record is cited by its stem, for the reason behind a choice and never for what the system does.
- `docs/product/<capability>.md` holds present-tense statements of what the product does now, one per behavior, functional and non-functional alike.
- `docs/architecture/<module>.md` holds how the system is structured now, only where no single file makes it obvious.
- A description of either kind is cited by path and heading.
- `docs/glossary.md` holds one meaning per term, and a term is cited by the term itself.
- A roadmap index at `.work/roadmaps/<yymmddhhmm>-<slug>.md` holds a direction, its ordered entries, and the planned behavior each entry will build; it is cited by index path and entry slug, from thread artifacts only, and is deleted once its destination is reached or abandoned.
- A statement enters a description only when the behavior or structure is built and only where reading the code would not make it obvious.
- The roadmap entry is the one home of behavior that is settled but not built.
- The descriptions and the glossary are living rather than historical: they change only through the delta documents a thread drafts and `close-thread` lands.

## What each skill produces

- A unit of work that needs a home on disk gets one from `open-thread`, which leaves a thread folder holding its `seed.md` and an empty `log.md`.
- An idea worth filing rather than starting now goes to `open-ticket`, which leaves a tracker ticket and nothing on disk.
- A topic that needs thinking through with someone who pushes back goes to `discussion`, which leaves one log line per settled point.
- A queue waiting on a human under a thread's `.pending-decisions/` is emptied by `resolve-pending-decisions`, which writes each answer into the log.
- A design that has settled is written down by `spec`, which leaves the spec, the thread's delta documents under `delta/`, and one event line in the log.
- A spec and its delta are judged as a downstream handoff by `review-spec`, before anyone plans from them.
- Turning the design into an implementation order is `plan-brief` for lightweight work and `plan-strict` when the implementer is an agent that needs a prescriptive brief per task; each leaves a fresh stamped folder under `plans/`.
- A plan that must be made to match the spec before anyone builds from it goes to `check-plan`, which corrects that plan folder in place.
- Carrying work to code is `implement` from any input, `implement-plan` from a strict plan, and `implement-plan-with-subagents` when the work wants a reviewer loop and the runtime supports subagents; each leaves the delivered work on the working tree and one implementation folder holding its `report.md`.
- The implementation report is the one home of traceability: its acceptance table carries one row per criterion of the spec, with the method and the evidence for each.
- Delivered work is judged by `review-implementation` for fidelity to the thread's durable intent and by `review-code` for quality on the code's own merits.
- Every review is read-only: a clean review passes in chat, and a review with findings leaves one bundle under the thread's `.pending-reviews/`.
- A larger direction that has been agreed is written down by `roadmap` as a project-level index of ordered entries under `.work/roadmaps/`.
- Work that is delivered and whose delta is ready is finished by `close-thread`.
- `consult-decisions` and `consult-descriptions` are model-invoked: an agent reaches for either directly whenever what it reads bears on the work, whether or not another skill is running, and neither writes anything.
- No skill in the suite stages, commits or pushes on its own except the three implement skills, which commit the work they deliver.

## Closing

- The closing event in a thread's log reads `thread closed; delta: <landed|none>`, which is how a later reader knows the thread is finished and whether it left anything in the project layer.
- A closed thread's `delta/` stays in place as the historical snapshot of what landed.

## How this repository runs on the method

- This repository is the reference home of the method and carries its own work in threads under `.work/threads/`, with its larger directions in roadmap indexes under `.work/roadmaps/`.
- `.work/` begins with a dot on purpose: ripgrep and the agent harnesses skip dot-folders by default, so an ordinary search returns the code and the project layer without the accumulated history of every thread.
- Reading that history is a deliberate act — pass `rg --hidden`, or name the path on a `grep`.
- A search meant to cover the working tree alone needs nothing special.

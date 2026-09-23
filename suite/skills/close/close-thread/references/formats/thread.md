# Thread format

A thread is the folder holding one unit of work, from the idea that opened it to the code that ships it. It lives at `.work/threads/yyyy/mm/dd-hhmm-slug/` — a year folder, a month folder, and a leaf named by the day, the creation time in UTC at minute resolution, and a short kebab-case slug. The thread's identifier is that path relative to `.work/threads/`, and every reference to a thread uses it.

## Shape

```text
.work/threads/yyyy/mm/dd-hhmm-slug/
├── seed.md                                 what the thread was opened to do
├── log.md                                  the thread's memory, one line per entry
├── spec.md                               the spec, once authored
├── delta/                                  the thread's delta: one delta document per target
│   └── docs/…                              mirrors the target path, e.g. delta/docs/adr/<stem>.md,
│                                           delta/docs/pdr/<stem>.md, delta/docs/product/<capability>.md,
│                                           delta/docs/architecture/<module>.md, delta/docs/glossary.md
├── plans/<yymmddhhmm>[-<slug>]/            one plan: its index and its task briefs
├── implementations/<yymmddhhmm>[-<slug>]/  one implementation run
│   ├── report.md                           that run's outcome
│   └── .runs/                              that run's working material
├── .pending-decisions/                     bundles of open human decisions
└── .pending-reviews/                       bundles of validated review findings
```

## Rules

- Two threads created in the same minute differ in slug.
- `seed.md` and `log.md` exist from the moment the thread is created; every other file and folder is created on demand by the skill that writes it.
- A plan folder and an implementation folder are stamped with their creation time in UTC at minute resolution and an optional slug, so a thread may hold several of each; one implementation folder belongs to one run.
- Before closing, `delta/` is the thread's delta of the project layer, and it is authoritative inside the thread.
- `.pending-decisions/`, `.pending-reviews/`, and each implementation's `.runs/` are workspaces: every invocation that produces material there writes one uniquely named bundle or run directory of its own.
- A closed thread stays where it is: `delta/` stays in place as the historical snapshot of what landed, and the log carries the closing event recording whether the delta landed.

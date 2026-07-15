# Project V3

Project V3 is a suite of reusable, independently invokable capability skills together with a small set of documented workflows that compose those skills into easy-to-discover paths. Skills are the tools; workflows are the recommended ways of arranging them.

## Architecture

The repository offers a catalog of self-contained capability skills — opening a thread, discussion, proposing, specifying, planning, implementing, reconciling artifacts, reviewing delivered work, roadmapping, materializing child threads, finishing, navigating, archiving, handoff, research, and support operations. Each skill owns one capability with a fixed output contract and does not inspect a workflow name to decide how to behave.

A **workflow** is a documented composition over those skills: a named, human-readable path that arranges capabilities into a coherent process. Composition lives in documentation and in the recommended sequence stored in each thread's seed, not in orchestration hidden inside skills. The same skill is reused across workflows without renamed copies.

Project V3 ships three workflows:

- **[Quick](workflows/quick.md)** — the smallest delivery path for one change, optionally with a brief plan.
- **[Standard](workflows/standard.md)** — the normal spec-driven path for one change, from clarified decisions through a handoff-grade specification, a prescriptive plan, implementation, and an outcome report.
- **[Roadmap](workflows/roadmap.md)** — explores and structures a larger direction, then decomposes it into independently executable child threads.

Every workflow begins with the shared thread-genesis artifacts `seed.md` and `decisions.md`; the artifacts that follow differ by workflow convention. The shared substrate every workflow builds on — thread layout, decisions, archive lifecycle, write authority, and cross-thread references — is defined in [thread-model.md](thread-model.md). The cross-skill authoring conventions every skill follows are defined in [skill-authoring.md](skill-authoring.md).

## Conventions-first

Workflows guide; they never govern. There is no evaluator, obligation graph, contract lockfile, machine-authoritative state, or enforcement engine anywhere in the suite. A workflow is a recommendation the user follows, adapts, or departs from at will.

Skipping an optional activity, adding an unlisted operation, or diverging from the recommended sequence never makes a thread invalid, out of compliance, or in need of reclassification. The recommended sequence a thread records at opening time is advice as it stood then, not a checklist the thread is later measured against. Where a departure changes human intent worth preserving, it produces an ordinary decision record; minor adaptation needs no bookkeeping at all.

## Subject-neutrality

Workflows describe how the user wants to work, not what the work is about. Nothing routes a bug, feature, refactor, security change, or documentation effort to a workflow by its subject. A bug may use Quick or Standard; a large documentation effort may use Roadmap; the user chooses the workflow whose process shape fits the situation. The suite predefines no investigation, bugfix, audit, security, documentation-only, or other subject-oriented category.

## Admitting a future workflow

A new workflow is added only when actual use demonstrates all three of the following, none of which is a subject label:

1. a **distinct purpose** that the existing workflows do not already serve;
2. a **durable artifact structure** genuinely different from the artifacts an existing workflow produces; and
3. a **natural completion shape** — a terminal outcome that would be distorted if expressed as a variant of an existing workflow.

A candidate that merely renames an existing process for a particular kind of subject does not qualify. Adding a workflow that meets the bar means writing its workflow document under `workflows/` and adding a row to the root `README.md` workflow table; workflows are never categorized by bug, feature, security, documentation, refactor, or any other subject matter.

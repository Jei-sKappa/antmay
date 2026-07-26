# The Antmay Method

Antmay is a thread-based method for Spec Driven Development. It carries a unit of work from a rough idea to shipped code through reviewable Markdown artifacts on disk, and it ships two things that support that method: a suite of reusable, independently invokable capability skills, and a small set of documented recipes that compose those skills into easy-to-discover paths. Skills are the tools; recipes are the recommended ways of arranging them.

The vocabulary this documentation uses is defined once in [glossary.md](glossary.md).

## Architecture

The repository offers a catalog of self-contained capability skills — opening a thread, discussion, proposing, specifying, planning, implementing, reconciling artifacts, reviewing delivered work, roadmapping, materializing child threads, finishing, navigating, and archiving. Each skill owns one capability with a fixed output contract and does not inspect a recipe name to decide how to behave.

A **recipe** is a documented composition over those skills: a named, human-readable path that arranges capabilities into a coherent process. Composition lives in documentation — the recipe documents and their published templates — not in orchestration hidden inside skills. The same skill is reused across recipes without renamed copies.

The method ships three recipes:

- **[Quick](recipes/quick.md)** — the smallest delivery path for one change, optionally with a brief plan.
- **[Standard](recipes/standard.md)** — the normal spec-driven path for one change, from clarified decisions through a handoff-grade specification, a prescriptive plan, implementation, and an outcome report.
- **[Roadmap](recipes/roadmap.md)** — explores and structures a larger direction, then decomposes it into independently executable child threads.

Every recipe begins with the shared thread-genesis artifacts `seed.md` and `decisions.md`; the artifacts that follow differ by recipe. The shared substrate every recipe builds on — thread layout, decisions, archive lifecycle, write authority, and cross-thread references — is defined in [thread-model.md](thread-model.md). The cross-skill authoring conventions every skill follows are defined in [skill-authoring.md](skill-authoring.md).

A recipe is written for a human to follow. The `antmay` CLI runs a **pipeline** — a separate, enforced stage sequence that automates the automatable core of a recipe. A pipeline is not the recipe in another form: it starts at an existing thread, drops the steps that need a person, and enforces Git boundaries and queue gates that a recipe only ever suggests. The recipe remains authoritative for what the path *is*; the pipeline is one way to drive part of it unattended.

## Conventions-first

Recipes guide; they never govern. There is no evaluator, obligation graph, contract lockfile, machine-authoritative state, or enforcement engine anywhere in the suite. A recipe is a recommendation the user follows, adapts, or departs from at will.

Skipping an optional activity, adding an unlisted operation, or diverging from the recommended sequence never makes a thread invalid, out of compliance, or in need of reclassification. The recommended sequence a thread records at opening time is advice as it stood then, not a checklist the thread is later measured against. Where a departure changes human intent worth preserving, it produces an ordinary decision record; minor adaptation needs no bookkeeping at all.

## Subject-neutrality

Recipes describe how the user wants to work, not what the work is about. Nothing routes a bug, feature, refactor, security change, or documentation effort to a recipe by its subject. A bug may use Quick or Standard; a large documentation effort may use Roadmap; the user chooses the recipe whose process shape fits the situation. The suite predefines no investigation, bugfix, audit, security, documentation-only, or other subject-oriented category.

## Admitting a future recipe

A new recipe is added only when actual use demonstrates all three of the following, none of which is a subject label:

1. a **distinct purpose** that the existing recipes do not already serve;
2. a **durable artifact structure** genuinely different from the artifacts an existing recipe produces; and
3. a **natural completion shape** — a final deliverable that would be distorted if expressed as a variant of an existing recipe.

A candidate that merely renames an existing process for a particular kind of subject does not qualify. Adding a recipe that meets the bar means writing its recipe document under `recipes/` and adding a row to the root `README.md` recipe table; recipes are never categorized by bug, feature, security, documentation, refactor, or any other subject matter.

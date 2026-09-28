---
type: edit
hash: f28b5aa76806d10495d4d5d66c7a2655a8509fa0
---

## replace
```
| **thread log** | `log.md`, the thread's append-only memory: `discussion` and `resolve-pending-decisions` record settled points, `spec` records authoring events, and `close-thread` records successful closure; later entries supersede earlier ones on the same point while history remains intact. |
```
```
| **thread log** | `log.md`, the thread's append-only memory: `discussion` and `resolve-pending-decisions` record settled points, `discussion` records the documents the user accepted for the project layer, `spec` records authoring events, and `close-thread` records successful closure; later entries supersede earlier ones on the same point while history remains intact. |
```

## replace
```
| **log entry type** | The single word that opens a log entry, from a closed vocabulary of exactly seven: `decision`, `constraint`, `assumption`, `question`, `capability`, `direction`, `event`. |
```
```
| **log entry type** | The single word that opens a log entry, from a closed vocabulary of exactly eight: `decision`, `constraint`, `assumption`, `question`, `capability`, `direction`, `event`, `document`. |
```

## remove
```
| **change document** | Leaves the vocabulary; write **spec** for the thread's design document, and **change** only in its ordinary sense. |
```

## replace
```
| **project layer** | What the method owns at fixed paths in every project, created lazily and never a prerequisite: `docs/adr/`, `docs/pdr/`, `docs/glossary.md`, `docs/product/`, `docs/architecture/`, and the roadmap indexes under `.work/roadmaps/`. |
```
```
| **project layer** | What the method owns at fixed paths in every project, created lazily and never a prerequisite: `docs/adr/`, `docs/pdr/`, `docs/glossary.md`, every agents file, and the roadmap indexes under `.work/roadmaps/`. |
```

## replace
```
| **ADR** | One project decision about how the system is structured or built, as a file `<yymmddhhmm>-<slug>.md` under `docs/adr/`, carrying `name`, `description`, an optional `supersedes`, a body giving the context, the decision and the reason, and a mandatory rejected-alternatives section; its stem is its global identifier and never changes, and the folder is the whole authoritative surface for such decisions. [suite/shared/references/formats/decision-record.md](../suite/shared/references/formats/decision-record.md) |
```
```
| **ADR** | One project decision about how the system is structured or built, as a file `<yymmddhhmm>-<slug>.md` under `docs/adr/`, carrying `description`, an optional `supersedes`, a body of at most three sentences giving the decision and its reason, and a mandatory rejected-alternatives section; its stem is its global identifier and never changes, and the folder is the whole authoritative surface for such decisions. [suite/shared/references/formats/decision-record.md](../suite/shared/references/formats/decision-record.md) |
```

## replace
```
| **decision test** | The test a settled point passes to become an ADR or PDR: a real alternative was argued against and is named, the reason cannot be read off the code or the descriptions, and a later thread could build against it incorrectly if not told. |
| **binding test** | Leaves the vocabulary; write **decision test** for the three clauses a settled point passes to become an ADR or PDR. |
```
```
| **decision test** | The test a settled point passes before `discussion` offers it as an ADR or PDR: a real alternative was argued against and is named, the reason cannot be read off the code, the choice is hard to reverse, and missing it is costly because a later thread could build against it incorrectly. |
```

## remove
```
| **description** | Collective name for the two method-owned living kinds, product behavior and architecture description: built-only, present tense, admitted only where the code does not make it obvious, changed only through delta documents landed at close. |
| **product behavior** | A method-owned living document, one per capability, holding present-tense statements of what the product does now, admitted only where the behavior is not obvious from the code; it never describes behavior that is not built. [suite/shared/references/formats/product-behavior.md](../suite/shared/references/formats/product-behavior.md) |
| **capability** | A coherent user-facing ability of the product, the unit one product behavior document covers. |
| **architecture description** | A method-owned living document, one per module, describing how the system is structured now, where that is not obvious from reading the code. [suite/shared/references/formats/architecture-description.md](../suite/shared/references/formats/architecture-description.md) |
```

## add
after: `| **living documentation** | Documentation the project owns outside the project layer, READMEs, runbooks, conventions, which the implementer edits within implementation scope; never a method-owned kind. |`
```
| **agents file** | Any `AGENTS.md` or `CLAUDE.md` in a project, part of the project layer and loaded by the agent on every session, holding only critical rules, how the repository is structured and where to find things, and pointers that name a trigger; the one word for both file names. [suite/shared/references/formats/agents-file.md](../suite/shared/references/formats/agents-file.md) |
```

## replace
```
| **consult-decisions** | The model-invoked skill that lists `docs/adr/` and `docs/pdr/` without loading every record, opens the records that touch the work, and states how a record is cited and binds; replaces `consult-adrs`. |
| **consult-descriptions** | The model-invoked skill that opens the product behavior and architecture description for what the work touches, and states how they are cited and read. |
| **consult-adrs** | Leaves the vocabulary; write **consult-decisions**. |
| **consult-glossary** | Leaves the vocabulary; an agent reads `docs/glossary.md` directly, listed by path in every entry-point skill. |
```
```
| **consult-decisions** | The model-invoked skill that lists `docs/adr/` and `docs/pdr/` without loading every record, opens the records that touch the work, and states how a record is cited and binds. |
```

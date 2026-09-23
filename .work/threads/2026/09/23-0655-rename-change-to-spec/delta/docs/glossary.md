---
type: edit
hash: 601ebca4da32875f28e84f6e8b0a93dea7537652
---

## replace
```
| **thread artifact** | A durable file inside a thread recording how one change was understood and delivered at a moment — the seed, the log, the change document, a plan, an implementation's report. Historical by nature. Use this where the artifact domain is meant, in contrast to source code. |
```
```
| **thread artifact** | A durable file inside a thread recording how one change was understood and delivered at a moment — the seed, the log, the spec, a plan, an implementation's report. Historical by nature, so a thread other than the one being worked on is read only when the user or that thread's seed names it. Use this where the artifact domain is meant, in contrast to source code. |
```

## replace
```
| **thread log** | `log.md`, the thread's append-only memory: `discussion` and `resolve-pending-decisions` record settled points, `change` records authoring events, and `close-thread` records successful closure; later entries supersede earlier ones on the same point while history remains intact. |
```
```
| **thread log** | `log.md`, the thread's append-only memory: `discussion` and `resolve-pending-decisions` record settled points, `spec` records authoring events, and `close-thread` records successful closure; later entries supersede earlier ones on the same point while history remains intact. |
```

## replace
```
| **change document** | `change.md`, the thread's design of one change, historical once the thread closes: it holds only what is thread-only and cites the thread's delta documents for every standing behavior or structure the change adds, replaces or removes; never written as bare "change" in prose. [suite/shared/references/formats/change-document.md](../suite/shared/references/formats/change-document.md) |
| **spec** | Leaves the vocabulary; write **change document** for the artifact and keep **Spec Driven Development** for the practice. |
```
```
| **spec** | `spec.md`, the thread's design of one change, thread-local and historical once the thread closes: it holds only what is thread-only and cites the thread's delta documents for every standing behavior or structure the change adds, replaces or removes. [suite/shared/references/formats/spec.md](../suite/shared/references/formats/spec.md) |
| **change document** | Leaves the vocabulary; write **spec** for the thread's design document, and **change** only in its ordinary sense. |
```

## replace
```
| **inference** | A point the agent settles alone because it follows from the settled points or has one plainly sensible answer, non-binding until the change document pins it; it appears in the discussion's closure list, where the user may promote it to a fork, and in the change document's inferences, whether the discussion listed it or the `change` agent found it while writing. |
| **degree of freedom** | A *how* the change document deliberately leaves open to the implementer, listed among its degrees of freedom; every admissible choice satisfies the acceptance criteria unchanged, none produces a user-visible difference the user would want to weigh in on, and any is reversible without revising the change document. |
```
```
| **inference** | A point the agent settles alone because it follows from the settled points or has one plainly sensible answer, non-binding until the spec pins it; it appears in the discussion's closure list, where the user may promote it to a fork, and in the spec's inferences, whether the discussion listed it or the `spec` agent found it while writing. |
| **degree of freedom** | A *how* the spec deliberately leaves open to the implementer, listed among its degrees of freedom; every admissible choice satisfies the acceptance criteria unchanged, none produces a user-visible difference the user would want to weigh in on, and any is reversible without revising the spec. |
```

## replace
```
| **deviation** | One entry in a report's deviations section, naming what was built, the change document section or the decision record stem it departs from, and why. A deviation stays within accepted intent; a contradiction of a drafted decision record or of a decision in the change document is a change of intent and becomes a pending decision instead. |
| **judgment call** | A choice an implementer makes where the change document pins nothing, inside a granted degree of freedom or in its silence; distinct from a deviation, which departs from something pinned. |
```
```
| **deviation** | One entry in a report's deviations section, naming what was built, the spec section or the decision record stem it departs from, and why. A deviation stays within accepted intent; a contradiction of a drafted decision record or of a decision in the spec is a change of intent and becomes a pending decision instead. |
| **judgment call** | A choice an implementer makes where the spec pins nothing, inside a granted degree of freedom or in its silence; distinct from a deviation, which departs from something pinned. |
```

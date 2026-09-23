---
name: A thread's design document is called the spec, in spec.md, written and reviewed by the spec and review-spec skills.
description: The thread design document is named the spec, not the change document.
---

Every thread holds one document designing its change. It was called the spec, then renamed the change document (`change.md`, with the `change` and `review-change` skills), because readers took "spec" to mean the document code is checked against now, and agents treated its thread-local criterion identifiers as standing requirements. The name is the spec again: `spec.md`, the `spec` skill and the `review-spec` skill. "Change" collides with the ordinary word everywhere it is written, to the point of needing a rule against using it bare. The risk the rename guarded against is now prevented by the document's structure rather than its name: a criterion carries no identifier, and every standing behavior or structure lives in the thread's delta and is only cited from the spec. **Spec Driven Development** stays the name of the practice.

## Rejected alternatives

- Keep "change document" and tighten its wording — the term keeps fighting its ordinary sense in every sentence that uses it.

## Consequences

The spec's thread-local, historical status is carried by its glossary row and by the rule that another thread is read only when named. If agents again take a closed thread's spec for standing truth despite that structure, the name is revisited.

---
type: create
---

---
description: A delta is checked and landed only by two dependency-free Node scripts shipped as shared references — check-delta.mjs, which writes nothing, and apply-delta.mjs, which imports it and is mirrored only into close-thread.
---

A delta is checked and landed only by two dependency-free Node scripts shipped as shared references: `check-delta.mjs` validates every delta document of a thread and writes nothing, and `apply-delta.mjs` imports it by relative path, checks the whole delta, and then writes every document or none. `apply-delta.mjs` is mirrored only into `close-thread`, so a skill that must not land a delta does not hold the command to do it, while `spec` and `review-spec` run `check-delta.mjs` on a delta as soon as it is drafted. Uniqueness, ordered application and the already-done rule are checks an agent applies unreliably by reading, and Node is present wherever the suite was installed with `npx skills add`.

## Rejected alternatives

- Agents applying delta documents by reading them — uniqueness, ordering and the already-done rule are applied unreliably by hand, and a dry run and a landing done separately can disagree.
- One script with `check` and `apply` modes — `apply` would sit in `spec`'s folder, ready to run by mistake.
- A flag gating `apply` — a flag written in a skill body is a text rule any agent can type.
- Two files with duplicated validation — the copies drift, and a passing check stops predicting a successful landing.

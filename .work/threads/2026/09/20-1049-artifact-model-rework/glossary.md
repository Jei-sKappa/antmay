| Term | Meaning |
| --- | --- |
| **change document** | `change.md`, the thread's design of one change, historical once the thread closes: it holds only what is thread-only and cites the thread's delta documents for every standing behavior or structure the change adds, replaces or removes; never written as bare "change" in prose. |
| **spec** | Leaves the vocabulary; write **change document** for the artifact and keep **Spec Driven Development** for the practice. |
| **product behavior** | A method-owned living document, one per capability, holding present-tense statements of what the product does now, admitted only where the behavior is not obvious from the code; it never describes behavior that is not built. |
| **architecture description** | A method-owned living document, one per module, describing how the system is structured now, where that is not obvious from reading the code. |
| **capability** | A coherent user-facing ability of the product, the unit one product behavior document covers. |
| **delta** | Everything one thread drafts for the project layer: the folder of its delta documents, authoritative within the thread from the moment written and landed only by `close-thread`. |
| **delta document** | One file in a thread's delta naming one project-layer file as its target and one of three types: `create`, whose body is the whole new file; `edit`, whose body is literal `add`, `replace` and `remove` operations against the target's recorded blob hash; or `delete`, which names the target and its hash and nothing else. |
| **project layer** | What the method owns at fixed paths in every project, created lazily and never a prerequisite: `docs/adr/`, `docs/pdr/`, `docs/glossary.md`, `docs/product/`, `docs/architecture/`, and the roadmap indexes under `.work/roadmaps/`. |
| **ADR** | One project decision about how the system is structured or built, as a file `<yymmddhhmm>-<slug>.md` under `docs/adr/`, carrying `name`, `description`, an optional `supersedes`, a body giving the context, the decision and the reason, and a mandatory rejected-alternatives section; its stem is its global identifier and never changes, and the folder is the whole authoritative surface for such decisions. |
| **product decision record (PDR)** | One project decision about what the product does or for whom, as a file under `docs/pdr/` with the ADR shape, the ADR test and its own `superseded/`; filed by the question it answers, never by how it is enforced. |
| **consult-decisions** | The model-invoked skill that lists `docs/adr/` and `docs/pdr/` without loading every record, opens the records that touch the work, and states how a record is cited and binds; replaces `consult-adrs`. |
| **consult-descriptions** | The model-invoked skill that opens the product behavior and architecture description for what the work touches, and states how they are cited and read. |
| **consult-glossary** | Leaves the vocabulary; an agent reads `docs/glossary.md` directly, listed by path in every entry-point skill. |
| **consult-adrs** | Leaves the vocabulary; write **consult-decisions**. |
| **living documentation** | Documentation the project owns outside the project layer, READMEs, runbooks, conventions, which the implementer edits within implementation scope; never a method-owned kind. |
| **description** | Collective name for the two method-owned living kinds, product behavior and architecture description: built-only, present tense, admitted only where the code does not make it obvious, changed only through delta documents landed at close. |
| **binding test** | Leaves the vocabulary; write **decision test** for the three clauses a settled point passes to become an ADR or PDR. |
| **decision test** | The test a settled point passes to become an ADR or PDR: a real alternative was argued against and is named, the reason cannot be read off the code or the descriptions, and a later thread could build against it incorrectly if not told. |
| **entry** | One item in a roadmap index: a slug heading, a sketch, a scope boundary, and the planned behavior the thread opened from it will build, which is the only home of behavior that is settled but not built. |

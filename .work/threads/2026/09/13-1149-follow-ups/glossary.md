# Glossary

The terms this thread adds, changes, or retires. These rows are authoritative
inside this thread and merge into the project glossary when the thread closes.
A path inside a row is written plain, and becomes a link relative to `docs/`
when the row lands in the project glossary.

## Added

| Term | Meaning |
| --- | --- |
| **instruction** | A shared reference holding one self-contained procedure for a single act, written to whoever performs it and naming no skill, so that every skill performing the act performs it the same way. `suite/authoring/shared-references.md` |
| **model-invoked skill** | A skill the model may invoke at its own discretion, because what it does is useful to an agent in any situation, whether or not an entry point is running. Declared by omitting `disable-model-invocation`. `suite/authoring/skill-roles.md` |

## Redefined

| Term | Meaning |
| --- | --- |
| **the Antmay method** | The way of working itself — carrying a unit of work from a rough idea to shipped code through reviewable Markdown artifacts in a thread. Singular and uncountable. Use this where the whole approach is meant, never "the Antmay workflow". |
| **thread** | One unit of work at one moment, as a durable folder `.wip/threads/yyyy/mm/dd-hhmm-slug/`; the thread's identifier is that path relative to `.wip/threads/`. The method's central object. |
| **thread log** | `log.md`, the thread's memory, created when the thread opens and appended to by `discussion`, `resolve-pending-decisions`, and `spec`. Append-only, and memory rather than truth: a later entry supersedes an earlier one on the same point, and history stays intact. |
| **closing** | The operation that ends a thread: check it, land its delta into the project layer, and write the closing line beneath its roadmap entry. The folder stays where it is. |
| **final deliverable** | What a completed *thread* leaves behind: the code it delivered, the records its delta landed, and its own artifacts in place. Distinct from a terminal outcome. |
| **project layer** | What the method owns at fixed paths in every project, created lazily and never a prerequisite: `docs/adr/`, `docs/glossary.md`, and the roadmap indexes under `.wip/roadmaps/`. |
| **roadmap index** | `.wip/roadmaps/<yymmddhhmm>-<slug>.md`, one per direction: the destination, ordered entries, an out-of-scope list, and a note for what cannot yet be seen. Its owner edits it in place and deletes it when the destination is reached or abandoned. |
| **skill** | One self-contained capability with a fixed output contract, as a `SKILL.md` file. A skill states everything it needs in its own body. |
| **entry point** | A user-invoked skill owning a complete user-visible operation, started by a person rather than by the model. Carries `disable-model-invocation: true`. |
| **shared reference** | Passive canonical material under `suite/shared/references/` — the formats, the instructions, and tracker material — declared in `suite/shared/manifest.yaml` and mirrored into each declaring skill by the sync script. The mirrored copies are generated, never hand-edited. `suite/authoring/shared-references.md` |
| **preflight** | The mandatory validation every completion-oriented skill performs before substantive execution: the invocation's input, the artifacts it needs, and the tooling. Failure writes nothing and ends the run `REFUSED`. |
| **terminal outcome** | The protocol name for the single closing line `Outcome: <DONE \| BLOCKED \| REFUSED> — <reason>` and its closed three-token vocabulary. Always a *run's* end state. Never called a run status or a completion status. `suite/authoring/interaction-posture.md` |
| **write authority** | The narrow, purpose-shaped set of files a given skill may write, stated in that skill's own body. A convention realized by skill design, not by filesystem controls. `suite/authoring/side-effects.md` |
| **workflow** | Not a term of art here. Write **method** for the whole approach, **thread artifact** for the artifact domain, and **process** for process-level intent. |
| **`## Workflow`** | Never a section heading in a skill body. A skill's end-to-end sequence lives under `## Procedure`. |

## Retired

| Term | Meaning |
| --- | --- |
| **primitive** | Leaves the vocabulary. Write **model-invoked skill** for a skill the model may reach for on its own, and **instruction** for a shared reference holding one procedure. |
| **caller** | Leaves the vocabulary. A skill that invokes another neither authorizes it nor owns its writes, so there is nothing left for the word to name; write the invoking skill's name where one must be referred to. |
| **caller-authorization block** | Leaves the vocabulary. A skill gathers its own inputs and states its own write boundary, so no skill acts on a block of fields another supplies. |
| **recipe** | Leaves the vocabulary. Skills compose by invocation and nothing else, so name the skill to reach for; no document describes a named path through them. |
| **Quick / Standard / Roadmap** | Leaves the vocabulary as the name of a set of paths through the skills. `roadmap` remains the name of a skill and a roadmap index remains an artifact. |
| **step** | Leaves the vocabulary, and the project glossary's `stage` vs `step` row goes with it. Write the plain English word where a numbered item is meant. |
| **process shape** | Leaves the vocabulary. Nothing classifies how much ceremony a change earns; the skills a thread uses are chosen one at a time as the work needs them. |
| **archive** | Leaves the vocabulary. A closed thread stays where it is, and no path, folder, or operation is named for setting one aside. |

The project glossary's paragraph contrasting a recipe with the CLI's enforced
sequence goes with the term `recipe`: no such contrast is drawn.

| Term | Meaning |
| --- | --- |
| **assumption** | Something the user and the agent take as true without confirmation, recorded as a log entry of type `assumption` by a skill that settles points with the user, and which later work may need to revisit. |
| **inference** | A point the agent settles alone because it follows from the settled points or has one plainly sensible answer, non-binding until the spec pins it; it appears in the discussion's closure list, where the user may promote it to a fork, and in the spec's `## Inferences` section, whether the discussion listed it or the spec agent found it while writing. |
| **degree of freedom** | A *how* the spec deliberately leaves open to the implementer, listed in the spec's `## Degrees of freedom` section; every admissible choice satisfies the acceptance criteria unchanged, none produces a user-visible difference the user would want to weigh in on, and any is reversible without revising the spec. |
| **judgment call** | A choice an implementer makes where the spec pins nothing, inside a granted degree of freedom or in the spec's silence; distinct from a deviation, which departs from something pinned. |

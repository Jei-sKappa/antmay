---
name: The rule that another thread is history is stated in the Inputs of every skill that gathers thread inputs, with the read-and-cite instruction holding the canonical wording.
description: The "another thread is history" rule is repeated in every thread-reading skill's Inputs.
---

An agent that reads a thread other than the one it works on can take that thread's spec for standing truth. The rule against it — any other thread is history, read only when the user or this thread's seed names it — has its canonical wording in `suite/shared/references/instructions/read-and-cite-the-project-layer.md`, and the same sentence closes the `## Inputs` of every skill that gathers thread inputs. Each skill reads its own inline inputs at the start of a run and opens that instruction only for citation forms, and several skills do not carry the instruction at all, so the sentence reaches an agent only where it sits in the skill's own inputs. The copies are kept identical by hand.

## Rejected alternatives

- The sentence in `discussion` alone — the plan, implement and spec skills are where an old spec does damage, and they would be unguarded.
- The sentence in the shared instruction alone — no skill reads that instruction's read order at run start, and seven skills do not carry it.
- A pointer from every skill to the instruction — it adds indirection for one sentence a skill body should state itself.

---
type: create
---

---
description: The project layer holds decision records, the glossary and the project's agents files, and no document describing what the product does or how the system is structured; behavior and structure are read from the code.
---

What the product does and how the system is structured are read from the code and its tests, because documents describing either drift as soon as work moves fast and mostly restate what the code already shows. Every `AGENTS.md` or `CLAUDE.md` belongs to the project layer and holds only critical rules, how the repository is structured and where to find things, and pointers that name a trigger, so rules for agents have one reviewed and bounded home instead of accumulating by hand. A behavior commitment that carries a reason and a rejected alternative is a PDR.

## Rejected alternatives

- Keeping a narrower descriptive kind — it drifts the same way, only more slowly.
- Leaving the agents files to the user — rules for agents then accumulate there unreviewed and unbounded.
- A generated, marker-delimited block in the agents file — it covers only pointers and needs a generator the suite has no runtime for.

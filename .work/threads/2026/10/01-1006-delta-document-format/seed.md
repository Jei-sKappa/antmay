---
external: "https://github.com/Jei-sKappa/antmay/issues/81"
---
# Explore a different format for delta documents

## Ticket

> The current format of delta documents, the files in a thread's delta that name one project-layer file as their target and carry a `create`, `edit`, or `delete` type, is not satisfactory. The three types, the literal `add`/`replace`/`remove` operations of an `edit`, and the recorded blob hash are the parts that make up that format today.
>
> The wanted outcome is to explore what a better format would look like and to decide whether and how to change it. What specifically is wrong with the current format has not been pinned down yet, so that is the first thing the exploration has to establish.

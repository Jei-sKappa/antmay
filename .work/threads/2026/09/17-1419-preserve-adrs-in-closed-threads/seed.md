---
external: "https://github.com/Jei-sKappa/antmay/issues/77"
---
# Preserve ADRs in closed threads

## Ticket

> `close-thread` currently moves draft ADRs from a thread’s `adr/` into `docs/adr/`, while glossary terms are merged and the thread’s `glossary.md` remains. A real close therefore removes half of the thread’s delta from its durable historical folder and treats ADRs inconsistently with glossary terms. Closed threads are expected to retain their artifacts as the record of that unit of work; landing the delta should populate the project layer without removing the thread’s original ADRs or glossary.

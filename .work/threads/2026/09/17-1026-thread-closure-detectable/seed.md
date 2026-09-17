---
external: "https://github.com/Jei-sKappa/antmay/issues/68"
---
# Make a thread's closure detectable from the thread itself

## Ticket

> Nothing a thread carries says it was closed.
>
> `close-thread` lands the thread's draft ADRs into `docs/adr/`, merges its `glossary.md` into the project glossary, and writes a `Closed:` line beneath the roadmap entry the seed names. Inside the thread it writes nothing — it does not append to the thread log, and it leaves no mark in `seed.md` or anywhere else in the folder. Its own body states the position plainly: "what marks the thread closed is that its drafts and its terms now live in the project layer."
>
> That makes closure something to infer rather than something to read. Anyone asking whether a given thread's ADRs and glossary terms actually landed has to look outside the thread and reason backwards — an empty `adr/` folder could mean the drafts landed or that the thread never drafted any, and a term found in `docs/glossary.md` could have come from this thread or from another. The one durable record of a close, the roadmap `Closed:` line, exists only when the seed carries a `Roadmap:`/`Entry:` pair; a thread opened without one leaves nothing behind.
>
> What is wanted is to be able to tell, from a thread, that it was closed and that its delta was applied. Where that marker lives is open — the thread log and artifact frontmatter are both candidates, and neither has been chosen.

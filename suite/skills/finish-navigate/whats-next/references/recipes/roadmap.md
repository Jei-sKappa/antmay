# Roadmap recipe

A Roadmap thread is an ordinary thread whose deliverable is a direction: the index under `docs/roadmaps/` and the ADRs that direction rests on.

1. Open the thread with `open-thread`.
2. Discuss the direction with `discussion`, settling its constraints as draft ADRs and glossary entries in the thread's delta.
3. Author the index at `docs/roadmaps/<yymmddhhmm>-<slug>.md` with `roadmap`.
4. Finish the thread with `finish` and choose how to handle the branch.
5. Close the thread with `close-thread`, so the direction's ADRs land in the project layer before any entry is worked.

Entries are opened lazily, one at a time, as the frontier reaches them. `open-thread` given the index path and an entry's slug opens an ordinary thread for that entry, which then follows the Quick or the Standard recipe and records its outcome on the entry when it closes.

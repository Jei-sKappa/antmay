# Rethink how the Antmay method handles project documentation

## Intent

Part of the Antmay method manages project documentation: the decision records under `docs/adr/` and `docs/pdr/`, product behavior under `docs/product/`, architecture descriptions under `docs/architecture/`, the glossary, and the delta documents a thread lands at close. How the method handles these documents is unsatisfactory in three ways:

- Creating documents is too easy, so projects end up with a lot of them.
- The documents are too long and too descriptive for no good reason, so an agent that reads them fills its context with material it may not need.
- The documents drift out of sync with their source of truth, which is usually the code, and in this repository the skills.

One direction under consideration, not a settled decision, is that the documents the method manages should mainly help keep a project's `AGENTS.md` / `CLAUDE.md` lean, with those files staying small and pointing to other documents only when such documents exist and are needed. Under that direction a document would be justified only when it records something hard to tell from the codebase alone or hard to find in it, such as a guide that helps an AI or a new developer explore a part of the code that is difficult to navigate, and anything the code already makes clear would not be written down. Other ideas remain open.

To inform the discussion, research was carried out into how eight other projects cloned under `.library/sources/` handle documentation — BMAD-METHOD, OpenAgentsControl, OpenSpec, beads, spec-kit, mattpocock/skills, superpowers and gsd-core — with one report per project and a cross-project synthesis in this thread's `research/` folder (the synthesis is `research/003-synthesis.md`).

The goal of this thread is to discuss the problem in more detail and decide what the method should change, learning from what those projects do and avoid. Changes to the method are to go through this thread rather than being made directly to the suite, the project layer, or any `AGENTS.md`.

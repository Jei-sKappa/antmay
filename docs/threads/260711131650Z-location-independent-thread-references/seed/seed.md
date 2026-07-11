# Seed: Location-independent cross-thread references

External: none — no tracker in use for this repo; visibility is the git history and this thread.

Today the V2 rules mandate that a cross-thread reference is a **full repo-relative path** — `docs/threads/<slug>/specs/001/spec.md`. That path hard-codes *where* the thread physically lives, so it becomes literally stale the moment a thread is relocated (e.g. into `docs/threads/archive/<slug>/`). The idea to explore is switching cross-thread references to a **location-independent form** that keeps the deep path to the exact artifact but drops the `docs/threads/` location prefix — e.g. `thread <slug>/specs/001/spec.md` — so a reference names the thread by its (unique, unmoving) slug rather than its mount point, and never rots when the thread moves.

This surfaced while designing the thread-archival skill (see docs/threads/260711092837Z-thread-archival/). That thread deliberately chose **move-only** archival with no link rewriting, relying on the "slug-as-durable-locator" property: because the unique slug travels with the folder, even a stale `docs/threads/<slug>/…` path is resolvable in one grep. So this convention change is **not required** for archival to work — it is a separate, optional refinement about how references are *written* going forward.

Known tensions to weigh before committing (raised but not resolved):

- **Cost to the common case.** Full paths are clickable today (terminal, GitHub, editors) — and most cross-thread references point at *active* threads, so they resolve. A `thread <slug>/…` form is never a real path, so it loses clickability for *all* cross-thread references to fix stale-looking paths only for the archived minority.
- **Marginal, largely cosmetic benefit.** Slug-as-locator already keeps archived references resolvable; the convention's gain is mainly that they look clean instead of stale.
- **Large blast radius.** The rule is restated inline in ~19 active skills plus the deprecated `plan-loose`, and defined in three V2 docs (`thread-layout.md`, `filename-grammar.md`, `reviews.md`). The V2 docs are immutable-by-convention, so a proper change is closer to a V3-scale ruleset revision than a quick edit.
- **Tooling/greppability.** The `docs/threads/` prefix is a clean anchor for programmatically finding cross-thread references; `thread ` as a prefix is fuzzier since the word appears in prose.

The "drop the location prefix" framing is a starting hypothesis, not a settled decision — keeping the current full-path convention is a live option, and a different reconciliation may win.

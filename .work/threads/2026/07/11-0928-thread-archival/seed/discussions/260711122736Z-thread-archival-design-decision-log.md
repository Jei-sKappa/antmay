# Decision log — thread-archival design (the seed)

Thread: docs/threads/260711092837Z-thread-archival/
Target: the seed (seed/seed.md)
Subject: designing the thread-archival capability — what gets built, how closed/abandoned threads are moved into an archive, and how cross-thread link integrity is preserved — as pre-spec genesis decisions.

## P1: Deliverable form — a skill that moves + rewrites links

Point: Before we talk about *where* the archive lives, we need to decide what the junior dev is actually implementing, because "preserve link integrity on move" can mean anything from "a documented manual procedure" to "a script that rewrites every inbound link."

What you need to know: This repo is a *content* repo — `SKILL.md` files plus workflow docs. There's no runtime, no linker, no CI. The archival capability could plausibly land as any of: a new **skill** (natural-language procedure an agent executes), a **shell/node script**, a pure **workflow-convention doc** under `docs/workflow/v2/`, or some combination. The cross-thread links that break are plain markdown text scattered across `docs/threads/**` (and potentially `README.md`, `AGENTS.md`, living docs). Preserving them means either (a) find-and-rewrite every inbound reference at archive time, (b) leave something at the old path so the old link still resolves (symlink or a redirect stub), or (c) don't physically relocate at all and mark "archived" another way.

Decision: Build a new **skill** (`archive-thread`) that an agent runs. The skill body is the procedure: identify closed/abandoned threads, `git mv` the thread folder into the archive location, then scan the repo for inbound `docs/threads/<slug>/…` references and rewrite them to the new archived path. Not a deterministic script, not a pure symlink/stub convention.

Rationale: A skill matches what this repo is — a dogfooded skills collection — and needs no new toolchain. Link rewriting is a bounded grep-and-replace an agent can perform reliably given a precise spec. With ~10 threads and only a handful of inbound cross-thread links, a tested script (option B) is not yet justified, and structural tricks (option C: symlink/redirect stub) trade a clean move for permanent residue and platform fragility. Trade-off accepted: rewrite correctness rests on the agent following the spec rather than on a deterministic tool; the spec must make the scan-and-rewrite step precise enough to be safe.

## P2: The skill's input model

Point: How does `archive-thread` decide *which* threads to act on?

What you need to know: "Closed" is well-defined here: a thread's disposition is the last disposition line in its `ledger.md`, and the terminal values are `closed: done` and `closed: dropped`. `deferred` is a *reversible pause* — explicitly not finished — and a thread with no disposition line is active. The seed scopes archival to "finished or intentionally-abandoned" threads, which maps exactly to `closed: done` / `closed: dropped`. Your proposal: accept a single thread, a list, or "something even more general (all threads from a day)"; with no input, scan for closed threads and offer them.

Decision: The skill has two operating modes. (1) Explicit target(s): the user names one thread or a list of threads to archive. (2) No input: the skill scans all threads, collects those whose ledger disposition is `closed: done` or `closed: dropped`, lists them, and asks for confirmation before moving. Drop the "all threads from a specific day" date selector — the two modes already cover it (a day's threads are just a list), and a date DSL is unneeded parsing surface. In explicit mode, if a named thread is NOT closed (it is active or deferred), the skill warns and requires explicit confirmation before archiving it rather than moving silently or refusing outright.

Rationale: Two modes cover the real workflows with minimal branching; every extra input branch is a branch the implementer can get subtly wrong, so the date selector is cut as YAGNI. The confirm-on-non-closed guard protects the "finished/abandoned only" intent — archiving a live thread is an easy mistake to make and annoying to unwind — while still allowing a deliberate override (e.g. shelving a dropped-but-unmarked thread) after the user sees the warning.

## P3: Finish-hook — natural-language offer only

Point: You want `finish` to ask "archive this thread now?" after its handshake. There's a direct conflict with a repo rule, so we need to decide how (or whether) to wire this.

What you need to know: This repo's `AGENTS.md` has a hard skill-self-containment rule: *"Do not couple one skill to another by explicit skill name, command, path, or invocation condition. Natural-language awareness is fine."* So `finish` cannot say "invoke the `archive-thread` skill." It would either have to duplicate the entire archival+link-rewrite procedure inline (defeats having a separate skill and creates two copies to maintain), or just mention archival exists in prose. There's also an ordering wrinkle: `finish`'s closure step can merge the thread branch into `main` and push before you'd archive — and `finish` deliberately doesn't commit — so an archival triggered "after finish" is a separate move+rewrite landing as its own commit, possibly directly on `main`.

Decision: Option B. `finish` gains a natural-language offer to archive the thread after its handshake — no skill name, no path, no invocation condition, no duplicated procedure. It states that the now-closed thread may be archived, leaving a sufficiently capable agent to autonomously invoke the standalone `archive-thread` skill. `archive-thread` remains a standalone skill; archival is NOT folded into `finish` as a handshake step.

Rationale: Option B respects the self-containment rule (natural-language awareness is explicitly allowed; naming/invoking another skill is not) while still giving the user the nudge at the moment a thread closes. Folding archival into `finish` (option C) was rejected because it duplicates the archival procedure into a second maintenance site and forces the move+rewrite into `finish`'s commit-less, branch-disposing flow — awkward when `finish` may have just merged to `main`. Keeping `archive-thread` standalone preserves the natural housekeeping cadence (sweep several closed threads at once) without coupling the two skills.

## P5: Link strategy — move-only, slug-as-durable-locator (revises P1's rewrite step)

Point: How archival preserves cross-thread references. Rewriting inbound links (P1) means editing other threads' files — which are frozen records, often in closed (frozen) threads — colliding with V2 record immutability and the freeze guard. The question is whether archival should rewrite inbound links (with an immutability carve-out) or take a different route entirely.

What you need to know: All existing cross-thread references are full repo-relative paths (`docs/threads/<slug>/…`), often deep file links (`…/specs/001/spec.md`). The freeze guard rejects all diffs to a `closed:` thread and records are immutable at emission, so rewriting inbound links would require editing frozen files. However, the thread slug is globally unique and travels with the folder — the chosen archive layout (P4) only *prefixes* the path with `archive/`, it never renames the slug. `thread-layout.md` already blesses archival as a legitimate move. The seed requires "link integrity"; the repo has no build, no link-checker, and links are read by greppable humans/agents.

Decision: Archival is **move-only**. `archive-thread` performs the `git mv` of the thread folder into `docs/threads/archive/<slug>/` and does nothing else — it does NOT rewrite inbound links and does NOT edit any other thread's files. No immutability/freeze carve-out is adopted, because no frozen record is ever touched. "Link integrity" is reframed as **link resolvability**: because the unique slug travels with the folder, any now-stale `docs/threads/<slug>/…` reference still contains the slug and is resolvable in a single grep (found under `archive/`). This revises the inbound-link-rewrite step described in P1; P1's decision to build a standalone `archive-thread` skill stands, but its "scan and rewrite inbound references" step is dropped in favor of move-only.

Rationale: Move-only honors record immutability and the freeze guard completely — the earlier rewrite approach's fatal cost was editing frozen records in closed threads, which the owner rejected. The slug-as-durable-locator property preserves *resolvability* of both existing and future references with zero edits. Accepted trade-off: stale literal paths lose clickability in rendered markdown / terminal (a reader greps the slug instead of clicking); at this repo's volume, with mostly historical back-references, that is an acceptable price for never mutating a frozen artifact.

## P6: Archival is a pure move — writes nothing, commits nothing

Point: Beyond the `git mv`, does `archive-thread` write anything into the thread, and does it commit the move itself?

What you need to know: The ledger grammar (`lifecycle.md`) has no "archived" event — its events are only tier and disposition transitions — and archiving is a location change, not a lifecycle transition. Git history already records a rename. `finish` deliberately does not commit; it writes to disk and leaves committing to the surrounding session.

Decision: Archival writes NOTHING into the thread — no "archived" ledger event, no marker file, no frontmatter change. It is a pure folder move (`git mv` into `docs/threads/archive/<slug>/`) whose only record is git history. The skill also does NOT commit the move — it leaves the staged `git mv` for the surrounding session to commit, mirroring `finish`'s commit policy.

Rationale: Adding an "archived" marker would materialize a derivable, location-based fact (drift risk) and would mean writing into a frozen/closed thread — exactly what P5 avoids. Git's rename tracking is a sufficient and tamper-evident record. Leaving the commit to the surrounding session keeps the skill's side effects predictable and consistent with the existing finish convention.

## P7: Un-archive in scope as the trivial inverse; skill stays minimal, guards by agent judgment

Point: Is un-archiving in scope, how much guard machinery does the skill need, and how big should it be?

What you need to know: Because archival is now a pure folder move (P5, P6), the inverse — moving a folder back out of `docs/threads/archive/<slug>/` to `docs/threads/<slug>/` — is symmetric and trivial. The owner wants the skill kept small and is comfortable relying on the running agent's own judgment for obvious mistakes rather than hard-coded checks.

Decision: Un-archiving IS in scope, expressed as a single sentence noting the skill can also perform the inverse move (out of `archive/` back to the active thread root) — no separate procedure needed, since it is the same folder move reversed. The skill stays minimal. It does NOT hard-code idempotency/validation machinery; instead it relies on the running agent's judgment to avoid obvious mistakes (re-archiving an already-archived thread, un-archiving a thread that is not archived) and to honor the P2 confirm-on-non-closed guard for explicitly-named non-closed threads.

Rationale: With a pure-move design the skill's essential job is one `git mv` (and its reverse), so the skill body should be correspondingly small rather than padded with defensive branching. The owner explicitly accepts agent judgment for the trivial "am I doing something obviously wrong" checks; over-specifying guards for a symmetric folder move would add surface without proportional safety value.

## P4: Archive location and structure

> **Erratum (restored 260711132142Z):** this P4 record was decided and confirmed in session (owner answered "A1+B1") but was never persisted to the log due to a shell error during the original append; P5 and P6 already reference it. It is restored here, out of sequence, so the decision is not lost. Content reflects the original decision verbatim in substance.

Point: The destination path. The seed floats "an Archive folder" and "possibly split by year/month/day," but calls it a starting hypothesis. This decides the exact path shape every reference must resolve against, so it needs pinning.

What you need to know: Threads today live flat at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. The no-input scan-closed mode (P2) walks that directory, so wherever the archive goes, the scan must not mistake the archive container itself for a thread. Two independent choices: (a) the container location, and (b) whether to sub-bucket by date. On volume: this repo has ~10 threads total after a year — so per-day or even per-month buckets would mostly hold a single thread each. The thread folder name already begins with its open-date UTC stamp, so a flat archive still sorts chronologically for free.

Decision: A1 + B1 — the archive lives at `docs/threads/archive/<slug>/`, flat (no date sub-buckets). `archive` is a reserved subfolder name under `docs/threads/`; the scan-closed logic skips the literal `archive/` entry (real thread folders always begin with a digit, so there is no collision). The move maps `docs/threads/<slug>` → `docs/threads/archive/<slug>`.

Rationale: At ~10 threads/year, date buckets add path depth and complexity to sort a list that already self-sorts by the UTC stamp embedded in each folder name. Keeping the archive under `docs/threads/` keeps the "is this a thread?" scan logic in one place. Adding a year layer later is a trivial follow-up if the archive ever feels crowded, so it is not paid for now.

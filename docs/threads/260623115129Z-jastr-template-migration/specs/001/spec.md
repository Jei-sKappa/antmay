---
version: 3
status:
  approved: 260629115823Z
---

# Spec: Migrate the workflow skill suite to composable jastr templates

## Intended outcome

The 29 active skills under `skills/workflow/**` are no longer hand-authored
`SKILL.md` files. Each is **generated** from a jastr template in a committed
`.jastr/` catalog, and the boilerplate that is currently copy-pasted across
siblings (commit policy, immutability, tier awareness, disposition frontmatter,
and more) lives in **one** canonical partial each, pulled into every template
via `include`. A single command regenerates every `SKILL.md`, and a `--check`
mode proves the committed outputs are in sync with the catalog.

For the people and tools that consume these skills, **nothing changes**: the
same 29 skills exist at the same paths with the same names and descriptions, each
shipped as one self-contained `SKILL.md` installable via
`npx skills add Jei-sKappa/skills --skill <name>` with no `jastr` required
downstream. The win is entirely on the authoring side — drift is eliminated at
its source, and a shared section is edited once instead of up to twenty times.

## Context

The workflow skill suite is a content repository whose skills are deliberately
self-contained; as a result the same boilerplate section is copy-pasted into
many `SKILL.md` files. The repo's own analysis tool, run over the active scope
(`scripts/skill_header_stats.py --drift --bucket workflow`), measures this: across
the 29 active workflow skills, 44 section headers are shared, of which 19 are
"drift candidates" — sections meant to be identical that have
silently diverged into near-identical variants (`Commit Policy` in 20 skills,
`Immutability` in 15, `Disposition Frontmatter` in 5, `Tier Awareness` and
`Lineage Folder and Filename` in 4 each, and the implement-trio's worktree/commit
sections in 3 each). The seed (`seed/seed.md`) opened this thread to kill that
duplication by migrating the suite onto composable jastr templates: shared
content extracted into `include` partials maintained in one place.

The foundational design was settled in a genesis discussion before any artifact
existed. **All settled decisions in this spec are cited as `DL P<N>`, referring
to the genesis decision log
`seed/discussions/260628151324Z-rendering-distribution-model-decision-log.md`.**
Decisions settled later, while disposing this spec's first review, are cited as
**`RD P<N>`**, referring to the review-disposition decision log
`specs/001/discussions/260629080603Z-spec-review-disposition-decision-log.md`.
Each citation points to the decision that makes the cited statement binding.

jastr (the deterministic Markdown template renderer this migration depends on)
is vendored at `.library/sources/Jei-sKappa_jastr/`. It gained the native
capability this migration needs — `jastr generate agent-skill <ref> --out <path>
--mode=inline`, which renders a self-contained `SKILL.md` — during this thread's
discussion; the capability is implemented, sealed, and was smoke-tested
end-to-end against the exact catalog shape this spec pins (DL P1, DL P4).

## Scope

### In scope

- A committed jastr catalog under `.jastr/` at the repo root, holding **one
  group** containing one template per active workflow skill plus the shared
  partials (DL P2, DL P3).
- Reconciling the duplicated/drifted boilerplate sections into canonical shared
  partials (DL P2, DL P10).
- Producing and reviewing a **reconciliation matrix** — every drift candidate
  classified reconcile-vs-keep with a reason — **before** any skill is rebaselined
  (RD P5).
- Authoring one template per active workflow skill (29 templates), each carrying
  its own frontmatter and a body composed of `include`s plus that skill's unique
  content (DL P3).
- A generation script that regenerates every `SKILL.md` via inline mode and a
  `--check` mode that gates freshness (DL P4).
- Regenerating all 29 `SKILL.md` files as a **one-time, content-preserving
  rebaseline**, reviewed per skill via `git diff` (DL P5, DL P6).
- Bumping the `metadata.version` of each skill whose **content** actually changed
  (a formatting-only diff does not bump) (DL P7, RD P4).
- Authoring the three reference-bearing skills' files in the catalog under
  `.jastr/workflow/templates/<skill>/references/` and mirroring them into the
  skill folders via the build script (RD P1).
- Moving the drift-analysis tool from `temp/` to a committed
  `scripts/skill_header_stats.py` so the Context metrics and AC-3.2 are
  reproducible (RD P2).
- Updating `AGENTS.md` to describe the new authoring model (DL P3, RD P1, RD P4).

### Out of scope (non-scope)

- **`skills/deprecated/**`** — retired skills stay hand-authored and are **not**
  migrated (DL P9).
- **Merging skill families into one template + variants** (the "B" approach).
  This migration starts at the conservative "C" approach — every skill is its
  own template, DRY achieved purely through partials, with conditionals and
  interpolation used **only inside partials**, never as a template-level routing
  layer (DL P2). A future C→B upgrade is anticipated but explicitly not performed
  here; the spec only records its trigger (see Expected behavior §9).
- **The execution batching scheme.** The work is "convert everything," divided
  into task batches; the batching is deferred to plan emission and is **not**
  decided or constrained by this spec (DL P5).
- **Any change to jastr itself.** Inline mode already exists and is sufficient;
  no work in the vendored jastr repo is part of this migration.
- **Any change to the consumer distribution model.** Consumers must continue to
  receive one self-contained `SKILL.md` with no `jastr` dependency (DL P1).
- **Changes to the skill registries' contents** — `README.md`,
  `.claude-plugin/marketplace.json`, and `.vscode/settings.json` keep the same
  skill set, paths, names, and descriptions; they are not re-registered (DL P3).
  (`AGENTS.md` is the one governance file that does change.)
- **Runtime "router" wrappers** — the rejected alternative where consumers run
  `jastr` at invocation (DL P1).

## Constraints

- **jastr inline contract (binding behavior of the tool).** `jastr generate
  agent-skill <ref> --out <path> --mode=inline` emits `---\n<frontmatter
  yaml>\n---\n\n<rendered body>` where the body is the fully rendered template
  (includes resolved, conditionals evaluated, interpolations substituted) emitted
  **verbatim**. Frontmatter is serialized via the tool's `YAML.stringify` path
  (key order/spelling are the tool's, not the author's). `targets.agent-skill`
  (carrying at least `name` and `description`) is **required** or generation
  fails. Template **input flags are valid only in inline mode**. `--check`
  rebuilds in memory and byte-compares against the file at `--out`, exiting 0 when
  identical and non-zero when stale or missing. Authoritative reference: the
  vendored jastr inline-mode spec at
  `.library/sources/Jei-sKappa_jastr/docs/threads/260627210636Z-generate-full-skill-body/specs/001/spec.md`
  (DL P1, DL P4).
- **Single flat group.** jastr groups are one level deep and an `include` cannot
  cross a group root; a *standalone* (ungrouped) template can include only from
  its own directory. Cross-skill partial sharing therefore **requires** all
  templates to live in one group with shared partials at the group root, included
  via `root="group"` (DL P2, DL P3).
- **Emitted output must stay self-contained.** A generated `SKILL.md` must
  contain no reference to `jastr` and no unresolved `include` directive; the
  inline render is what guarantees this (DL P1, DL P3).
- **No consumer-side jastr dependency** (DL P1).
- **Author-side jastr binary must be inline-capable.** The installed `jastr-dev`
  is stale and points at a different checkout; the binary to use is the freshly
  built `.library` bundle at
  `.library/sources/Jei-sKappa_jastr/packages/cli/dist/index.js` (version
  `0.1.0 (6674fd3)` or later, built with `bun install && bun run build` in the
  vendored repo). The script reaches the binary through a `JASTR_BIN` env var
  rather than a hard-coded path (DL P4).
- **No CI and no git hooks exist in this repo.** Freshness enforcement is
  documented discipline plus the `--check` script; a pre-commit hook is optional,
  not mandatory (DL P4).
- **Template bodies — and any partial placed at the top of a body — must start
  cleanly** (no leading blank line), because the renderer emits the body verbatim
  and a leading blank line produces a double blank line under the closing `---`
  (DL P4, RD P10).
- **Prefer template-author `default:` over `required:` inputs.** Most templates
  should declare **no inputs at all**, so every regen/`--check` command stays
  flag-free and self-contained (inline's suggested-fix messages do not
  reconstruct input flags) (DL P4).
- **This work changes skill *authoring*, not skill *behavior*.** The migration
  is content-preserving: no skill's instructions change except for deliberate,
  reviewed drift-reconciliations (DL P6).
- **Commit policy.** Per the repo rules, do not auto-commit; commits (if any) are
  the surrounding session's decision and follow Conventional Commits. New skill
  scopes are not introduced by this migration (the skill set is unchanged).

## Expected behavior

References to settled decisions are inlined at the point each becomes operative.

1. **Catalog exists and is committed.** A `.jastr/` directory at the repo root
   holds one group `workflow`, marked by `.jastr/workflow/.jastrgroup`, with two
   children: `.jastr/workflow/partials/` (shared fragments) and
   `.jastr/workflow/templates/` (one subfolder per skill). `.jastr/` is committed
   source of truth, not gitignored (DL P3). **No `.jastr/config.yml` is shipped**
   under the C approach: it is optional (a grouped template generates and
   validates without one — verified), and with no variants and no required inputs
   there is nothing for it to hold (DL P2, RD P3).

2. **One template per active skill.** For each of the 29 active skills under
   `skills/workflow/**`, there is exactly one
   `.jastr/workflow/templates/<skill-name>/TEMPLATE.md`, where `<skill-name>` is
   the skill's leaf directory name (a valid jastr template-id). The 29 skills are
   the current contents of the tree, spanning the phase buckets
   `capture-discussion` (4), `documentation` (1), `finish-navigate` (3),
   `handoff` (3), `implement` (3), `merge` (1), `plan` (3), `propose` (1),
   `research` (2), `review` (6), `spec` (1), `support` (1); the live tree is the
   authoritative list (DL P3, DL P5). `skills/deprecated/**` has no templates
   (DL P9).

3. **Shared boilerplate lives in canonical partials.** Each duplicated section
   that survives the reconciliation judgment is a single file under
   `.jastr/workflow/partials/`, included by every template that needs it via
   `::include{root="group", path="partials/<name>.md"}`. The reconciliation
   judgment (DL P10): a section is reconciled into a shared partial **only when
   its differences across skills are incidental** — wording drift, or an artifact
   noun absorbable by interpolation; a section whose differences are **semantic**
   stays skill-specific; **when in doubt, keep it separate** (false-merging
   silently corrupts a skill, whereas a missed merge only leaves harmless
   duplication). High-confidence partial candidates surfaced by
   `scripts/skill_header_stats.py --drift --bucket workflow` (scoped to the active
   workflow skills; deprecated excluded from the drift gate, DL P9, RD P6) include
   commit policy, immutability,
   tier awareness, disposition frontmatter, and lineage-folder-and-filename; the
   exact final set is determined by applying the DL P10 criterion (see Degrees of
   freedom). Variation that is absorbed is handled **inside the partial** via
   interpolation or an internal conditional, never relocated verbatim (DL P2).

4. **Each template renders to a self-contained skill.** Every `TEMPLATE.md`
   declares `targets.agent-skill.frontmatter` carrying the skill's existing
   `name`, `description`, and `metadata: {author, version}` (passed through
   unchanged by the renderer, DL P8). Its body is composed of `include`s plus the
   skill's unique content and starts cleanly (no leading blank line). Generating
   it with `--mode=inline` produces a `SKILL.md` containing only frontmatter plus
   the rendered body — no `jastr` reference, no unresolved `include` (DL P1).

5. **A generation script drives all 29 outputs.** `scripts/generate-skills.sh`
   (alongside the repo's existing `scripts/`) has two modes: the default
   regenerates every skill, invoking, per skill, the equivalent of
   `"$JASTR_BIN" generate agent-skill workflow/<skill-name> --out
   skills/workflow/<phase>/<skill-name>/SKILL.md --mode=inline`; the `--check`
   mode passes `--check` through to every invocation and exits non-zero if any
   output is stale or missing (DL P4). Before writing anything, the script
   **preflights** the binary and fails unless `$JASTR_BIN` reports version
   `6674fd3` or later and `generate agent-skill --help` exposes `--mode` — guarding
   against the stale `jastr-dev` on PATH and against silently emitting a router
   wrapper when `--mode=inline` is omitted (RD P8). In the same pass the script
   **mirrors** each template's `references/` folder into the skill folder, and
   `--check` also flags a drifted or orphaned reference mirror (§11, RD P1). The
   output-path
   source (walk the existing
   `skills/workflow/**` tree, read `marketplace.json`, or an explicit map) is the
   implementer's choice (see Degrees of freedom).

6. **The committed outputs are the rebaselined skills.** Running the script
   regenerates all 29 `SKILL.md` files in place and mirrors the three skills'
   `references/` folders (§11). This is a **one-time rebaseline**: the generated
   files replace the hand-authored ones. After it is
   reviewed and committed, `scripts/generate-skills.sh --check` exits 0 (DL P4,
   DL P6).

7. **Each conversion is proven content-preserving by `git diff`.** For each
   skill, the diff of its regenerated `SKILL.md` against the previously committed
   version must contain **no meaningful content change** — nothing added,
   dropped, or reworded — **except** (a) deliberate drift-reconciliations (a
   near-identical section normalized to its canonical partial) and (b) benign
   formatting normalization the renderer introduces (frontmatter key order via
   `YAML.stringify`; blank-line and trailing-newline handling). Every non-empty
   diff hunk must be explicitly reviewed and classified as (a) or (b); any other
   change is a migration defect to fix before committing. Strict byte-identity to
   the old files is **not** the bar — content-preservation-modulo-formatting is,
   judged by a human reading the diff (DL P6).

8. **Versioning tracks content change, not byte diff.** A skill's
   `metadata.version` (its semver) is bumped **iff** its rendered **content**
   changed — never for a formatting-only diff. This reuses the §7 per-hunk
   classification: a skill is bumped iff its reviewed diff contains a
   category-(a) drift-reconciliation hunk; a skill whose diff is entirely
   category-(b) benign renderer formatting is **not** bumped. The one rule covers
   both the one-time rebaseline and steady-state partial edits — on the
   rebaseline, only skills carrying a real reconciliation bump, even though every
   file shows a formatting diff. The bump is made in the template's
   `targets.agent-skill.frontmatter.metadata.version` and then regenerated
   (DL P7, RD P4).

9. **`AGENTS.md` documents the new model.** `AGENTS.md` is updated to (a) state
   that **nothing under `skills/workflow/` is hand-edited** — the entire skill
   folder (`SKILL.md` plus any `references/`) is materialized from
   `.jastr/workflow/templates/<skill>/`, so edit the template (or its
   `references/`) and regenerate; (b) restate the
   self-containment guarantee as applying to **rendered output**, enforced by the
   renderer, while authoring templates and partials may compose via includes;
   (c) rewrite the "Layout" and "When adding a new skill" sections around the
   template-authoring flow; and (d) record how to obtain an inline-capable
   `JASTR_BIN` and run the generation/check script (DL P3, DL P4). It also records
   the **C→B upgrade trigger** for future maintainers: consider promoting a family
   to one template + variants when its sibling templates have become mostly a
   parametrized-identical body, or when the same logical section has been edited
   across 3+ siblings in one change (DL P2).

10. **Consumer surface is unchanged.** The set of skills, their paths, names, and
    descriptions are identical to before; `README.md`,
    `.claude-plugin/marketplace.json`, and `.vscode/settings.json` need no edits;
    the Raycast sync (which reads `SKILL.md` bodies and embeds `references/`
    content) continues to work because the emitted files are still full
    self-contained skills and each skill's `references/` files are preserved
    byte-for-byte (see §11). The supported consumer-tooling check is the default
    registry/install path — not deep-discovery modes like
    `npx skills add --full-depth`, which surface unrelated `SKILL.md` files
    repo-wide (DL P1, DL P3, RD P1, RD P9).

11. **Reference files are materialized from the catalog, not hand-authored.** The
    three skills that carry a `references/` folder (`research/afk-exploration` ×4,
    `research/the-librarian` ×3, `implement/implement-plan-with-subagents` ×2)
    author those files in the catalog at
    `.jastr/workflow/templates/<skill>/references/`, co-located with `TEMPLATE.md`
    (jastr ignores them — they are not includes). The generation script, after
    writing each `SKILL.md`, **mirrors** that template's `references/` into
    `skills/workflow/<phase>/<skill>/references/`: files removed from the template
    are deleted from the skill folder, so the catalog is the single source of
    truth and no orphan lingers. Because this delete is destructive, the script
    **guards it**: it deletes only inside a realpath-contained
    `skills/workflow/<phase>/<skill>/references/`, **fails (writing nothing)** if a
    currently reference-bearing skill has no catalog `references/` on the first
    migration, fails on an ambiguous skill-id→phase mapping, and `--check` reports
    orphan/missing references without mutating (RD P7). Reference files are copied
    **verbatim** and are
    **never inlined** into `SKILL.md` — the body's `references/<name>.md` links
    stay plain text resolved at runtime, preserving progressive disclosure.
    Because copying is lossless, the one-time migration relocates these 9 files
    into the catalog and the round-tripped `skills/.../references/*` must be
    **byte-identical** to the pre-migration originals — a stricter gate than the
    `SKILL.md` content-preservation rule (RD P1).

12. **A reconciliation matrix gates the rebaseline.** Before any skill is
    rebaselined, a **reconciliation matrix** is produced and reviewed covering
    every drift candidate reported by `scripts/skill_header_stats.py --drift
    --bucket workflow`. Each row records: the candidate section, the decision
    (`partial` | `keep-specific`), the reason (`incidental` | `artifact-noun` |
    `semantic`), the affected skills, and the expected version-bump set. A section
    may be extracted into a shared partial **only if** the matrix classifies it
    `partial` for an `incidental` or `artifact-noun` reason; a `semantic`
    difference stays skill-specific. The matrix is the auditable front-loading of
    the DL P10 judgment — reviewed before the rebaseline rather than rediscovered
    hunk-by-hunk in the FR-7 diff. Its physical home is a Degree of freedom,
    produced at plan time (a plan section or a dedicated reconciliation record)
    (RD P5).

## Acceptance criteria

Tier 3 → machine-checkable. Each AC is a concrete pass/fail assertion and traces
to the requirement and decision it enforces.

**FR-1 — Catalog structure** (Expected behavior §1; DL P3)
- AC-1.1 `.jastr/workflow/.jastrgroup` exists as a file.
- AC-1.2 `.jastr/workflow/partials/` and `.jastr/workflow/templates/` both exist
  as directories.
- AC-1.3 `.jastr/` is tracked by git (not gitignored).
- AC-1.4 `jastr validate workflow/<skill-name>` exits 0 for every template
  (each template is well-formed and declares valid `targets.agent-skill`).
- AC-1.5 No `.jastr/config.yml` is present, and the catalog validates and
  generates without one (RD P3).

**FR-2 — One template per active skill** (Expected behavior §2; DL P3, P5, P9)
- AC-2.1 For every directory `skills/workflow/<phase>/<skill-name>/` containing a
  `SKILL.md`, a file `.jastr/workflow/templates/<skill-name>/TEMPLATE.md` exists.
- AC-2.2 The count of `templates/*/TEMPLATE.md` equals the count of
  `skills/workflow/**/SKILL.md` (29 at time of writing; the live tree is
  authoritative).
- AC-2.3 No template exists for any skill under `skills/deprecated/**`, and no
  file under `skills/deprecated/**` is modified by the migration.

**FR-3 — Canonical shared partials** (Expected behavior §3; DL P2, P10)
- AC-3.1 No section duplicated across templates appears as inline prose in more
  than one template when it has been reconciled; reconciled sections appear only
  as `partials/<name>.md`, pulled via `::include{root="group", …}`.
- AC-3.2 Re-running `scripts/skill_header_stats.py --drift --bucket workflow` over
  the regenerated `skills/workflow/**` (deprecated skills excluded) shows the
  reconciled sections collapsed to a single variant (or absent as standalone
  duplicates), i.e. the targeted drift candidates no longer report multiple
  near-identical variants (RD P6).
- AC-3.3 Every partial that absorbs per-skill variation does so via interpolation
  or an internal conditional within the partial file — no partial is duplicated
  per skill to dodge a difference.

**FR-4 — Self-contained inline output** (Expected behavior §4; DL P1, P8)
- AC-4.1 No emitted `skills/workflow/**/SKILL.md` contains the substring `jastr`
  or any `::include` / `::if` directive (every directive is resolved).
- AC-4.2 Each emitted `SKILL.md` begins with a YAML frontmatter block carrying
  `name`, `description`, and a `metadata` map with `author` and a semver
  `version`.
- AC-4.3 Every emitted skill's `name` equals its leaf directory name, and its
  `description` is unchanged from the pre-migration file (no genericization).
- AC-4.4 Each emitted `SKILL.md` has exactly one blank line between the closing
  frontmatter `---` and the body, and no partial placed at the top of a body
  introduces an extra leading blank (RD P10).

**FR-5 — Generation script** (Expected behavior §5; DL P4)
- AC-5.1 `scripts/generate-skills.sh` exists and is executable.
- AC-5.2 Invoked in default mode with an inline-capable `JASTR_BIN`, it writes a
  `SKILL.md` for all 29 skills into their existing phase-bucket paths.
- AC-5.3 Invoked with `--check`, it exits 0 when all outputs are current and
  non-zero (naming the offending skill) when any output is stale or missing.
- AC-5.4 The script resolves the jastr binary through `JASTR_BIN` (no hard-coded
  absolute path to a specific checkout).
- AC-5.5 The script preflights inline capability and exits non-zero **without
  writing any output** if `$JASTR_BIN` is older than `6674fd3` or its
  `generate agent-skill --help` does not expose `--mode` (RD P8).

**FR-6 — Freshness gate holds after rebaseline** (Expected behavior §6; DL P4, P6)
- AC-6.1 Immediately after a full regenerate-and-commit, `scripts/generate-skills.sh
  --check` exits 0 with no file changes in the working tree.

**FR-7 — Content-preserving rebaseline** (Expected behavior §7; DL P6)
- AC-7.1 For each migrated skill, `git diff` of the regenerated `SKILL.md`
  against its pre-migration committed version has been reviewed, and every
  non-empty hunk is classified as either a deliberate drift-reconciliation or
  benign renderer formatting normalization.
- AC-7.2 No migrated skill's rendered instructions add, drop, or reword content
  beyond those two classified categories.

**FR-8 — Versioning** (Expected behavior §8; DL P7)
- AC-8.1 A skill's `metadata.version` is bumped iff its regenerated output
  contains a content change (a category-(a) reconciliation per §7); a skill whose
  only diff is benign formatting is not bumped. This holds for both the one-time
  rebaseline and steady-state edits (RD P4).

**FR-9 — Governance docs updated** (Expected behavior §9; DL P2, P3, P4)
- AC-9.1 `AGENTS.md` states that nothing under `skills/workflow/` is hand-edited —
  the whole skill folder (`SKILL.md` plus any `references/`) is materialized from
  its template — and that one edits the template and regenerates.
- AC-9.2 `AGENTS.md` restates the self-containment guarantee as applying to
  rendered output while permitting authoring-side composition via includes.
- AC-9.3 `AGENTS.md`'s "Layout" and "When adding a new skill" sections describe
  the template-authoring flow (author a template + regenerate), and document
  obtaining an inline-capable `JASTR_BIN` and running the generation/check script.
- AC-9.4 `AGENTS.md` records the C→B upgrade trigger.

**FR-10 — Consumer surface unchanged** (Expected behavior §10; DL P1, P3)
- AC-10.1 `git diff` shows no change to `README.md`,
  `.claude-plugin/marketplace.json`, or `.vscode/settings.json` from this
  migration.
- AC-10.2 The set of `skills/workflow/**/SKILL.md` paths after migration equals
  the set before migration (no skill added, removed, renamed, or relocated).
- AC-10.3 The Raycast sync script runs successfully against the regenerated tree
  and produces a manifest covering all skills, and a default-path
  `npx skills add` install is unaffected by the new `.jastr/` directory — the
  supported check is the default install path, not `--full-depth` (RD P9).

**FR-11 — No scope creep into deferred/rejected work** (Scope; DL P1, P2, P5)
- AC-11.1 No `.jastr/config.yml` is shipped and no family is collapsed into a
  template + variants (the C approach holds; no B work) (RD P3).
- AC-11.2 No template-level routing input is introduced; conditionals and
  interpolation appear only inside partials.
- AC-11.3 No `SKILL.md` instructs the consumer to install or run `jastr`.

**FR-12 — Reference files preserved and mirrored** (Expected behavior §11; RD P1)
- AC-12.1 After migration, every `skills/workflow/**/references/**` file is
  byte-identical to its pre-migration committed version (empty `git diff`).
- AC-12.2 Each `skills/workflow/<phase>/<skill>/references/` directory is an exact
  mirror of `.jastr/workflow/templates/<skill>/references/` — same files, same
  bytes, and no orphan file present in the skill folder that is absent from the
  template.
- AC-12.3 `scripts/generate-skills.sh --check` exits non-zero when a skill's
  `references/` mirror drifts from its template's `references/`.
- AC-12.4 No reference file's content is inlined into any `SKILL.md`; the body
  links remain `references/<name>.md` text.
- AC-12.5 The script's reference deletion is realpath-contained to
  `skills/workflow/<phase>/<skill>/references/`, and the first migration **fails
  without mutating** if a currently reference-bearing skill has no catalog
  `references/` directory or its skill-id→phase mapping is ambiguous (RD P7).
- AC-12.6 `scripts/generate-skills.sh --check` reports an orphan or missing
  reference without deleting or writing anything (RD P7).

**FR-13 — Reconciliation matrix gate** (Expected behavior §12; RD P5)
- AC-13.1 A reconciliation matrix exists and is reviewed **before** the rebaseline,
  listing every drift candidate from `scripts/skill_header_stats.py --drift
  --bucket workflow` with its decision (`partial` | `keep-specific`), reason
  (`incidental` | `artifact-noun` | `semantic`), affected skills, and expected
  version-bump set.
- AC-13.2 No section is extracted into a shared partial unless the matrix
  classifies it `partial` with an `incidental` or `artifact-noun` reason; every
  `semantic`-classified section stays skill-specific.

## Degrees of freedom

The *what* above is pinned. These *hows* are deliberately left to the
implementer's free choice:

- **The exact final set of partials.** Which drift candidates become shared
  partials is determined by applying the DL P10 reconcile-vs-keep criterion to
  the `scripts/skill_header_stats.py` output; the named high-confidence candidates
  are a starting point, not a fixed list.
- **How each partial absorbs per-skill variation** — plain shared prose, jastr
  interpolation (`{{…}}`) with a defaulted template input, or an internal
  conditional — as long as the emitted output passes the FR-7 gate and templates
  stay flag-free where possible.
- **Partial granularity and naming**, and the internal section ordering within
  each template, provided the rendered output is content-preserving.
- **The output-path manifest mechanism** for the generation script — walk the
  `skills/workflow/**` tree, read `.claude-plugin/marketplace.json`, or maintain
  an explicit map.
- **`JASTR_BIN`'s default value and the script's internal implementation**
  (language, loop structure, how it discovers templates), provided FR-5 and FR-6
  hold.
- **Whether to add the optional git pre-commit hook** wrapping `--check`
  (DL P4 — optional, not required).
- **Exact wording** of the `AGENTS.md` edits, provided FR-9's assertions hold.
- **Conversion order at implementation time is not pinned here**; the batching of
  the work is the plan's responsibility (DL P5), and any order that satisfies the
  per-skill FR-7 gate is acceptable.

There are no degrees of freedom in: the single-group catalog layout (FR-1), the
no-consumer-jastr / self-contained-output guarantee (FR-4, FR-11), the
content-preservation bar (FR-7), the unchanged consumer surface (FR-10), or the
exclusion of deprecated skills and family-merging (FR-2.3, FR-11) — these are
pinned.

## Unresolved questions

These do **not** block emission or implementation; they are flagged for the
implementer to confirm and report back:

- **Magnitude of formatting-normalization diffs.** The renderer's `YAML.stringify`
  frontmatter serialization and blank-line handling will produce some benign
  diff on every file; the size of that diff (and thus how much per-skill review
  FR-7 entails) is unknown until the first real run. It is accepted under DL P6
  as benign formatting normalization regardless of magnitude.

## Illustrative example (non-normative)

This sketch shows the intended shape only; the internal structure of templates
and partials is a Degree of freedom and this example pins nothing.

A shared partial `.jastr/workflow/partials/commit-policy.md`:

```markdown
## Commit Policy

Never commit unless explicitly asked. Follow Conventional Commits.
```

A template `.jastr/workflow/templates/review-spec/TEMPLATE.md`:

```markdown
---
targets:
  agent-skill:
    frontmatter:
      name: review-spec
      description: Read a spec artifact and write a references-first review report …
      metadata:
        author: https://github.com/Jei-sKappa
        version: 1.0.0
---
# Review Spec

<the skill's unique body — its review axes, output-artifact rules, workflow …>

::include{root="group", path="partials/commit-policy.md"}
```

Generated with `"$JASTR_BIN" generate agent-skill workflow/review-spec --out
skills/workflow/review/review-spec/SKILL.md --mode=inline`, the emitted
`skills/workflow/review/review-spec/SKILL.md` is self-contained — frontmatter
(`name`, `description`, `metadata`) followed by the rendered body with the
`Commit Policy` partial inlined and no `jastr` reference or `include` directive
remaining.

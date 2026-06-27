# Decision log — remove auto/interactive skill variants (the seed)

Thread: docs/threads/260627133736Z-remove-skill-variants/
Target: the seed (seed/seed.md)
Subject: settling the open design questions for removing the paired `-auto` / `-interactive` workflow skill variants — replacing per-skill interactivity with a "run a discussion first / append a steering instruction" pattern — so the work can be handed to a junior dev as a spec.

## P1: Disposition of the interactive variant files

Point: When we drop the 14 interactive variants, do we delete them outright or retire them into the existing `deprecated/` bucket?

What you need to know: The repo already has a `deprecated/` bucket holding three genuinely-retired skills (`capture-inbox`, `discussion-loop`, `review-decision-document`), each still registered in `marketplace.json` under a `JeisKappa-deprecated` plugin — so "retire but keep on disk" is an established pattern. But those three were concepts that died. The interactive variants are different: they are being functionally replaced by `discussion → <bare skill>`, not abandoned. Moving 14 of them to `deprecated/` means 14 new marketplace entries and a bloated bucket for skills nobody is meant to install anymore; git history preserves them either way.

Decision: Option A — `git rm` the 14 interactive variant folders entirely. They are not retired concepts; they are a redundant delivery mechanism for interactivity that the generic `discussion` skill already provides. Git history keeps them recoverable.

Rationale: The `deprecated/` bucket holds dead concepts, not redundant delivery mechanisms; parking 14 redundant files reads as clutter, not preservation, and works against the leanness motivating the change. Deletion keeps the repo lean (the stated motivation) while git preserves recoverability.

## P2: Folder shape where a group collapses to a single skill

Point: Once the interactive twin is gone, the `propose` and `spec` groups each hold exactly one skill, and the natural rename produces a doubled path: `skills/workflow/propose/propose/SKILL.md` and `skills/workflow/spec/spec/SKILL.md`. Do we keep that nesting, or flatten it?

What you need to know: This only bites `propose` and `spec` — they are the two groups where the surviving skill's bare name equals its group name. `merge` is fine (`merge/merge-artifacts/` — names differ), and `plan`, `implement`, `review` still hold 3–6 skills each, so they stay nested regardless. Single-skill groups already exist and already nest: `documentation/take-snapshot/SKILL.md` and `support/meta-prompting/SKILL.md` — they just don't look doubled because the skill name differs from the group name. The marketplace model is "one plugin per group folder, each containing skill folders" (`JeisKappa-propose`, `JeisKappa-spec` are real group plugins today).

Decision: Option A — keep the group/skill nesting and accept the cosmetic doubling (`propose/propose/SKILL.md`, `spec/spec/SKILL.md`).

Rationale: The grammar explicitly allows `skills/<bucket>/[<group>/]<skill-name>/`, and the doubling is purely cosmetic — the group/skill pattern stays uniform with the existing single-skill groups (`documentation`, `support`). Flattening would buy nicer paths for two folders at the cost of a structural special case the marketplace, README, and Raycast sync would all have to handle, contradicting established precedent.

## P3: Where the "how to get interactivity back" guidance lives

Point: The replacement for the interactive variants is "run a `discussion` first, or append a steering instruction when you invoke the skill." Where do we document that — in each surviving skill body, or only in the index/model layer (README + `spine.md`)?

What you need to know: `AGENTS.md`'s self-containment rules forbid coupling one skill to another by explicit skill name, command, path, or invocation condition, and forbid "when to use this skill" sections in the body. A block in `propose`'s body saying "if you want this interactive, first invoke the discussion skill" is exactly that forbidden coupling. Natural-language awareness ("the user may have run a prior discussion whose decisions you should honor") is allowed, but is a different sentence. So the user-facing "to get interactivity, do X" instruction belongs in README (usage/index layer) and `spine.md` (workflow model), not replicated into 14 skill bodies.

Decision: Option A — document the pattern in README + `spine.md` only; keep it out of skill bodies. The bodies' only change is to stop prohibiting interactivity so an appended steering instruction is honored (settled separately in P4).

Rationale: It respects the self-containment rules the rest of the repo is built on, keeps the guidance in one authored place instead of 14, and matches where routing/usage guidance already lives. The skills only need to become receptive to steering (P4); they don't need to advertise it.

## P4: How deeply each surviving skill body/description is rewritten

Point: The surviving skills are the old `*-auto` ones, which brand themselves as explicitly non-interactive (`propose-auto`: "It does not ask clarifying questions, it does not interview the user point-by-point"; description: "without clarifying questions when the user already knows what they want… use `propose-interactive` for that"). How much do we rewrite?

What you need to know: Two parts move independently. (1) Descriptions must change regardless — they carry live cross-references to the now-deleted twin that would dangle, and their "use when" trigger is scoped to the autonomous subset; with the twin gone the description must route for any need of that skill, so the contrast framing comes out. (2) The body default is the real fork: today the body categorically says it does NOT ask clarifying questions, which creates tension against a runtime steering instruction saying "do."

Decision: Option B — surgical rewrite plus softening the default. Rename + retitle, rewrite descriptions (drop dead twin cross-refs and the contrast framing so routing is general), AND turn the categorical "does not ask clarifying questions" prohibition into a soft default that yields to steering ("works autonomously by default; if the invocation asks you to check in or work through it interactively, honor that"). No new sections, no sibling-skill names. Do NOT salvage the interactive-only sections (Anti-Sycophancy Stance, Scope Drift, element-by-element interview).

Rationale: A surgical-minimal pass leaves an absolute "does not ask questions" rule fighting the very steering mechanism being standardized on; B removes that friction with a one-line softening per skill. Salvage (C) is wrong because that content is exactly what `discussion` already provides (the basis for P1) — re-importing it would bloat 14 bodies and undercut the "interactivity lives in discussion" model.

## P5: How spine.md's autonomy-vs-interactive model gets reframed

Point: The `## Plan` passage in `docs/workflow/v2/spine.md` (lines ~89–95) states "Plan autonomy is V2's recommended default, not a law… Human-in-the-loop planning stays supported (`plan-*-interactive` is retained)." The principle survives, but the mechanism it cites (a retained interactive variant) no longer exists. How far does the reframe go?

What you need to know: The V2 docs reference the variants in exactly one place — that Plan passage, which names `plan-*-auto` and says `plan-*-interactive` "is retained." The `plan autonomy` concept appears elsewhere (e.g. `v2/README.md:34`) without variant names and survives. The dead references are local, but the variant removal is suite-wide, while spine.md only states the autonomy-is-a-default principle in the Plan section (where it is load-bearing: the machine adherence review clears a plan no human reads). P3 already designated spine.md as a home for the steering pattern.

Decision: Option B — localized fix plus one general principle statement. Rewrite the Plan passage (`plan-*-auto` → the plan skills; replace the retained-variant clause with "human-in-the-loop planning stays supported — run a discussion before planning, or steer the invocation to work through it interactively"), AND add one short sentence near the top of spine.md stating the suite-wide rule: every spine stage is autonomous by default but steerable, either by a prior discussion or an appended instruction.

Rationale: The change is suite-wide, so a reader deserves the pattern stated plainly in one place rather than inferred from a plan-section parenthetical. It is the natural fulfilment of P3's "spine.md documents the model" decision; the localized plan fix is mandatory regardless, and B only adds one honest general sentence.

## P6: Version-bump policy for the renamed skills

Point: Renaming `*-auto` → bare name changes each skill's installable identity (`npx skills add … --skill propose-auto` stops working; becomes `--skill propose`), and P4 also rewrites the description and softens the body. How do we version that?

What you need to know: `AGENTS.md` says bump version on any meaningful change to a skill's behavior; a rename is stronger — it breaks how the skill is installed/referenced, not just behavior. Current versions are mixed: most surviving skills at 2.0.0, the plan trio at 2.1.0, the implement trio at 2.2.0 / 2.2.1.

Decision: Option A — uniform major bump to 3.0.0 for all 14 surviving skills, carrying each lineage forward (same skill, renamed, breaking change).

Rationale: A rename that breaks the install command is the textbook case for a major bump; doing it uniformly to 3.0.0 keeps the suite legible ("everything that lost its variant suffix is now 3.x"). Carrying the lineage forward (vs. resetting to 1.0.0) preserves the real maturity history the 2.x versions represent.

## P7: Bound the rename so it never touches frozen records

Point: The variant names (`*-auto`, `*-interactive`) appear not just in live skill files and config but throughout `docs/threads/**` (frozen seeds, specs, plans, reviews, decision logs) and `docs/workflow/v1/**`. A naive implementer told to "remove the variants" might run a repo-wide find/replace and silently rewrite those.

What you need to know: Those are immutable frozen records under the workflow's own rules — historical artifacts are never edited, only superseded. Rewriting a variant name inside a closed thread's artifact corrupts audit history and is forbidden. The grep confirmed many `docs/threads/**` files mention the variant names; none are in scope.

Decision: Accept the proposed scope restriction. Edits are limited to exactly: the 14 surviving `SKILL.md` files (rename + body/description), the 14 interactive `SKILL.md` deletions, `README.md`, `.claude-plugin/marketplace.json`, `.vscode/settings.json`, `AGENTS.md` (Layout section), and `docs/workflow/v2/spine.md`. Editing anything under `docs/threads/**` or `docs/workflow/v1/**` is forbidden, and the Raycast `assets/skills.json` is regenerated (never hand-edited). No repo-wide blind find/replace.

Rationale: A blind find/replace is the obvious failure mode for this task and would corrupt immutable history; pinning the exact edit set and the no-touch zones in the spec prevents it and gives the junior dev an unambiguous boundary.

## P8: Resolve U1 — remove the stale "no interactive variant" sentence from review-lossless-mapping

Point: The spec surfaced U1 — `skills/workflow/review/review-lossless-mapping/SKILL.md` contains the sentence "Because the human-judgment step — disposing the findings, deciding whether a flagged item is acceptable — lands in a follow-on discussion, there is no interactive variant of this skill: an interactive mode would only re-implement that downstream discussion loop." That file was excluded from the P7 edit boundary. Do we leave it, reword it, or widen scope to fix it?

What you need to know: P7 bounded edits to the 14 surviving skills + 14 deletions + README + marketplace.json + settings.json + AGENTS.md Layout + spine.md, and excluded `review-lossless-mapping`. The sentence becomes factually stale once no skill has an interactive variant. Independently, it names the interactive-variant concept and embeds design rationale in a skill body, which the repo's self-containment rules disallow. The adjacent sentence ("This skill produces the findings; a separate discussion disposes them.") already preserves the useful point, so deletion leaves the paragraph coherent.

Decision: Remove the sentence entirely, and widen the P7 edit boundary to add `skills/workflow/review/review-lossless-mapping/SKILL.md` for this single-sentence deletion only. `review-lossless-mapping` is NOT one of the 14 renamed skills: it is not renamed and does not receive the 3.0.0 version bump (any version change is at most an editorial/patch bump per the repo's "meaningful behavior change" rule, since removing explanatory prose changes no behavior).

Rationale (user): The sentence should not have been there from the start — per the rule of not mentioning other skills / not embedding design rationale in the body, it was never a useful instruction for users of that skill. Removing all variants adds a second reason: there is no interactive variant to reference anyway. Deletion is the right fix, not a reword.

## P9: Where the implementation report lives vs. the spec's docs/threads boundary

Point: The implement stage must emit an implementation report into the active thread's `implementation/` folder, but the spec's AC-12.1 / P7 boundary ("no file under `docs/threads/**` is modified") forbade any write there, so the implementing run parked the report in its session scratchpad and surfaced the conflict. Where should the report live, and how is it reconciled with the already-approved spec?

What you need to know: P7/AC-12.1's intent was to protect frozen records in OTHER threads and to block a blind repo-wide find/replace — not to stop the implement stage's own additive report from landing in the ACTIVE thread. The report is a new record (a create, not a modification of any existing artifact) in the live thread; it corrupts nothing. The approved spec is the thread's historical contract and is not edited in place. The implementing agent correctly refused to override the approved spec silently and deferred the call to the owner.

Decision: Owner-authorized carve-out. The implementation report is written into `docs/threads/260627133736Z-remove-skill-variants/implementation/`, its correct home. The approved spec's AC-12.1 is acknowledged as over-broad and is NOT amended (it stays as the frozen contract); this decision records the authorized exception instead. The implementing run's "candidate seed" proposing an alternate report location / report-suppressed path is declined — the report's home is the active thread, no new mechanism is needed.

Rationale: The report is additive and in the active (non-frozen) thread, so it honors the intent of P7 even though it trips the literal AC-12.1 wording, which conflated "don't modify frozen records" with "don't write under `docs/threads/**` at all." Recording the carve-out rather than editing the approved spec keeps the contract immutable and the deviation auditable. Lesson for future scope-boundary specs: a "don't touch `docs/threads/**`" rule must explicitly carve out the active thread's own emitted artifacts (notably the implementation report).

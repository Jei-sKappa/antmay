# Audit the Antmay method's artifact model, using Leitspace as the reference case

## Context

Leitspace (this repository) is developed with **Antmay**, my own method for spec-driven, agent-assisted development. A local mirror of the method lives at `temp/mirrors/antmay/` (read its `README.md`, `docs/`, `AGENTS.md` and `suite/` to understand the artifact types it prescribes). In Leitspace the method shows up as:

- `docs/adr/` — the project's "current decisions", one file per record, `superseded/` for retired ones. Currently **46 ADRs**, and the project is only at entry 2 of its roadmap (`.work/roadmaps/2609190953-implementation-roadmap.md`).
- `docs/glossary.md` — project terms.
- `AGENTS.md` — project-specific rules, guidelines, and background information for agents, organised by module.
- `.work/threads/<yyyy>/<mm>/<dd-hhmm-slug>/` — one folder per unit of work: `seed.md`, `log.md`, `spec.md` (with Functional Requirements and Acceptance Criteria carrying FR/AC ids), `adr/` drafts, `glossary.md`, `plans/`, `implementations/`. Threads are declared *historical*: only the code, the project layer (`docs/`) and `AGENTS.md` are sources of truth.

Read the mirrored antmay repository to understand how the method describes itself, then read the ADRs, AGENTS.md and the existing threads under `.work/threads/2026/08/` (use `rg --hidden`; `.work/` is a dot-folder) to see how the method behaves in practice.

## The problem

I believe the method has a failure mode: it **mixes artifact kinds that should be distinct** — architecture decisions, rules/guidelines/background info in `AGENTS.md`, functional and non-functional requirements, rationales — and the ADR folder has become the dumping ground. Concrete symptoms I have observed:

1. **ADRs that are not decisions.** Example: `docs/adr/2608292038-the-html-screen-map-is-the-design-source-of-truth.md` is information for a reader, not a decision with alternatives and consequences. I consider it worthless as an ADR.
2. **ADRs that say "v1 is …".** Examples: `2608301305-v1-is-online-required-with-optimistic-grading-and-no-local-database.md`, `2608301301-v1-scope-is-…`, `2608240859-the-v1-social-layer-is-…`. My mental model is that a decision record describes what currently exists in the system, so "v1 is like this" should simply be "it is like this". Tell me whether I am missing something — a legitimate reason to scope a record to a version — or whether this is a symptom of ADRs being used as scope/requirements documents.
3. **Too many ADRs too early.** 46 records at roadmap entry 2 is a signal that things are being recorded as decisions that are actually requirements, design descriptions, conventions, or scope statements.
4. **FR/AC ids leak from specs into code.** Because `spec.md` carries Functional Requirements and Acceptance Criteria with ids, agents treat them as authoritative and write the ids into code comments, tests and commit messages — even though a spec is, by the method's own rules, a historical artifact that must never be cited outside its thread.
5. **`AGENTS.md` is carrying rules, guidelines, and pure information side by side**, with no distinction between "MUST", "prefer", and "here is how this works".

## What I want from you

Act as a senior engineer / architect from a large team that runs agent-driven development on real codebases. Do **not** fix anything in Leitspace or Antmay yet. Produce an analysis and a set of proposals that I can turn into an issue/thread on the Antmay repository, so the method gets fixed before Leitspace work continues.

1. **Diagnose.** Go through the 46 ADRs and classify each one: genuine architecture decision, product/scope requirement, design description or fact, convention/guideline, or something else. Do the same for a sample of `AGENTS.md` and for one or two `spec.md` files. Quantify the mix. Identify which artifacts carry what today and where the boundaries blur.
2. **Explain the root cause** in the method itself — which prescriptions in Antmay push agents toward producing these artifacts — rather than blaming individual records.
3. **Propose an artifact model.** Present options (with trade-offs, and a recommendation) for how to organise: architecture decisions, product/scope decisions, requirements (functional and non-functional), rationales, conventions/rules for agents, informational/background docs, and glossary terms. Consider both established practice (Nygard-style ADRs, RFC/design docs, C4 or architecture overviews, `CONTRIBUTING`/engineering handbooks, PRDs, living requirements docs, decision logs vs. decision records, Diátaxis-style separation of doc types) and the specific needs of agent consumers: what an agent should read before acting, what it must never cite, and how to make the difference mechanically obvious. Propose new artifact types where existing ones do not fit, and say which existing Antmay artifacts should be dropped or merged.
4. **Address each symptom explicitly:** what qualifies as an ADR (a bar with a checklist), how to handle version-scoped statements, how to keep specs and their FR/AC ids from leaking into code (or whether FR/AC belong in specs at all, and where they should live if not), how to split `AGENTS.md` into rules vs. guidelines vs. information, and how to keep ADR volume proportionate to the project's maturity.
5. **Sketch the migration for Leitspace** as a worked example: which ADRs stay, which get demoted/merged/deleted and into what artifact, what `AGENTS.md` becomes, and what `.work/threads/` artifacts change shape.
6. **Draft the Antmay issue.** End with a concise issue text (title, problem statement, evidence from Leitspace, proposed changes) ready to be opened on the Antmay repository.

Be direct and opinionated: I want a recommendation, not a neutral survey. Where you disagree with one of my premises, say so and explain why.

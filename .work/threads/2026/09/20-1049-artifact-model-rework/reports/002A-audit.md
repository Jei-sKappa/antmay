Antmay has the failure mode you describe, but I would diagnose it more narrowly: **it lacks a durable home for requirements and current system contracts, so “worth preserving” becomes “must be an ADR.”** Tightening ADR prose alone will not fix that.

I recommend adding living product contracts, separating those from architectural rationale, and making thread specs describe changes to the project’s maintained documents. `AGENTS.md` should become a short instruction entry point with scoped rules and links.

I audited all 46 current ADRs, the five August threads, two specs in detail, Leitspace’s `AGENTS.md`, and the mirrored Antmay prescriptions. No files were changed. Historical thread references below are evidence about the method’s behavior, not sources of current product requirements.

**What the evidence supports—and where I disagree**

Your strongest argument is that agents need to distinguish what must remain true, why something was chosen, what currently exists, and what one change intended to deliver. Antmay gives those distinctions insufficient structural support.

Four qualifications matter:

1. **An ADR is not a description of what currently exists.** It records an architectural choice and its rationale. An accepted choice can precede implementation. Nygard explicitly distinguishes proposed, accepted, and superseded decisions and describes using ADRs for future architectural intentions. Current implementation belongs in architecture documentation. [Nygard’s original article](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)

2. **The HTML-source record is a decision, but a poor architectural record.** It selects an authority when two design sources disagree and explains why. That is useful governance information. I agree it does not deserve a standalone architecture ADR; I disagree that its content is worthless.

3. **46 is not itself evidence of excess.** These records cover product foundation, the design system, backend schema, and authentication—not merely two small features. The better evidence is their subject mix, fragmentation, unresolved applicability, and duplicated authority.

4. **The leakage is real, but much of it has already been removed.** Commit `0f88d44` removed thread-local requirements, criteria, and task citations across 50 files. Current searches found no FR/AC identifiers in the four module trees searched. Git history retains examples, and two current comments still link to historical thread artifacts: [layout_sweep.dart](/Users/jacopo/Developer/projects/personal/apps/Leitspace/widgetbook/test/layout_sweep.dart:1) and [leit_icons.dart](/Users/jacopo/Developer/projects/personal/apps/Leitspace/packages/leitspace_ui/lib/src/icons/leit_icons.dart:220).

There is also a timing qualification: three August thread logs explicitly record migration from an older format on September 19. Today’s ADR bodies were recently tightened too. The current mirror explains remaining structural pressures; it cannot establish exactly which older instruction produced every August artifact.

**The 46-record classification**

I classified each record by its *primary purpose*. Many contain secondary material of another kind. “Architecture” here includes consequential domain modeling, persistence, security boundaries, and execution ownership—not just infrastructure choices.

| Primary purpose | Records | Share |
|---|---:|---:|
| Architectural decision | 27 | 58.7% |
| Product behavior, policy, or release scope | 15 | 32.6% |
| Convention or guideline | 3 | 6.5% |
| Product metric definition | 1 | 2.2% |
| Pure implementation description or fact | 0 | 0% |

Thus **19/46 are primarily something other than architectural decisions**. That does not mean those 19 are unnecessary information.

The following table also provides the migration disposition. Timestamps uniquely identify the existing records; titles are shortened for readability. “Fold” means preserve the choice and rationale in the named maintained document, while retaining the original as historical evidence.

| Record | Subject | Classification | Proposed disposition |
|---|---|---|---|
| `2608240842` | Revealed and hidden presentations are peers | Product principle | Product contract: learning experience; retain rationale |
| `2608240843` | Three learning surfaces; finite review in Library | Product/interaction decision | Product contract: navigation and learning |
| `2608240844` | Knowledge model and review schedule are separate | Architecture | Keep ADR; extract detailed behavior into learning contract |
| `2608240845` | Wrong answers invite explicit saving | Product behavior | Product contract: saving |
| `2608240846` | Explore is search, not another feed | Product/interaction decision | Merge into navigation/discovery contract |
| `2608240847` | Media vocabulary independent of launch sourcing | Architecture, mixed with release scope | Keep media-model choice; move sourcing restrictions to launch brief |
| `2608240848` | Defer moderation; preserve provenance | Product scope/risk, mixed with architecture | Launch brief and risk section; provenance contract alongside content ownership |
| `2608240849` | Binary self-review; exclude multiple choice | Product strategy | Product decision record linked to answering requirements |
| `2608240850` | Declared, visible, editable interests | Product policy | Product contract: interests and recommendation |
| `2608240851` | One recursive, curated Topic vocabulary | Architecture/domain model | Keep ADR; move full selection/rollup behavior into contracts |
| `2608240852` | Impression-normalized ranking and exploration budget | Product/ranking policy | Ranking contract, with quality criteria and rationale |
| `2608240853` | Live cards use fields, not a dedicated type | Architecture | Keep representation choice; separate deferred runtime requirements |
| `2608240854` | Sets own authorship; cards own consumption | Architecture/domain ownership | Keep ADR |
| `2608240855` | Schedulability and passive viability are separate | Architecture/domain model | Keep ADR; glossary only defines the terms |
| `2608240856` | Stable identity; author-classified invalidation | Architecture, mixed with product behavior | Keep identity choice; move invalidation behavior and open transition to contracts |
| `2608240857` | Publishing tools use the ordinary creation API | Architecture | Keep ADR; mark implementation as planned elsewhere |
| `2608240858` | Ordinary accounts and capability flags | Architecture/authorization | Keep ADR |
| `2608240859` | Creator-oriented social layer; private learning data | Product scope/privacy policy | Product decision record; split release scope from enduring privacy requirements |
| `2608240900` | Ordinary deletion tombstones content | Architecture/persistence | Keep ADR; put observable deletion behavior in content contract |
| `2608240901` | Anonymized profile shell preserves authorship | Architecture, mixed with product/legal dependencies | Keep shell choice; move retention choices and unresolved prerequisites into account contract |
| `2608240902` | Purge is distinct from ordinary deletion | Architecture/lifecycle | Keep ADR; distinguish prerequisites from unimplemented operation |
| `2608240903` | Saved-card answers grade identically across surfaces | Product invariant | Learning contract, with rationale and executable examples |
| `2608292038` | HTML is authoritative over the React kit | Documentation/design governance | Design-source README and agent routing rule |
| `2608301301` | Full designed surface, closed alpha, authoring | Release scope | Closed-alpha brief |
| `2608301302` | Postgres-first; scheduler math in Dart | Architecture | Keep ADR |
| `2608301303` | Official FSRS package and grade mapping | Architecture/algorithm dependency | Keep ADR; answering contract owns user-facing grading |
| `2608301304` | BLoC-centric, risk-based testing | Engineering guideline | Engineering testing guide; distinguish obligations from preferences |
| `2608301305` | Online-required; optimistic grading | Architecture, mixed with UX requirements | Keep connectivity/persistence choice; grading failure behavior goes into learning contract |
| `2608301426` | Single answer field; no speculative typed-answer fields | Architectural schema refinement | Fold into content-model reference, preserving the deferral rationale |
| `2608301427` | Knowledge counters; “learned” from introduced rows | Architectural refinement, mixed with metric definition | Fold into learning-model reference; product contract defines “learned” |
| `2608301428` | Aggregate signals without raw telemetry | Architecture/data retention | Keep ADR |
| `2608301429` | Store necessary pipeline metadata | Architectural schema refinement | Fold into content-model reference, retaining the reconstructibility rationale |
| `2608301430` | Tombstone plus private/public visibility; no draft | Architectural schema refinement | Fold into content-model reference; authoring contract owns the absence of a draft workflow |
| `2608301431` | Library rows are the sole save state | Architecture/persistence | Keep ADR; saving contract defines the operations |
| `2608301432` | Visitor shelf through a definer aggregate | Architecture, with unresolved governing conflict | Retain as an unresolved proposal until the privilege-budget conflict is settled |
| `2608301433` | Separate profile fields from owner-only preferences | Architecture/security boundary | Keep ADR; express the placement rule in backend guidance |
| `2608301434` | Privatization retroactively hides library rows | Product privacy policy, mixed with architecture | Privacy contract; technical enforcement explained in architecture reference |
| `2608301435` | No second durable schedule outside the library | Architectural refinement | Fold into learning-model reference alongside the sole-save-state choice |
| `2608301436` | Deleted profiles have no handle or route; retire handles | Product identity/privacy policy | Account lifecycle contract, preserving alternatives and rationale |
| `2608301437` | Learner count means distinct holders | Product metric definition | Product contract: metrics; brief glossary definition |
| `2608301438` | Deletion preserves the private-profile flag | Product privacy invariant | Account lifecycle contract; retain the unresolved future disposition explicitly |
| `2608301439` | Codes rather than links for auth entry | Architecture/auth integration, mixed with UX | Keep ADR; account contract owns the visible flows |
| `2608301440` | Defer federated sign-in; show notice | Release scope/temporary UX | Release brief and account contract; track the handle-step dependency |
| `2608301441` | Select environments through entrypoints | Architecture/configuration strategy | Keep ADR; operating instructions belong in development guide |
| `2608301442` | Outcome owner interprets particular rejections as success | Architecture/error ownership | Keep ADR; concrete outcomes belong in account contracts |
| `2608301443` | Inline errors, otherwise toast by default | UX convention | Design-system error guidance, with explicitly permitted exceptions |

The classification is deliberately generous to domain architecture. Calling `2608301433` merely a convention would miss its security-boundary reasoning. Conversely, implementing a requirement through RLS does not automatically turn the product policy itself into an architectural decision.

The five proposed folds are real technical choices, but relatively small refinements of an already documented model. They do not all need independent permanent records. That is a significance judgment, separate from classifying their content.

Under this proposal, **21 of the existing records remain active architecture ADRs, one becomes an unresolved architectural proposal, and five technical refinements move into maintained references**. This is a worked result, not a target quota.

The unresolved proposal is particularly revealing: [the shelf ADR](/Users/jacopo/Developer/projects/personal/apps/Leitspace/docs/adr/2608301432-the-profile-shelf-is-a-definer-gated-aggregate-over-library-rows.md:10) explicitly requires a third client-executable definer while the governing budget permits two. The prose acknowledges the conflict; the artifact’s location still presents it as a current binding decision.

**What `AGENTS.md` and the specs contain**

Leitspace’s `AGENTS.md` is 523 lines. Its mixed content is not inherently wrong—brief explanation beside a rule is useful—but its normative force often has to be inferred.

Here is a purposive 12-item sample, not an estimate of the entire file’s percentages:

| Passage | Actual kind | Appropriate home |
|---|---|---|
| Modules communicate only through explicit contracts | Mandatory architectural rule | Engineering rules |
| Always prefix Flutter commands with `fvm` | Mandatory operating rule | Agent instructions/development guide |
| Do not create a shared domain package for UI | Mandatory architectural constraint | Engineering rules, linked to rationale |
| Every changed UI state needs a Widgetbook case | Mandatory verification rule | UI engineering rules |
| Avoid premature optimization | Guideline | Engineering principles |
| DRY | Guideline | Engineering principles |
| YAGNI | Guideline | Engineering principles |
| Flutter uses a Dart pub workspace | Implementation fact | Repository/architecture overview |
| `restartable()` cancels the emitter, not the awaited work | Dependency behavior | Focused technical explanation |
| Schema-level default-privilege revoke was observed ineffective | Version-specific technical fact | Backend reference with evidence/version context |
| Catalog placement follows from layer import constraints | Architectural rationale | Architecture explanation/decision |
| GUC fixtures are used because role switching prevents access to the temp table | Rationale for a test convention | Backend testing guide |

This sample contains **four rules, three guidelines, three facts, and two rationales**. The distinction is about those selected assertions, not their enclosing paragraphs.

The file also contains major architecture choices—ViewData boundaries and package-local copy ownership—that are at least as architecturally significant as several retained ADRs. Placement therefore appears to depend partly on *which operation recorded the information*, rather than on its semantic kind.

For specs, I classified the FR groups by primary purpose:

| Spec | Size | What its FR groups actually represent |
|---|---:|---|
| [Design-system/Widgetbook spec](/Users/jacopo/Developer/projects/personal/apps/Leitspace/.work/threads/2026/08/29-2038-design-implementation-widgetbook/spec.md:45) | 5 FR groups; 13 AC entries | 2 component/screen deliverables; 1 visual/token contract; 1 tooling deliverable; 1 architecture boundary |
| [App-shell/auth spec](/Users/jacopo/Developer/projects/personal/apps/Leitspace/.work/threads/2026/08/30-1426-02-app-shell-auth/spec.md:201) | 15 FR groups; 68 AC entries | 6 user-facing functional groups; 3 architecture/integration groups; 3 quality/design-policy groups; 3 engineering/process/documentation groups |

For the auth spec, the group assignments are:

- Functional: FR-6 through FR-11.
- Architecture/integration: FR-1, FR-2, FR-5.
- Quality/design policy: FR-3, FR-4, FR-15.
- Engineering/process/documentation: FR-12, FR-13, FR-14.

These are group counts, not claims that every criterion within a group has the same kind.

The problem is visible in **“FR-14 — Living documents.”** Updating `AGENTS.md` is a change-completion obligation, not a functional requirement of Leitspace. The same umbrella also covers dependency choices, folder placement, visual design, runtime behavior, and manually checked integration scenarios.

Nor does an AC identifier make a criterion machine-checkable. The auth spec includes manual walkthroughs and code-review judgments. Those are legitimate verification methods; labeling all of them “machine-checkable” obscures what was actually proven.

Across the four August specs that enumerate criteria, there are **47 FR groups and 241 AC entries**. The roadmap spec enumerates neither. Those numbers count document entries, not unique requirements: much of the same intent is repeated at multiple levels.

The historical status is substantive. The auth spec still describes the older multi-arm exception handling and says missing translations fail generation; current `AGENTS.md` specifies a total delegating catch and explains compilation failure instead. An agent that treats the historical spec as current would reintroduce superseded implementation guidance.

**Why the method produces this**

The central defect is in Antmay’s [binding test](/Users/jacopo/Developer/projects/personal/apps/Leitspace/temp/mirrors/antmay/suite/skills/capture-discussion/discussion/SKILL.md:68):

> A settled point passes the binding test when a later thread could build against it incorrectly if not told, and could not read it off the code. Such a point becomes an ADR.

That tests whether information deserves to survive. It does not test whether it is an architectural decision.

A privacy requirement, release exclusion, operational restriction, product metric, and design-source precedence rule all pass. Before implementation, almost every settled product behavior passes: there is no code from which to read it.

Several other prescriptions amplify this:

| Prescription | Pressure it creates |
|---|---|
| Project decisions are authoritative under `docs/adr/` | Anything binding needs admission to the ADR folder |
| Thread history must not govern later threads | Requirements cannot safely remain only in the spec |
| `close-thread` formally lands ADRs and glossary terms | Requirements and policies lack an equivalent typed promotion path |
| Implementation discoveries become proposed ADRs or roadmap entries | A newly discovered durable contract is routed toward the same two destinations |
| Every designed behavior receives FR/AC traceability | Local change criteria acquire the appearance of permanent requirements |
| Implementation progress facts also enter commit bodies | Task and spec vocabulary propagates directly into Git history |
| `AGENTS.md` preserves significant changes, mistakes, and new rules | Facts, lessons, policies, and rationale accumulate under one instruction surface |

These are explicit in [close-thread](/Users/jacopo/Developer/projects/personal/apps/Leitspace/temp/mirrors/antmay/suite/skills/close/close-thread/SKILL.md:62), [spec](/Users/jacopo/Developer/projects/personal/apps/Leitspace/temp/mirrors/antmay/suite/skills/spec/spec/SKILL.md:46), [implementation discoveries](/Users/jacopo/Developer/projects/personal/apps/Leitspace/temp/mirrors/antmay/suite/skills/implement/implement-plan/SKILL.md:138), and [Antmay’s own agent-memory rule](/Users/jacopo/Developer/projects/personal/apps/Leitspace/temp/mirrors/antmay/AGENTS.md:5).

There are also direct inconsistencies:

- Antmay’s maintainer documentation forbids citing thread-local specs outside their thread, while the shipped spec skill explicitly describes how to format cross-thread references.
- The implementation skill places the task’s progress block in commit bodies, including its task identity and deviations.
- The [ADR format](/Users/jacopo/Developer/projects/personal/apps/Leitspace/temp/mirrors/antmay/suite/shared/references/formats/adr.md:20) uses location to encode “current” but provides no machine-readable distinction between a selected direction, an implemented design, and an unresolved conditional choice.
- A draft becomes authoritative when written. The discussion skill’s confirmation requirement mitigates this, but the artifact itself does not carry the acceptance evidence.

Antmay does recognize living documentation, and implementations may update it. The gap is that living requirements and contracts have **no prescribed ownership, discovery, lifecycle, or completeness check** comparable to ADRs and glossary terms.

Its [three documentation kinds](/Users/jacopo/Developer/projects/personal/apps/Leitspace/temp/mirrors/antmay/docs/documentation-rules.md:6) do not solve this. “Shipped content,” “README,” and “maintainer documentation” classify audiences and distribution. They do not classify authority or purpose.

Finally, Leitspace adds a separate volume amplifier: the foundation spec required deferred features to become available later without schema changes. That pushes future design decisions into the earliest work. It is a Leitspace planning choice, not a general Antmay prescription, but Antmay’s artifact model turns its consequences into permanent ADR obligations.

**The artifact model I recommend**

Three options are plausible:

| Option | Benefit | Main cost | Verdict |
|---|---|---|---|
| Keep the current structure; rename ADRs to generic “decision records” and add categories | Small migration; honest naming | Requirements still have no coherent current home; record-by-record reading remains necessary | Insufficient |
| Add living contracts, focused decision records, and scoped engineering guidance | Clear ownership and agent retrieval; moderate overhead | Requires explicit change/promotion rules | **Recommended** |
| Build a formal requirements registry with complete bidirectional traceability | Strong auditability across many releases and teams | IDs, schemas, coverage mappings, and maintenance become a product themselves | Optional for projects that need it |

The recommended structure would look roughly like this. These are roles and suggested locations; Antmay should allow projects to map them onto existing documentation.

| Artifact | Owns | Lifecycle and authority |
|---|---|---|
| `docs/product/<capability>.md` | Accepted behavior, business rules, functional requirements, quality requirements, examples | Living normative contract; explicitly distinguishes planned and implemented behavior |
| `docs/product/releases/<release>.md` | Cohort, release scope, exclusions, prerequisites, exit conditions | Applies only to the named release/cohort; later retained as release history |
| `docs/architecture/overview.md` and focused references | Current system structure, boundaries, data flows, implementation explanations | Maintained description of the implemented system |
| `docs/adr/` | Significant architectural choices and their rationale | Proposed → accepted → superseded/retired; accepted does not imply implemented |
| `docs/product/decisions/`, created only when needed | Significant product trade-offs whose reasoning merits an independent record | Same decision lifecycle; ordinary choices keep a short rationale beside the contract |
| Engineering handbook/module guides | Mandatory engineering rules, defaults, procedures | Living, scoped guidance; each normative statement has an explicit strength |
| `AGENTS.md` | Instruction entry point, immediate constraints, reading routes | Short, operational, scoped |
| Design-source documentation | Authoritative assets, visual specifications, design conventions | Maintained design baseline with explicit ownership |
| `docs/glossary.md` | Terms and concise meanings | Living naming authority; links to full contracts |
| Thread `spec.md` | Proposed change to those maintained artifacts and its acceptance evidence | Authoritative change intent for that active thread; historical after completion |

The product contract is the missing artifact. It can be ordinary Markdown. It should answer: **What must this capability do, under which conditions, and which parts are actually delivered?**

For example, saving should have one maintained document that defines card saving, set saving, existing-progress preservation, future additions, and unsaving. A reader should not reconstruct that behavior from six ADRs and an old acceptance table.

Use established practices selectively:

- Nygard-style ADRs supply focused decision context and consequences.
- RFC/design-doc structure is appropriate for a substantial proposal before acceptance. Rust’s template usefully separates explanation, rationale, drawbacks, and unresolved questions. Antmay’s thread spec can perform this role; a mandatory second RFC would duplicate it. [Rust RFC template](https://github.com/rust-lang/rfcs/blob/master/0000-template.md)
- A small C4-style architecture overview provides orientation before detailed records. Context and container diagrams are often sufficient; the model itself discourages unnecessary levels. [C4 guidance](https://c4model.com/diagrams)
- PRD-style documents suit product goals and scope, but release planning should not become the sole repository of lasting behavior. [Atlassian’s PRD guidance](https://www.atlassian.com/agile/product-management/requirements)
- Diátaxis helps separate reference, explanation, and operating instructions. It does not provide an acceptance or authority model; Antmay must add that itself. [Diátaxis](https://diataxis.fr/)

Do not create a separate rationale repository. A rationale belongs beside the rule it explains unless its significance earns a decision record. Likewise, a decision log is a searchable summary of decisions; it is not a replacement for their context or for living requirements.

**The ADR admission bar**

Replace the binding test with two questions:

1. Does this information need a maintained home beyond the thread?
2. If yes, which artifact owns it—and does the choice additionally warrant a decision record?

An ADR should pass this checklist:

- There is a concrete architectural question.
- A meaningful choice was made, rather than a fact observed or a requirement repeated.
- The choice affects structure, interfaces, data ownership, persistence, trust boundaries, important quality characteristics, or consequential construction techniques.
- The context explains why the choice matters now.
- Real alternatives are recorded, including deferral or the status quo where relevant. Do not invent alternatives to fill a template.
- Consequences include costs, constraints, or risks.
- The record covers one independently understandable significant choice.
- Scope, acceptance state, and any conditions are explicit.
- A future maintainer would need the reasoning to avoid a costly or misleading reversal.
- Detailed behavior has a contract home; the ADR is not its only specification.

Architecturally significant requirements can motivate ADRs, but “the user’s learning history is private” and “we enforce that through these ownership boundaries” are different statements. Requirements are common inputs to architectural decisions. [AWS ADR guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html)

Passing the significance bar should not require a long document. A concise record can satisfy all of it.

**Version scope, identifiers, agent rules, and volume**

Version scope is legitimate when it defines applicability: an API generation, compatibility mode, supported deployment, alpha cohort, or deliberately temporary architecture. Removing it can accidentally make a conditional commitment universal.

For Leitspace:

- `2608301301` is plainly a release brief.
- `2608240859` mixes release scope with an enduring privacy policy. Split them.
- `2608301305` is a genuine architecture decision whose context is the alpha’s budget. Its current title and decision already say “The app is online-required”; `v1` survives in its stable filename.

Prefer present-tense decision text plus explicit applicability and a revisit trigger: “Reassess before public distribution,” for example. A trigger prompts review; it does not silently expire the decision. Do not rename historical identifiers merely to remove old wording.

For FR/AC leakage, **remove mandatory FR/AC numbering from thread specs**. Keep acceptance checks, but distinguish:

- Product behavior and quality requirements.
- Architectural constraints.
- Change-completion obligations.
- Verification method and evidence.

When persistent requirement identities are useful, assign them in the living contract: for example, `REQ-auth-email-verification`. Do not reuse thread-local `FR-1` as a global identifier. Small projects can use stable anchors instead.

Thread-local check IDs can remain optional for large change reviews. Their scope must be explicit. The implementation report can map those checks to behavior-named tests; the tests should not depend on the thread to explain their purpose.

The citation policy should also distinguish **authority from provenance**:

| Consumer | Appropriate references | Inappropriate authority |
|---|---|---|
| Production comments and test names | Self-contained behavior; exceptional links to durable contracts or decisions | Bare FR/AC/task numbers; historical thread instructions |
| Active thread spec/plan/report | Project contracts, accepted decisions, its own local checks | Another thread’s spec treated as current requirements |
| Commit or PR description | Self-contained change explanation; optional historical provenance | A local ID used instead of explaining the change |
| Audit or investigation | Historical artifacts explicitly identified as evidence | Historical text silently promoted into current policy |

I would relax the absolute ban on historical references in commits. A commit is historical too, and a fully qualified link can be useful provenance. The stronger rule is that neither the message nor the code requires that link to understand the change. Existing history should not be rewritten to remove references.

For `AGENTS.md`, retain a small repository map, governing-document routes, immediate prohibitions, and required checks. Move detailed module material into scoped guides.

Within those guides, distinguish:

- **Rule:** mandatory; violation is a defect unless an authorized exception applies.
- **Guideline:** default recommendation; justified departures are allowed.
- **Reference:** descriptive information; cannot independently introduce an obligation.
- **Rationale:** explains a rule or decision; is not an additional hidden rule.

A rule should state the obligation first and may carry a brief “because.” Separating every explanatory sentence into another file would make instructions harder to use.

For ADR volume, do not impose a numerical cap. Instead:

- Make zero new ADRs a normal result of completing a thread.
- Review records for significance and overlapping ownership before accepting them.
- Group coupled choices; keep independently reversible choices separate.
- Defer detail that has no present consumer or irreversible consequence.
- Retrieve by scope, not by requiring agents to read the whole decision history.
- Measure unresolved conflicts, duplicated requirements, stale current-state claims, and reading burden—not records per roadmap entry.

**Make the distinction mechanically visible**

Folders alone are insufficient. Antmay already puts authoritative roadmaps under `.work/`, beside historical threads.

Add minimal artifact metadata, supported by discovery and validation:

- Artifact kind.
- Subject/module scope.
- Lifecycle state.
- Applicability where conditional.
- Explicit replacement relationships where relevant.

Separate acceptance from delivery. A product requirement can be accepted and planned; an architecture overview should describe implementation. An accepted ADR must not be interpreted as proof that its design exists.

A small project-context catalog should route an agent to relevant contracts, engineering rules, and decisions. It can be generated from metadata. It should not duplicate their substantive content.

An agent’s reading order should be:

1. Repository instructions and scope routing.
2. Relevant product contracts and engineering rules.
3. Architecture overview and applicable accepted ADRs.
4. Relevant glossary terms.
5. The active thread’s approved change intent.
6. Historical material only when the task needs investigation.

The conflict rule needs more precision than “source of truth wins.” **Code establishes observed behavior; requirements establish intended behavior.** A disagreement can mean a bug, outdated documentation, or an authorized change. The agent must identify which, rather than automatically treating the code or the prose as correct.

Mechanical checks should cover:

- Invalid artifact kinds and missing lifecycle metadata.
- Broken durable references and invalid supersession links.
- Thread-local identifiers or paths introduced into production comments and test descriptions.
- Normative references to historical or merely proposed artifacts.
- Missing declared project-document updates at change completion.
- Unresolved changes to a contract modified since the thread began.

These checks catch structural mistakes. They cannot prove that an ADR is significant or that a requirement is correct; review still owns those judgments.

**The Leitspace migration**

Use the 46-row table as the disposition list, with preservation rather than deletion as the default.

First create a small set of maintained product contracts covering learning/saving, discovery/interests, content lifecycle, accounts/privacy, and metrics. Add a closed-alpha release brief. Populate them from current decisions and verified implementation evidence. Historical specs can expose omissions, but their old claims must be adjudicated rather than copied wholesale.

Then separate current structure from rationale:

- Architecture overview: Flutter application, UI package, Widgetbook, Supabase, boundaries, and data ownership.
- Focused references: content model, learning model, authorization, auth/bootstrap.
- Retained ADRs: the significant choices listed above.
- Product decision records: initially the binary-answering choice and the social/privacy direction, where the reasoning deserves independent retention.

The proposed count of 21 retained architecture ADRs concerns the existing portfolio. Applying the same bar to significant architecture currently buried in `AGENTS.md` may identify an additional record worth writing; avoiding that just to preserve a lower count would defeat the audit.

For reclassified records, preserve the original text and stable identifier with an explicit disposition pointing to its new owner. Do not call something “superseded” if only its document category changed. The method needs a reclassification/archive mechanism. Delete redundant text from active documents only after its meaning, rationale, and references have a verified destination.

`AGENTS.md` then becomes the routing surface described above. The generic `FLUTTER.md` remains generic. The backend privilege rules and verification obligations remain mandatory; relocating them must not weaken them.

Finally, change the thread lifecycle:

| Existing artifact | Proposed shape |
|---|---|
| `seed.md` | Keep: origin and intended change |
| `log.md` | Keep: local discussion and events; no permanent requirements authority |
| `spec.md` | Change specification/RFC: baseline, intended delta, constraints, acceptance checks, freedoms, assumptions |
| Thread `adr/` and glossary delta | Generalize to typed project-document changes, with explicit destinations |
| `plans/` | Optional execution decomposition; avoid restating whole contracts |
| `implementations/.../report.md` | Verification evidence, deviations, unresolved work, and confirmation of maintained-document updates |
| Design discrepancy notes | Historical comparison evidence; lasting visual rules also update the maintained design baseline |

I would implement the generalized document delta through ordinary branch edits to canonical documents plus a small target list. If Antmay retains staged copies, it needs explicit destinations and baseline checks; it must not create two competing authoritative versions.

At completion, review code and maintained documentation together. `close-thread` should verify that all lasting requirements, rules, and explanations have landed—not merely that ADR and glossary categories were processed.

Do not rewrite completed August specs to look as though they used the new method. Mark their historical role, preserve them, and apply the new shape to subsequent work.

The recommended issue follows.

---

**Title:** `[suite] [improvement] Separate living project contracts from decision records and thread history`

**Problem**

Antmay routes durable information into ADRs using a persistence test: if later work could violate a settled point and cannot infer it from code, it becomes an ADR. This conflates architectural choices with product requirements, release scope, conventions, and definitions.

The method preserves ADRs and glossary terms at thread close but provides no equivalent lifecycle for living requirements and system contracts. Thread-local FR/AC traceability consequently becomes a substitute for permanent requirements ownership.

**Evidence from Leitspace**

An audit of its 46 current ADRs classified 27 as primarily architectural, 15 as product behavior/scope, three as conventions, and one as a metric definition.

Examples include design-source precedence, closed-alpha scope, a testing guideline, and learner-count semantics. One current ADR selects a future definer RPC while acknowledging an unresolved conflict with the project’s privilege budget.

Two sampled specs contain 20 FR groups and 81 AC entries, mixing functional behavior with architecture, tooling, and documentation obligations. A September 19 cleanup removed thread-local citations across 50 files.

The August artifacts predate the current thread format; nevertheless, the current suite retains the broad ADR admission rule and conflicting citation/export instructions.

**Proposed changes**

- Add living product contracts for functional requirements, quality requirements, and business rules; separate release scope.
- Restrict ADRs to significant architectural choices; support product decision records selectively.
- Make thread specs describe changes to maintained contracts, with acceptance checks but no mandatory FR/AC numbering.
- Separate acceptance, applicability, and implementation state.
- Make `AGENTS.md` an instruction entry point; distinguish mandatory rules, guidelines, and reference material.
- Generalize thread completion to verify all required maintained-document updates.
- Ship consistent retrieval and citation rules, backed by structural checks.
- Preserve reclassified records and historical identifiers during migration.

**Completion criteria**

Publish the artifact model and examples, update affected suite skills and shared formats, validate the citation rules mechanically, and demonstrate the migration using Leitspace’s classified portfolio. Record CLI compatibility implications for its separate realignment work.

**Suggested effort:** `effort: 4`.

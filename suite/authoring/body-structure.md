# Body structure

A `SKILL.md` body is loaded whole on every invocation. What it holds, in what
order, and what it hands off to a reference is therefore the main lever on how
well the skill executes.

## Fixed section headings

Two headings are fixed by name.

**`## Inputs`.** A skill whose procedure works from gathered state carries a
section headed exactly `## Inputs`, listing what it gathers as a list rather than
as prose. Each item is a path or a source with one clause saying what it is for
and whether it is authoritative or material. The list opens with the same two
items in every skill that has it:

1. `/consult-adrs` — the project decisions relevant to the target. Authoritative.
2. `/consult-glossary` — the project's fixed terms. Authoritative.

The thread files the skill reads follow. A skill with one primary input names it
and its accepted forms in the same section, so a reader learns there what the
skill works from. The procedure then starts from the gathered state and repeats
no read. A skill that gathers nothing carries no such section, and neither does a
model-invoked skill whose whole body is the act of consulting one source: its
reading is the procedure, so there is no gathered state for a section to
declare.

**`## Procedure`.** A skill with an end-to-end execution sequence carries it
under a single heading, `## Procedure`. This is a naming rule and not a presence
mandate: an all-reference skill whose behaviour is fully carried by its format
and guideline sections carries no procedure section at all rather than a ritual
read-draft-output sequence. `## Workflow` is never used as a section heading, so
that cross-references and greps for the procedure stay unambiguous. Headings that
belong to an emitted artifact — the `**Steps:**` field inside a plan task brief,
say — are part of that artifact's format and are untouched by this rule.

## The three-part body

A body holds exactly three kinds of content:

1. **Immediate content** — the instructions and information the agent needs at
   invocation, written inline.
2. **Conditional pointers** — when situation X holds, read file A; when Y, read
   file B — so the agent reads only what its situation requires.
3. **Step-based pointers** — content every run needs, but only once it reaches a
   given step, so the body says at that step to read the file then. The
   instructions for writing the implementation report, for instance, are read
   when the run finishes rather than at invocation.

Timing decides between them, not size: content consumed at one identifiable step
sits behind a pointer at that step however large it is, unless it is short enough
that the pointer would cost as much as the content. A block that moves leaves its
trigger condition in the body, because that has to be evaluated on every run.

What stays inline is what makes the skill that skill — its posture, its inputs,
its write boundary, the order of its acts, and the judgment between them. Every
pointer cites the reference file's full skill-relative path, as in
`references/formats/adr.md`, never a filename plus a folder description and never
a bare folder, and it is woven into the prose of the step as ordinary flowing
instruction rather than a mechanical "IF X READ Y" construction.

## What becomes an instruction

An act that is not specific to the skill it sits in is written as a shared
instruction and pointed at, rather than inlined. One criterion decides, applied
from two sides:

- At **design time**, name each step of the procedure as a verb-noun act
  carrying no skill name — "create a thread", "append a log line". An act that
  can be named that way and has a defined result is an instruction, and the body
  points at it at that step. An act whose only honest name is "the part of this
  skill where …" is body content.
- At **review time**, remove the surrounding skill's name and purpose from a
  block and read what is left. A block that still reads correctly is an
  instruction that was inlined; one that collapses belongs to the body.

Anything that only makes sense knowing which skill is running stays inline.
Neither size nor readership is a criterion: a two-line act is still an
instruction, and so is an act with a single reader. `shared-references.md`
describes the instruction file itself and how a skill declares one.

A body that writes states its own write boundary inline; `side-effects.md` fixes
what that boundary may be. A body mentions the terminal outcome only when the
skill emits one, per `interaction-posture.md`.

## No legacy awareness

A body states its expected inputs precisely and carries no recognition logic for,
and no mention of, layouts or artifact shapes the suite does not define. An input
that does not match the stated contract is the same situation as pointing the
skill at any unrelated file: the agent notices the mismatch through ordinary
judgment and raises it as an ordinary input ambiguity, handled by the skill's
posture. The safeguard is the precision of the input contract.

## The dead-concept test

Apply this test to every negative sentence kept or added anywhere in the suite:
does it forbid something a reader with no memory of the old design would
plausibly do anyway? A live guardrail against natural drift passes. A sentence
whose only referent is a design that has been removed fails: the agent reading it
has never met that design, so the sentence teaches a dead idea and costs context
on every invocation.

## The sweep's defect classes

A body read in full is checked against six classes, each hit reported with file,
line, and class before any edit:

1. **Posture mismatch** — an instruction presuming the other posture: a
   completion-oriented skill asking, confirming, or settling anything with the
   user mid-run; a dialogue-driven skill emitting a terminal outcome or queuing
   a pending decision.
2. **Dead-concept negation** — a sentence that fails the dead-concept test
   above.
3. **Restated guarantee** — telling the agent something a format, the harness,
   or another instruction already fixes, or something the agent cannot do
   anyway.
4. **Skill-independent block inline** — a block that passes the review-time test
   and belongs in an instruction.
5. **Routing prose in the body** — any "when to use this skill" text; the body
   has none, because routing lives in the description.
6. **Repository leakage** — decision identifiers, internal labels, or any
   explanation of how the repository that authors the suite is organised.

A hit is removed, or replaced with the positive instruction it was guarding, and
nothing beyond the hit is rewritten. Restructuring a body is a separate,
deliberate edit.

## Worked examples

A worked example lives in `references/` — shared when more than one skill reuses
it — and the step that consumes it points at it from the place where the
imitation happens. An example never carries a rule that exists nowhere else:
anything normative found only inside an example is hoisted into the body first,
so the body stays the complete set of rules and the example stays purely
illustrative.

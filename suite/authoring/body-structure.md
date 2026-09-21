# Body structure

A `SKILL.md` body is loaded whole on every invocation. What it holds, in what
order, and what it hands off to a reference is therefore the main lever on how
well the skill executes.

## Fixed section headings

Two headings are fixed by name.

**`## Inputs`.** A skill whose procedure works from gathered state carries a
section headed exactly `## Inputs`, listing what it gathers as a list rather than
as prose. Every item has one shape: `- <path or source><, presence clause when
it may be absent> — <what it is and what it is for>.` The presence clause names
the condition under which the item is there, as narrowly as the skill can know
it, and takes one of these forms: `when the file exists` for a thread file that
may not have been written yet; `when supplied` for something the caller passes
with the invocation and may omit; `when <input> carries one`, such as `when the
seed carries one`, for an item whose existence another gathered input announces;
and `when present` only when no narrower condition applies. An item carrying
none is either always present or is the primary input, which keeps its accepted
forms inside its own clause. No
item ends in a trailing tag: where a procedure ranks its sources, the ranking is
stated once in the prose that uses it, never per item. A body normally invoked
while the thread holds only `seed.md` and an empty `log.md` says so in one
sentence above the list.

The list opens with the same two project-layer items in every skill that has one:

```markdown
- `docs/adr/`, read via `/consult-decisions` — the project decisions bearing on <the target>.
- `docs/glossary.md`, when the file exists — the project's fixed terms, to be used in everything you write.
```

The input is the file, the skill is how it is read, and the target clause is
adapted to the skill. Where a body invokes the conflict rule those decisions come
with, it names `/consult-decisions` as a procedure — "classify it as `/consult-decisions`
instructs" — never as a document that carries text.

The thread files the skill reads follow. A skill with one primary input names it
and its accepted forms in the same section, so a reader learns there what the
skill works from. The procedure then starts from the gathered state and repeats
no read. A skill that gathers nothing carries no such section, and neither does a
model-invoked skill whose whole body is the act of consulting one source: its
reading is the procedure, so there is no gathered state for a section to
declare.

**`## Procedure`.** A body that gathers its execution sequence into one numbered
list heads that list exactly `## Procedure`. This is a naming rule and not a
presence mandate: a body whose acts each carry their own named section needs no
such list, and an all-reference skill whose behaviour is fully carried by its
format and guideline sections carries no procedure section at all rather than a
ritual read-draft-output sequence. `## Workflow` is never used as a section
heading, so that cross-references and greps for the procedure stay unambiguous.
Headings that belong to an emitted artifact — the `**Steps:**` field inside a
plan task brief, say — are part of that artifact's format and are untouched by
this rule.

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
its write boundary, the order of its acts, and the judgment between them.

Every pointer to a file inside the skill's own folder is written with the literal
prefix `<skill_path>/`, as in
`<skill_path>/references/formats/decision-record.md`, never a filename plus a
folder description and never a bare folder. The placeholder
resolves to the skill's base directory as the harness reports it at invocation,
and it is what tells a skill-local path apart from a project path such as
`docs/adr/`, which stays bare.

A pointer is a directive to open the file and act on it, and the words around
it tell the agent what kind of file it is opening. An instruction is followed,
and the pointer is the step: "Follow
`<skill_path>/references/instructions/append-log-line.md`", "by following
`<skill_path>/references/instructions/emit-pending-review.md`". A format is what
a write or a read conforms to, and is always named as one: "following the
`<skill_path>/references/formats/decision-record.md` format", "in the shape
`<skill_path>/references/formats/thread.md` defines". A bare "following
`<path>`" is never used for a format, because it leaves the reader to guess
whether the file is a procedure or a shape. Other verbs are fine where they read
better, provided the kind stays plain.

Two rules are strict. **No leak**: a body never restates what the pointed file
holds; the text around a pointer is limited to the skill-specific parameters the
file leaves open — the producer name, what the line states, which folder, the
token — and anything the body needs for its own judgment at that step is written
as the skill's own rule, not as a paraphrase with a citation. **No `per` before a
path**: `per` before a heading of the same body is fine; `per` before a file path
is the defect.

A pointer is woven into the prose of the step as ordinary flowing instruction
rather than a mechanical "IF X READ Y" construction.

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

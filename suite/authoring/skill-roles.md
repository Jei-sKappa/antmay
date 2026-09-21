# Skill roles

Every skill in the suite carries one of two roles. The role decides who may start
the skill, how its description is written, and which group folder it lives in.

## The two roles

**User-invoked.** A capability a person deliberately reaches for, owning one
complete user-visible operation. The role is declared once per harness:
`disable-model-invocation: true` in the skill's `SKILL.md` frontmatter, and
`policy.allow_implicit_invocation: false` in its `agents/openai.yaml`.

**Model-invoked.** A skill useful to an agent in any situation, whether or not an
entry point is running, and which an entry point may also point the agent at.
Both restrictions are omitted — no `disable-model-invocation` key and no `policy`
block — so the model may reach the skill at its own discretion, and the
`agents/openai.yaml` carries the interface block alone.

## Harness metadata

Every skill ships an `agents/openai.yaml` carrying an `interface:` block of
picker metadata: `display_name`, the skill's name in title case, and
`short_description`, a terse 4–7-word line written fresh for the picker rather
than copied from the `SKILL.md` description, which serves a different reader. The
interface block is universal and encodes nothing about the role; the `policy`
block is what encodes it, in lockstep with `disable-model-invocation`.

The two harness declarations never diverge: a skill is never user-invoked in one
harness and implicitly invocable in the other. Changing a skill's role means
changing the pair in the same edit.

## Descriptions

The `SKILL.md` description is written for whoever actually reads it, and that
differs by role.

- A **user-invoked** skill's description is as short as possible: one plain
  phrase saying what the skill does. The harness withholds the description of a
  skill marked `disable-model-invocation` from the model, so the only reader is a
  person choosing from a picker.
- A **model-invoked** skill's description is precise and complete enough that an
  agent knows exactly when to invoke it, at whatever length that takes, because
  the description is what the model routes on.

## Group folders

A skill lives at `skills/<group>/<skill-name>/`, and a group folder is named for
the capability its members share, as `spec/`, `plan/`, `implement/`, and
`review/` are. `model-invoked/` is the one group named for a role instead,
because the role is the only thing its members are guaranteed to share, and
naming it that way keeps the folder honest as the category grows.

## When a capability earns a separate skill

A new skill is created only when an operation's purpose, its durable output, or
its execution contract materially differs from every existing skill. A variant of
an existing skill — the same operation under a different framing, or a second way
into the same durable artifact — is a change to that skill, not a new one. Names
describe the capability and the artifact it produces, so the skill stays reusable
wherever that capability is wanted.

## Naming

A user-invoked skill's name uses the user's intent language: the words a person
reaches for when deliberately invoking the operation, as in `open-thread` and
`check-plan`. A model-invoked skill's name is the act an agent performs, as in
`consult-decisions`, so it reads as something the agent does in the middle of
other work. Keeping the two registers distinct is what makes the role legible
from the name alone.

A body that points at another skill names it as a `/skill-name` invocation in
prose. The suite is authored and installed as one coherent set: a skill assumes
every skill it names is present, and an absent one is an installation error
rather than a branch the body compensates for.

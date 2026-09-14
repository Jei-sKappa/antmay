# Pending-decision-bundle format

A bundle queues the human decisions one run could not derive, so they can be settled later. It lives under the thread's `.pending-decisions/` and is named `<UTC>-<suffix>-<slug>.md`, where `<UTC>` is the creation time, `<suffix>` distinguishes bundles created in the same instant, and `<slug>` names the subject in kebab case.

## Shape

```markdown
# Pending decisions: <title>

Producer: /<skill-name>
Target: <thread-relative artifact or operation the decisions block>
Request: <the originating user request, in one line>
Created: <UTC>
Points: <count>

## Points

### <short title>

Blocked: <what is blocked, stated concretely>

Why undecidable: <why the producer could not derive the answer from its inputs>

Evidence: <what the producer weighed, in its own words>

Suggestion: <free text, only when the producer sees an immediate fix>

### <short title of the next point>

…
```

## Rules

- The bundle has no section beyond the header lines and `## Points`.
- Each point is half finding, half decision: what is blocked, why the producer could not derive the answer, and the evidence it weighed, written in the producer's own words.
- `Suggestion:` is free text and appears only when the producer sees an immediate fix; nothing requires one.
- A point carries no options menu, no recommendation, and no other structure. The fork is framed live with the user when the bundle is resolved.
- `Points:` states how many `###` points the bundle holds.

### Disposition Frontmatter

A review records its own disposition in its YAML frontmatter, under a `status:` map. **This skill emits the review with NO `status.disposed` field** — a review with no `status.disposed` is {{open-by-parse-trailer}}

When the review is later acted on, its disposition is recorded directly in this same frontmatter, set once:

```yaml
status:
  disposed: <YYMMDDHHMMSSZ>
  disposition: accepted | rejected
  rationale: <thread-relative path>   # optional
```

- **Accept-and-revise** sets the frontmatter directly — {{disposition-record}}; no separate disposing document is written.
- **Reject** sets the frontmatter with **no document at all** — no separate disposing record is required.
- {{rationale-bullet}}
- Disposition is **set-once**: changing your mind is a new review or a thread reopen, not a frontmatter flip-flop.

::::::if{condition="${has-disposing-aside}"}
:::::if{condition="${has-frontmatter-lineage-tail}"}
This skill only EMITS the review (open, {{disposed-state}} `status.disposed`). Disposing it{{disposing-aside}} is a downstream act, out of scope for this skill.{{frontmatter-lineage-tail}}
:::::
:::::else
This skill only EMITS the review (open, {{disposed-state}} `status.disposed`). Disposing it{{disposing-aside}} is a downstream act, out of scope for this skill.
:::::
::::::
::::::else
:::::if{condition="${has-frontmatter-lineage-tail}"}
This skill only EMITS the review (open, {{disposed-state}} `status.disposed`). Disposing it is a downstream act, out of scope for this skill.{{frontmatter-lineage-tail}}
:::::
:::::else
This skill only EMITS the review (open, {{disposed-state}} `status.disposed`). Disposing it is a downstream act, out of scope for this skill.
:::::
::::::

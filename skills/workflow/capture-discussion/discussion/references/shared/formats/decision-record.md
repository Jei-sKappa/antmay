# Decision-record format

There is exactly one decision store per thread: the thread-root `decisions.md`. Every settled decision is appended to it as a self-contained `D<N>` record. Do not create per-artifact, per-bundle, or per-topic logs, and do not keep decisions anywhere else.

## Numbering

Number records sequentially across the whole thread: scan `decisions.md` for the highest existing `D<N>` and use the next integer. If `decisions.md` is header-only, the first record is `D1`. `decisions.md` already exists at the thread root; if it is somehow absent, create it with a short heading before appending.

## Record shape

Each record is a durable projection of the outcome, not a transcript of how it was reached. Write it so a fresh agent understands what was decided, why, and where it applies without the chat or the discussion point's options menu:

```markdown
## D<N>: <Title>

Scope: <optional — omit this line entirely when the whole thread is the scope; otherwise name the stage, relationship, or thread-relative artifact path the decision applies to>

Context: <one short self-contained paragraph, written from the thread's perspective, stating the question and only the surrounding facts needed to understand the decision>

Decision: <the complete substantive resolution, written out in full>

Rationale: <why this resolution, its principal trade-off, and any facts that materially condition it>
```

Field rules:

- **Title** — a short line naming the decision.
- **Scope** — omit the line when the decision applies to the whole thread; otherwise name a stage, relationship, or thread-relative artifact path (e.g. `specs/001/spec.md`).
- **Context** — mandatory; normally one short paragraph. It states the question and only the facts necessary to understand it. Write it from the thread's perspective: never "in this chat", "as you said", or "the user chose B", and never rely on conversational memory. It may reference an earlier record by ID (e.g. `D3`) when that reference resolves within `decisions.md`, and may reference thread artifacts by thread-relative path. It must not introduce a new decision or assumption — normative choices belong in `Decision`. Include a rejected alternative only when the trade-off is needed to understand the rationale.
- **Decision** — states the complete substantive resolution. Never a bare option letter like "A"; write the substance of what was chosen.
- **Rationale** — records why the choice was made, its principal trade-off, and any materially conditioning facts.

Do not copy the options menu, the recommendation, or general deliberation into the record.

## Append-only and supersession

Records are append-only: never rewrite or delete an existing record. When a settled decision later changes, append a new `D<N>` record that names the record it supersedes (e.g. `Context: supersedes D4 …`) and states the new resolution.

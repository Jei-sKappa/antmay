# Research from the Library

Produce an in-depth report on a topic, using the local library of cloned repos as the primary reference. The output is a standalone document a reader can act on without re-reading the sources.

## Workflow

1. Find the library root (usually `<project-root>/.library/`). Sources live under `<library-root>/sources/<owner>_<repo>/`. If no library exists or it has no stocked sources, tell the user to stock it first.
2. Read `<library-root>/sources/INDEX.md` to identify every repo that could contribute. Depth requires breadth — include any repo that plausibly touches the topic, not just the most obvious one.
3. Restate the research objective in one sentence before working. If the scope is genuinely ambiguous (which angle, which audience, which version), ask one clarifying question. Otherwise proceed.
4. Sketch the report outline before reading code: sections, key questions per section, what would make each section "in-depth" vs. surface-level. This outline is the contract for the explorers.
5. Dispatch `explorer` subagents in parallel — one per repo or per outline section, whichever maps cleaner. Give each a bounded brief: which repo path(s) to read, which questions to answer, what evidence (file paths, line ranges, snippets) to return. Explorers must use only `rg`, file reads, and repo-local docs/source — no web fetches, no new clones.
6. Synthesize the findings into the report following the `## Report shape` section below.
7. Save the report to `<library-root>/reports/<YYYY-MM-DD>_<topic_slug>.md`, where the date is today (use the system date) and `<topic_slug>` is a snake_case slug of the topic. If the file already exists, ask the user whether to overwrite or pick a new slug.

## Report shape

Write a well-structured report. The shape is up to you — pick the headings, ordering, and level of detail that fit the topic. Favor structure (headings, lists, tables, code blocks) over long paragraphs, cite source paths (with line numbers for code) for every non-trivial claim, preferring concrete references over paraphrase, and call out anything the sources do not answer or contradict instead of papering over it. Length follows the topic — do not pad to look thorough.

## Output

Reply with the path to the saved report. No preamble, no recap.

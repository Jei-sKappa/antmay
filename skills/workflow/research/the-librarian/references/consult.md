# Consult the Library

Use the local library of cloned repositories as reference material during research.

## Workflow

1. Find the library root:
   - Usually `<project-root>/.library/`. Cloned repos live under `<library-root>/sources/<owner>_<repo>/`.
   - If no library exists, tell the user to stock it first.
2. Read `<library-root>/sources/INDEX.md` first when it exists. Use it to choose the relevant repo(s).
3. Inspect only the relevant clone(s). If the target is unclear and cannot be inferred from the task, ask one clarifying question.
4. Default to an `explorer` subagent for library research to keep scans out of the main context. If subagents are unavailable, do a narrow inline search.
5. Give the explorer a bounded brief: which clone(s) to read and the exact question to answer.
6. Use `rg`, file reads, and repo-local docs/source. Do not browse or fetch new code unless the user asks.

## Output

Answer with the finding, then the supporting paths. Keep it short.

If nothing relevant is found, say that plainly and list the searched path(s).

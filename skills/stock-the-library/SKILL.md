---
name: stock-the-library
description: Clone one or more user-mentioned repositories into a local library folder and report their saved paths. Use when the user asks to stock, clone, or keep external repos locally as reference material before work begins.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.1.0
---

# Stock the Library

Clone the repo(s) the user mentions, record where they landed, report the paths, then stop.

## Workflow

1. Resolve the repo the user means:
   - Full git URLs (`https://...`, `git@...`, etc.) are used as-is.
   - GitHub `owner/repo` shorthand becomes `https://github.com/<owner>/<repo>.git`.
   - Natural mentions are fine when the repo is clear.
     - If a name could mean multiple repos, ask for the URL or the owner.
2. Save clones under `<project-root>/.library/<owner>_<repo>/`.
3. If a repo is already cloned, ask the user if he wants to refresh it.
4. Clone shallow by default: `git clone --depth 1 --single-branch <url> <library-root>/<owner>_<repo>`. Honor a branch, tag, or ref if the user names one.
5. Keep `<library-root>/INDEX.md` with exactly one bullet per cloned repo:
   `- <owner>/<repo> - <path> - <short description>`
   Do not add usage notes, status logs, or extra sections.

## Output

One line per repo:

`<repo>: (cloned | already present | refreshed | failed: <reason>)`

No preamble, no recap, no next-step suggestions.

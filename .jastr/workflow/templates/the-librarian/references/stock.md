# Stock the Library

Clone the repo(s) the user mentions, record where they landed, report the paths, then stop.

## Workflow

1. Resolve the repo the user means:
   - Full git URLs (`https://...`, `git@...`, etc.) are used as-is.
   - GitHub `owner/repo` shorthand becomes `https://github.com/<owner>/<repo>.git`.
   - Natural mentions are fine when the repo is clear.
     - If a name could mean multiple repos, ask for the URL or the owner.
2. Save clones under `<project-root>/.library/sources/<owner>_<repo>/`.
3. If a repo is already cloned, ask the user if he wants to refresh it.
4. Clone shallow by default: `git clone --depth 1 --single-branch <url> <library-root>/sources/<owner>_<repo>`. Honor a branch, tag, or ref if the user names one. When cloning multiple repos, run clones sequentially — never in parallel — to avoid hitting rate limits.
5. Keep `<library-root>/sources/INDEX.md` in this exact format:

   ```
   # INDEX.md

   Each project is cloned into a peer folder named `<owner>_<repo>/`.

   Library:
   - <owner>/<repo>: <short description>
   - ...
   ```

   One bullet per cloned repo, sorted, no usage notes, status logs, or extra sections. Do not duplicate the path — the `<owner>_<repo>` folder convention is stated once in the header.

## Output

One line per repo:

`<repo>: (cloned | already present | refreshed | failed: <reason>)`

No preamble, no recap, no next-step suggestions.

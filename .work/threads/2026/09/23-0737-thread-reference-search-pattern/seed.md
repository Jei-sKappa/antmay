# Make the thread-reference search match actual threads, not the threads folder

## Intent

The thread-reference search that `close-thread` runs matches the bare fragment `.work/threads/`, so it stops a close on every document that merely names the threads folder — the README, the glossary, `.gitignore`, the thread format. What must not appear outside `.work/` is a mention of an actual thread; mentioning the threads folder is fine. The search is to be fixed so that it matches references to actual threads only, in the shared instruction that defines it, so `close-thread` and `review-implementation` both pick up the fix.

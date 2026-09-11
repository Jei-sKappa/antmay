# Standard recipe

1. Open the thread with `open-thread`.
2. Discuss the change with `discussion` to settle open questions.
3. Write the thread's design truth with `spec`.
4. Review the specification with `review-spec` before downstream work. *(optional)*
5. Produce the plan with `plan-strict`, or with `plan-brief` when the work fits on one screen.
6. Check the plan against the specification with `check-plan`.
7. Implement the plan with `implement-plan`.
8. Review the delivered work with `review-implementation` if the risk warrants it. *(optional)*
9. Review the code quality with `review-code` if the risk warrants it. *(optional)*
10. Finish the thread with `finish` and choose how to handle the branch.
11. Close the thread with `close-thread`, which lands the thread's draft ADRs and glossary entries into the project layer and archives the thread.

Steps 5 to 7 may run more than once in one thread. Each further plan is a new folder under `plans/`, and each further implementation is a new folder under `implementations/`.

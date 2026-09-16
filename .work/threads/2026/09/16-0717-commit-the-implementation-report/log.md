# Thread log
- (constraint) an implement run must leave its workspace in a state the user can push without further manual Git work, because runs commonly execute on a remote VPS the user does not want to SSH into to finish the commit by hand
- (decision) a failed closing report commit keeps the run at DONE but the terminal outcome reason carries an explicit uncommitted marker and the diagnosis, because an unattended caller reads only that line and a silent DONE would push an incomplete stack
- (decision) the closing report commit follows the existing explicit-Git-instruction override: a suppression instruction suppresses it and the outcome carries the uncommitted marker, while a cadence instruction never reaches it because the report commit is not a member of the code commit cadence
- (decision) the closing commit becomes its own shared instruction rather than extending write-implementation-report.md, because manifest declaration is per-file and a future non-committing implement skill must be able to declare the write act without the commit act
- (decision) the report is committed as its own closing commit rather than folded into the last task commit, because the report is written after that commit lands, amending is forbidden, and a blocked run may have no task commit at all
- (decision) the closing commit stages the run's own report.md and nothing else, so the run's operational trace and any unrelated working-tree change stay out of it
- (decision) under the subagent orchestrator the orchestrator performs the closing report commit and never a subagent, consistent with it being the only committer and the writer of the report
- (event) spec authored from the live discussion session, pinning the closing report commit across the three implement skills

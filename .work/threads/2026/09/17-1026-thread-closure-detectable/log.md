# Thread log
- (decision) close-thread appends its final log event as `thread closed; ADRs: none|landed; glossary: none|merged`, because the log must show that closure ran and every delta category was handled without claiming the landed material remains current
- (decision) close-thread refuses before any write when the thread log already records closure unless the user explicitly asks it to proceed, preventing accidental repeated closing while retaining a deliberate escape hatch

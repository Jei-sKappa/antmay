# Scripted harness for manual CLI end-to-end testing

We want to exercise the real Antmay CLI end to end while replacing the external agentic harness with a deterministic fake or mock. The harness should accept scripted outputs so a developer can run realistic CLI commands, control how each harness interaction responds, and directly observe and verify the CLI’s behavior. The immediate goal is a practical manual testing workflow; reusing the same mechanism for automated end-to-end tests is a possible follow-up, not part of the initial commitment.

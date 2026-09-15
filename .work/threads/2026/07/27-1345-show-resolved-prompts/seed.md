# Expose resolved agent prompts in scripted demos

The scripted harness receives and validates the same fully resolved stage prompt that a real agent would receive, including the harness-specific skill trigger, resolved target, and configured profile prompt. The demo does not expose that value, so a developer can watch the simulated run but cannot inspect the central input being sent to the agent or easily diagnose prompt assembly problems.

The scripted demo should provide a way to view the exact resolved prompt supplied to each agent attempt. The value shown must come from the actual invocation request rather than a separate reconstruction, and prompt inspection should remain a demo/developer capability without adding noise to ordinary production runs or presenting the prompt as simulated agent output. The appropriate presentation—inline, opt-in, in the summary, or through another inspectable artifact—remains a design choice.

External: https://github.com/Jei-sKappa/antmay/issues/16

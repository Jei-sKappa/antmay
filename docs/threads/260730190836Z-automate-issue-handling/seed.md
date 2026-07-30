# Automate issue handling

Antmay needs an end-to-end way to handle a tracker issue from intake through an appropriate autonomous outcome, with user involvement determined by the issue's clarity and the authority explicitly granted to the agent. Issues arrive at different levels of maturity: an exploratory request may need research, evaluation, or structured self-discussion, while a clear request may be ready for specification, planning, implementation, and pull-request delivery.

The design must keep authorization, starting activity, and continuation policy distinct. It must define explicit tracker signals and their precedence, prevent duplicate work from repeated delivery events, avoid treating backlog presence or unclear intent as permission to implement, expose progress, conclusions, and terminal outcomes from the issue, and compose cleanly with Antmay threads, skills, pipelines, and their existing outcome contracts.

This is a major expansion of Antmay and may depend on prerequisite changes or additions to its skills, features, contracts, and integrations. Those enabling changes belong within this thread when they are necessary to deliver a coherent issue-handling capability.

External: https://github.com/Jei-sKappa/antmay/issues/23

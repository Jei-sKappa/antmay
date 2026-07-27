# Let users choose and compose the stages a run executes

The CLI currently offers one fixed built-in pipeline and starts every new run at its first stage, forcing users through work that may already be complete or through stages they deliberately do not want to execute. This blocks common workflows such as entering at a later stage, skipping individual stages, extending or reordering the sequence, choosing among additional pipelines, or composing a pipeline for one invocation. User control over the executed stage sequence is the CLI’s highest-priority missing capability: users need to shape a run around the actual state of their thread and their preferred workflow. The listed controls are examples of that need, not a predetermined interface or implementation.

External: https://github.com/Jei-sKappa/antmay/issues/22

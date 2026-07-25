export default {
  label: "BLOCKED at reconcile-spec, then resumed to completion",
  scenario: {
    schemaVersion: 1,
    stages: {
      spec: ["spec-correct"],
      "reconcile-spec": ["outcome-blocked", "reconcile-spec-correct"],
      "review-spec": ["outcome-done"],
      "plan-strict": ["plan-strict-correct"],
      "reconcile-plan": ["reconcile-plan-correct"],
      "implement-plan-with-subagents": ["implement-plan-with-subagents-correct"],
    },
  },
  steps: [
    { command: "run", expectExit: 2 },
    { command: "resume", expectExit: 0 },
  ],
};

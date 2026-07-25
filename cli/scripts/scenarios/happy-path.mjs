export default {
  label: "Standard happy path — six stages, no pauses",
  scenario: {
    schemaVersion: 1,
    stages: {
      spec: ["spec-correct"],
      "reconcile-spec": ["reconcile-spec-correct"],
      "review-spec": ["outcome-done"],
      "plan-strict": ["plan-strict-correct"],
      "reconcile-plan": ["reconcile-plan-correct"],
      "implement-plan-with-subagents": ["implement-plan-with-subagents-correct"],
    },
  },
  steps: [{ command: "run", expectExit: 0 }],
};

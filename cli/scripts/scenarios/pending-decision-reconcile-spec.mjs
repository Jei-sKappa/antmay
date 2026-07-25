export default {
  label: "DONE at reconcile-spec with a queued decision — pauses at the queue gate",
  scenario: {
    schemaVersion: 1,
    stages: {
      spec: ["spec-correct"],
      "reconcile-spec": ["reconcile-spec-pending-decision"],
      "review-spec": ["outcome-done"],
      "plan-strict": ["plan-strict-correct"],
      "reconcile-plan": ["reconcile-plan-correct"],
      "implement-plan-with-subagents": ["implement-plan-with-subagents-correct"],
    },
  },
  steps: [{ command: "run", expectExit: 2 }],
};

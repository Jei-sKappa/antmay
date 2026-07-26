import { standardScenario } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * A stage finalizes DONE but queues a decision a human owes an answer to, so the
 * run holds at the queue gate. Ends on the yellow `WAITING FOR USER` banner and
 * its `Pending:` list, sitting under a *green* stage footer — the one pause that
 * follows a stage that succeeded.
 */
export default {
  label: "DONE with a queued decision — ends on WAITING FOR USER",
  scenario: standardScenario({
    "reconcile-spec": ["reconcile-spec-pending-decision"],
  }),
  steps: [run({ expectExit: 2 })],
};

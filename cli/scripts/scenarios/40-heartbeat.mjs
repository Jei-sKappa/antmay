import { printedResumeCommand } from "../demo/markers.mjs";
import { standardScenario } from "../demo/pipeline.mjs";
import { run } from "../demo/steps.mjs";

/**
 * A stage that keeps working long enough to report that it is still alive.
 * Shows the repeated dim `· still working — elapsed …` line, which an ordinary
 * demo run never reaches because the default interval is five minutes and a
 * scripted stage finishes in well under a second.
 *
 * The interval is set on the hanging stage's own binding in the demo's
 * settings file — the same field a real user would set, not a demo-only hook.
 * A signal ends the wait, so the run closes on the `INTERRUPTED` block with the
 * heartbeat lines stacked directly above it.
 */
export default {
  label: "A long-running stage — shows the repeating heartbeat line",
  note:
    "The heartbeat interval is two seconds here, set through the stage's " +
    "afk.stages.review-spec.heartbeatSeconds binding; the built-in default is " +
    "five minutes.",
  settingsStages: { "review-spec": { heartbeatSeconds: 2 } },
  scenario: standardScenario({ "review-spec": ["harness-hang"] }),
  steps: [
    run({
      expectExit: 130,
      afterMs: 9000,
      markers: [
        { text: "· still working — elapsed", atLeast: 2 },
        "INTERRUPTED",
        "Received SIGINT; finishing the current attempt and pausing.",
        printedResumeCommand,
      ],
      during: (_ctx, child) => {
        child.kill("SIGINT");
      },
    }),
  ],
};

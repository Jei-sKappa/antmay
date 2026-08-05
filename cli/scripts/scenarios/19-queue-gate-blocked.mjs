import { removeStaleLocks, writeThreadFile } from "../demo/fixture.mjs";
import { printedResumeCommand } from "../demo/markers.mjs";
import { standardScenario } from "../demo/pipeline.mjs";
import { action, resume, run } from "../demo/steps.mjs";

/**
 * Queued work meets the *pre-attempt* gate, before any stage of this invocation
 * has started. Ends on a `WAITING FOR USER` banner with no `Log:` and no
 * `Continue:` line, because nothing was allocated: no attempt, no log, no harness
 * call. That is what tells this screen apart from the pause a stage reaches after
 * its own DONE.
 *
 * Getting there needs a cursor carrying no recovery for a resume to decide from,
 * which is what an abandoned run is. The first invocation is killed outright
 * mid-attempt, so its checkpoint stays `executing` and its lock is left behind;
 * the action removes that lock by hand — the only way a lock is ever released
 * after the executor holding it disappeared — and queues a decision. The resume
 * settles the abandoned attempt, becomes ready, and meets the gate.
 *
 * The killed stage runs the case that only waits, so nothing it wrote is
 * outstanding and the resume's clean-worktree rule is satisfied.
 */
export default {
  label: "Queued work at the pre-attempt gate — pauses before anything is allocated",
  note:
    "Three steps: the first invocation is killed outright to leave an abandoned " +
    "run, the stale lock is then removed by hand and a decision queued, and the " +
    "resume meets the gate before starting a stage.",
  scenario: standardScenario({ "review-spec": ["harness-hang"] }),
  steps: [
    run({
      expectExit: 137,
      afterMs: 2500,
      during: (_ctx, child) => {
        child.kill("SIGKILL");
      },
      markers: ["Stage 3/6 · review-spec", "Making no changes."],
    }),
    action("Remove the abandoned run's lock and queue a decision", (ctx) => {
      removeStaleLocks(ctx);
      writeThreadFile(
        ctx,
        ".pending-decisions/gate-fake-decision.md",
        "# Decide\n\nQueued while no executor was running.\n",
      );
    }),
    resume({
      expectExit: 2,
      markers: [
        "WAITING FOR USER",
        "1 pending bundle file awaits human resolution.",
        "gate-fake-decision.md",
        printedResumeCommand,
      ],
    }),
  ],
};

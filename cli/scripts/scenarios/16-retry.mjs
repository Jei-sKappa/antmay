import { printedResumeCommand } from "../demo/markers.mjs";
import { commitAll, writeThreadFile } from "../demo/fixture.mjs";
import { scriptedRun, STANDARD_STAGE_IDS } from "../demo/pipeline.mjs";
import { action, resume, run } from "../demo/steps.mjs";

/**
 * The one scenario that resumes, and the one that enters the pipeline partway
 * through. `--from reconcile-spec` skips the `spec` stage, so the startup block
 * carries the entry-point line and lists five stages rather than six. A stage
 * then blocks, the resume reruns it, and the retry's header carries the
 * `· attempt 2` suffix an ordinary first attempt never shows. Ends on
 * `SUCCESS`, so the retry header and the stages after it are the last thing on
 * screen.
 *
 * The entry stage requires a spec that the skipped stage would have written, so
 * the fixture commits one first.
 */

/** The stages `--from reconcile-spec` selects: the Standard suffix after `spec`. */
const SUFFIX_STAGE_IDS = STANDARD_STAGE_IDS.slice(1);

export default {
  label: "A suffix run whose blocked stage is resumed — shows '· attempt 2'",
  note:
    "Starts at --from reconcile-spec, so the run selects five of the six " +
    "Standard stages and the scripted document names only those five.",
  scenario: scriptedRun(SUFFIX_STAGE_IDS, {
    "reconcile-spec": ["outcome-blocked", "reconcile-spec-correct"],
  }),
  steps: [
    action("Commit the spec.md the entry stage requires", (ctx) => {
      writeThreadFile(ctx, "spec.md", "# Spec: Fake\n\nPlaceholder\n");
      commitAll(ctx, "docs: seed the spec the suffix run starts from");
    }),
    run({
      expectExit: 2,
      flags: ["--from", "reconcile-spec"],
      markers: ["BLOCKED", "Stage 1/5 blocked in", printedResumeCommand],
    }),
    resume({
      expectExit: 0,
      markers: [
        "Stage 1/5 · reconcile-spec · attempt 2",
        "SUCCESS — 5/5 stages completed",
      ],
    }),
  ],
};

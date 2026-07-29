import { mkdirSync } from "node:fs";
import path from "node:path";

import { writeThreadFile } from "../demo/fixture.mjs";
import { pipelineDocument } from "../demo/pipeline.mjs";
import { action, run } from "../demo/steps.mjs";

/**
 * A non-empty plan index paired with an empty task directory is structurally
 * neither a brief nor a strict plan. Ends on the first-stage projection carrying
 * the malformed plan description.
 */
export default {
  label: "Existing plan is malformed — ends on the unusable-plan projection",
  pipeline: pipelineDocument("malformed-plan", ["implement-plan"]),
  steps: [
    action("Create a plan.md with an empty plan-tasks/ folder", (ctx) => {
      writeThreadFile(ctx, "plan.md", "# Plan\n\nAn incomplete strict plan.\n");
      mkdirSync(path.join(ctx.threadRoot, "plan-tasks"));
    }),
    run({ expectExit: 1 }),
  ],
};

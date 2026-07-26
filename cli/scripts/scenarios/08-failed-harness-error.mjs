import { standardScenario } from "../demo/recipe.mjs";
import { run } from "../demo/steps.mjs";

/**
 * The provider closes the stream without returning a result. Ends on the
 * `FAILED — harness error` banner, under a `failed` stage footer.
 */
export default {
  label: "The provider errors — ends on the harness-error banner",
  scenario: standardScenario({ "review-spec": ["harness-provider-error"] }),
  steps: [run({ expectExit: 2 })],
};

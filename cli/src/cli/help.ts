/**
 * Usage, help, and version text for every CLI level.
 *
 * Producing any of these strings must never touch configuration, state, Git,
 * or harnesses — they are pure constants assembled here.
 */

/** Kept in sync by hand with the `version` field in `cli/package.json`. */
export const VERSION = "0.1.0";

/** Single-line version output. */
export const VERSION_LINE = `antmay ${VERSION}`;

const COMMON_OPTIONS = `Options:
  -h, --help     Show help
      --version  Show version`;

/** Usage shown for top-level (`antmay …`) grammar errors. */
export const TOP_USAGE = `Usage: antmay <command> [options]

Commands:
  afk    Run AFK workflow commands unattended

${COMMON_OPTIONS}`;

/** Usage shown for `antmay afk` namespace-level grammar errors. */
export const AFK_USAGE = `Usage: antmay afk <subcommand> [options]

Subcommands:
  run <recipe> --thread <path> [--dangerously-skip-permissions]
  resume <run-id>
  list

${COMMON_OPTIONS}`;

/** Usage shown for `antmay afk run` grammar errors. */
export const RUN_USAGE = `Usage: antmay afk run <recipe> --thread <path> [--dangerously-skip-permissions]

Options:
      --thread <path>                 Thread to run the recipe against (required)
      --dangerously-skip-permissions  Grant the run unrestricted host access
  -h, --help                          Show help
      --version                       Show version`;

/** Usage shown for `antmay afk resume` grammar errors. */
export const RESUME_USAGE = `Usage: antmay afk resume <run-id>

${COMMON_OPTIONS}`;

/** Usage shown for `antmay afk list` grammar errors. */
export const LIST_USAGE = `Usage: antmay afk list

${COMMON_OPTIONS}`;

/** Help text printed for `--help`/`-h` at each level. */
export const TOP_HELP = TOP_USAGE;
export const AFK_HELP = AFK_USAGE;
export const RUN_HELP = RUN_USAGE;
export const RESUME_HELP = RESUME_USAGE;
export const LIST_HELP = LIST_USAGE;

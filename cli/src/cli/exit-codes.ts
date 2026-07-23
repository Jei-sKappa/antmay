/**
 * Process exit codes used across the CLI.
 *
 * These are the only exit codes the executor emits. Their meanings are fixed
 * by the CLI contract and must not be repurposed.
 */
export const EXIT_OK = 0;
export const EXIT_FAILURE = 1;
export const EXIT_WAITING = 2;
export const EXIT_SIGINT = 130;
export const EXIT_SIGTERM = 143;
export const EXIT_SIGHUP = 129;

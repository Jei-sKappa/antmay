# Recipes for repo maintenance tasks. Run `just --list` to see them all.

# Sync bundled helper scripts from `bundled-scripts/` into each consuming skill's `scripts/` folder.
sync-scripts:
    tools/sync-bundled-scripts.sh

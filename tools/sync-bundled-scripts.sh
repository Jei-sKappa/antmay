#!/usr/bin/env bash
# Sync canonical helpers from bundled-scripts/ into the skill folders that need them.
#
# Skills are installed individually via `npx skills add Jei-sKappa/skills --skill <name>`,
# so each consuming skill must ship its own copy of the helper. This script keeps those
# in-skill copies in lockstep with the canonical source under bundled-scripts/.
#
# Usage:
#     tools/sync-bundled-scripts.sh
#
# Idempotent: safe to re-run. Exits non-zero if the canonical source is missing or
# a destination skill folder does not exist.

set -euo pipefail

# Resolve repo root from the script location so the script works from any cwd.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CANONICAL="$REPO_ROOT/bundled-scripts/copy-to-clipboard.py"

# Skills that ship copy-to-clipboard.py. Add new entries here when a skill starts
# using the helper; rerun this script to populate its scripts/ folder.
COPY_TO_CLIPBOARD_CONSUMERS=(
  "meta-prompting"
  "consult-the-expert"
  "report-to-the-owner"
)

if [[ ! -f "$CANONICAL" ]]; then
  echo "error: canonical script not found: $CANONICAL" >&2
  exit 1
fi

synced=0
unchanged=0

for skill in "${COPY_TO_CLIPBOARD_CONSUMERS[@]}"; do
  skill_dir="$REPO_ROOT/skills/$skill"
  if [[ ! -d "$skill_dir" ]]; then
    echo "error: skill folder missing: $skill_dir" >&2
    exit 1
  fi

  dest_dir="$skill_dir/scripts"
  dest="$dest_dir/copy-to-clipboard.py"

  mkdir -p "$dest_dir"

  if [[ -f "$dest" ]] && cmp -s "$CANONICAL" "$dest"; then
    unchanged=$((unchanged + 1))
    continue
  fi

  cp "$CANONICAL" "$dest"
  chmod +x "$dest"
  echo "synced: skills/$skill/scripts/copy-to-clipboard.py"
  synced=$((synced + 1))
done

echo "done — synced: $synced, unchanged: $unchanged"

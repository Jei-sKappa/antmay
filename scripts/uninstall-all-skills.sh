#!/usr/bin/env bash
# Uninstall every skill defined in this repo from the global skills install.
# Reads skill names dynamically from skills/**/SKILL.md so it stays in sync.
# Prompts y/n per skill so you can keep the ones you actually want.
# Portable to bash 3.2 (macOS default).

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"

if [ ! -d "$SKILLS_DIR" ]; then
  echo "error: skills directory not found at $SKILLS_DIR" >&2
  exit 1
fi

if [ ! -t 0 ]; then
  echo "error: stdin is not a TTY; run this script in an interactive terminal" >&2
  exit 1
fi

skills=()
while IFS= read -r name; do
  skills+=("$name")
done < <(find "$SKILLS_DIR" -name SKILL.md -type f \
  | sed 's|.*/\([^/]*\)/SKILL.md|\1|' \
  | sort -u)

total=${#skills[@]}
if [ "$total" -eq 0 ]; then
  echo "no skills discovered under $SKILLS_DIR"
  exit 0
fi

echo "Found $total skills. For each, answer:"
echo "  y = remove globally   n = keep (default)   q = quit"
echo

removed=()
kept=()
failed=()
i=0
quit=0
for skill in "${skills[@]}"; do
  i=$((i + 1))
  while :; do
    printf '[%2d/%d] remove %s? [y/N/q] ' "$i" "$total" "$skill"
    if ! read -r answer </dev/tty; then
      answer="q"
    fi
    lower=$(printf '%s' "$answer" | tr '[:upper:]' '[:lower:]')
    case "$lower" in
      y|yes)
        if bunx skills remove -g -y "$skill"; then
          removed+=("$skill")
        else
          failed+=("$skill")
        fi
        break
        ;;
      ""|n|no)
        kept+=("$skill")
        break
        ;;
      q|quit|exit)
        echo "aborting; remaining skills left untouched."
        quit=1
        break
        ;;
      *)
        echo "  please answer y, n, or q."
        ;;
    esac
  done
  [ "$quit" -eq 1 ] && break
done

echo
echo "Summary:"
echo "  removed: ${#removed[@]}"
echo "  kept:    ${#kept[@]}"
echo "  failed:  ${#failed[@]}"

if [ "${#kept[@]}" -gt 0 ]; then
  echo
  echo "Kept (still installed globally):"
  for s in "${kept[@]}"; do echo "  - $s"; done
fi

if [ "${#failed[@]}" -gt 0 ]; then
  echo
  echo "Failed to remove:"
  for s in "${failed[@]}"; do echo "  - $s"; done
  exit 1
fi

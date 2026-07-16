#!/usr/bin/env bash
# Uninstall this repo's skills from the global skills install.
# Discovers names from SKILL.md frontmatter and verifies every removal.
# Prompts y/n per installed skill so you can keep the ones you actually want.
# Portable to bash 3.2 (macOS default).

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
EXPECTED_SOURCE="Jei-sKappa/skills"

if [ ! -d "$SKILLS_DIR" ]; then
  echo "error: skills directory not found at $SKILLS_DIR" >&2
  exit 1
fi

for command in bun bunx; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "error: required command not found: $command" >&2
    exit 1
  fi
done

if ! exec 3<>/dev/tty || [ ! -t 3 ]; then
  echo "error: no controlling TTY; run this script in an interactive terminal" >&2
  exit 1
fi

# Return 0 when the named skill appears in a `skills list` JSON document,
# 1 when it does not, and 2 when the document cannot be parsed.
json_contains_skill() {
  local json="$1"
  local skill="$2"

  printf '%s' "$json" | bun -e '
    try {
      const skills = JSON.parse(await Bun.stdin.text());
      const wanted = process.argv[1].toLowerCase();
      process.exit(skills.some((skill) => skill.name.toLowerCase() === wanted) ? 0 : 1);
    } catch {
      process.exit(2);
    }
  ' "$skill"
}

list_global_skills() {
  bunx skills list -g --json
}

# Print the source recorded for a skill in the global lockfile. An absent or
# unreadable entry produces no output, allowing the caller to fail safely.
locked_skill_source() {
  local skill="$1"

  bun -e '
    import { join } from "node:path";
    import { homedir } from "node:os";

    try {
      const stateHome = process.env.XDG_STATE_HOME;
      const path = stateHome
        ? join(stateHome, "skills", ".skill-lock.json")
        : join(homedir(), ".agents", ".skill-lock.json");
      const lock = await Bun.file(path).json();
      const entry = lock.skills?.[process.argv[1]];
      if (!entry?.source) process.exit(1);
      process.stdout.write(entry.source);
    } catch {
      process.exit(1);
    }
  ' "$skill"
}

discovered=()
while IFS= read -r -d '' skill_file; do
  name=$(awk '
    NR == 1 && $0 == "---" { in_frontmatter = 1; next }
    in_frontmatter && $0 == "---" { exit }
    in_frontmatter && /^name:[[:space:]]*/ {
      sub(/^name:[[:space:]]*/, "")
      print
      exit
    }
  ' "$skill_file")

  if [ -z "$name" ]; then
    echo "error: missing name in frontmatter: $skill_file" >&2
    exit 1
  fi
  discovered+=("$name")
done < <(find "$SKILLS_DIR" -name SKILL.md -type f -print0)

skills=()
while IFS= read -r name; do
  skills+=("$name")
done < <(printf '%s\n' "${discovered[@]}" | sort -u)

total=${#skills[@]}
if [ "$total" -eq 0 ]; then
  echo "no skills discovered under $SKILLS_DIR"
  exit 0
fi

if [ "${#discovered[@]}" -ne "$total" ]; then
  echo "error: duplicate skill names discovered under $SKILLS_DIR" >&2
  exit 1
fi

if ! global_json=$(list_global_skills); then
  echo "error: unable to inventory globally installed skills" >&2
  exit 1
fi

installed=()
not_installed=()
foreign=()
unverified=()
for skill in "${skills[@]}"; do
  json_contains_skill "$global_json" "$skill"
  state=$?
  if [ "$state" -eq 2 ]; then
    echo "error: invalid JSON returned by 'bunx skills list -g --json'" >&2
    exit 1
  elif [ "$state" -eq 1 ]; then
    not_installed+=("$skill")
    continue
  fi

  if ! source=$(locked_skill_source "$skill"); then
    unverified+=("$skill")
  elif [ "$source" = "$EXPECTED_SOURCE" ] || [ "$source" = "$REPO_ROOT" ]; then
    installed+=("$skill")
  else
    foreign+=("$skill ($source)")
  fi
done

target_total=${#installed[@]}
if [ "$target_total" -eq 0 ]; then
  echo "No verified global skills from $EXPECTED_SOURCE are installed."
else
  echo "Found $target_total verified global skill(s) from $EXPECTED_SOURCE. For each, answer:"
  echo "  y = remove globally   n = keep (default)   q = quit"
  echo
fi

removed=()
kept=()
failed=()
not_reviewed=0
i=0
quit=0
for skill in "${installed[@]}"; do
  i=$((i + 1))
  while :; do
    printf '[%2d/%d] remove %s? [y/N/q] ' "$i" "$target_total" "$skill"
    if ! read -r answer <&3; then
      answer="q"
    fi
    lower=$(printf '%s' "$answer" | tr '[:upper:]' '[:lower:]')
    case "$lower" in
      y|yes)
        bunx skills remove -g -y "$skill"

        if ! global_json=$(list_global_skills); then
          echo "  could not verify removal." >&2
          failed+=("$skill")
        else
          json_contains_skill "$global_json" "$skill"
          state=$?
          if [ "$state" -eq 1 ]; then
            removed+=("$skill")
          else
            echo "  skill is still installed globally." >&2
            failed+=("$skill")
          fi
        fi
        break
        ;;
      ""|n|no)
        kept+=("$skill")
        break
        ;;
      q|quit|exit)
        echo "aborting; remaining skills left untouched."
        not_reviewed=$((target_total - i + 1))
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
echo "  removed:             ${#removed[@]}"
echo "  kept:                ${#kept[@]}"
echo "  not reviewed:        $not_reviewed"
echo "  failed verification: ${#failed[@]}"
echo "  not installed:       ${#not_installed[@]}"
echo "  different source:    ${#foreign[@]}"
echo "  unknown source:      ${#unverified[@]}"

if [ "${#kept[@]}" -gt 0 ]; then
  echo
  echo "Kept (verified as installed globally):"
  for s in "${kept[@]}"; do echo "  - $s"; done
fi

if [ "${#foreign[@]}" -gt 0 ]; then
  echo
  echo "Left untouched because the recorded source differs:"
  for s in "${foreign[@]}"; do echo "  - $s"; done
fi

if [ "${#unverified[@]}" -gt 0 ]; then
  echo
  echo "Left untouched because their source could not be verified:"
  for s in "${unverified[@]}"; do echo "  - $s"; done
fi

if [ "${#failed[@]}" -gt 0 ]; then
  echo
  echo "Failed to remove or verify:"
  for s in "${failed[@]}"; do echo "  - $s"; done
  exit 1
fi

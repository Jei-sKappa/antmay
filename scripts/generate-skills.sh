#!/usr/bin/env bash
#
# generate-skills.sh — regenerate (or --check) every workflow SKILL.md from the
# committed jastr catalog under .jastr/workflow/, and mirror each skill's
# references/ folder so the skill folder is an exact copy of its template.
#
# Usage:
#   scripts/generate-skills.sh            # regenerate all skills + mirror references
#   scripts/generate-skills.sh --check    # verify freshness; mutate nothing
#
# Binary resolution:
#   The jastr binary is resolved from $JASTR_BIN (a possibly multi-word command,
#   e.g. "node .../dist/index.js"). If unset, it defaults to the vendored build.
#   NEVER use the stale `jastr-dev` on PATH — only $JASTR_BIN is honored.
#
# Preflight (fails closed, writes nothing on failure):
#   - `$JASTR_BIN --version` must report commit 6674fd3 (the floor) or a later
#     semver, else the build is too old to render inline reliably.
#   - `$JASTR_BIN generate agent-skill --help` must expose `--mode`, proving the
#     binary can render an inline body instead of a router wrapper.
#
# Exit non-zero (naming the offending skill) on any per-skill generate/check
# failure, on an ambiguous skill->phase mapping, or on a reference-mirror guard
# violation.

set -u

# ---------------------------------------------------------------------------
# Locate the repo root (this script lives in <root>/scripts/).
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." >/dev/null 2>&1 && pwd)"
cd "$REPO_ROOT" || { echo "FATAL: cannot cd to repo root" >&2; exit 1; }

TEMPLATES_DIR=".jastr/workflow/templates"
SKILLS_ROOT="skills/workflow"

# ---------------------------------------------------------------------------
# Parse args.
# ---------------------------------------------------------------------------
CHECK=0
for arg in "$@"; do
  case "$arg" in
    --check) CHECK=1 ;;
    -h|--help)
      sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "FATAL: unknown argument: $arg" >&2
      echo "Usage: scripts/generate-skills.sh [--check]" >&2
      exit 2
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Resolve the jastr binary into an argv array.
#
# $JASTR_BIN is a command string that may contain multiple words. We split it on
# whitespace into the array JASTR_BIN_ARR and always invoke "${JASTR_BIN_ARR[@]}".
# The default below is repo-relative — NO absolute checkout path is embedded.
# ---------------------------------------------------------------------------
JASTR_BIN_DEFAULT="node .library/sources/Jei-sKappa_jastr/packages/cli/dist/index.js"
JASTR_BIN="${JASTR_BIN:-$JASTR_BIN_DEFAULT}"
# Word-split JASTR_BIN into an array (bash 3.2 compatible).
read -r -a JASTR_BIN_ARR <<< "$JASTR_BIN"

BUILD_RECIPE="cd .library/sources/Jei-sKappa_jastr && bun install && bun run build"

print_build_recipe() {
  {
    echo ""
    echo "The jastr binary resolved from \$JASTR_BIN is missing or too old."
    echo "  JASTR_BIN = $JASTR_BIN"
    echo "Required: version commit 6674fd3 (or later) with an inline-capable"
    echo "          'generate agent-skill --mode' option."
    echo "Rebuild the vendored bundle with:"
    echo "  $BUILD_RECIPE"
  } >&2
}

# ---------------------------------------------------------------------------
# Preflight — BEFORE writing or deleting anything.
# ---------------------------------------------------------------------------

# Floor commit and version. We accept the known-good floor sha verbatim, OR any
# semver strictly greater than the floor semver (shas are not orderable, so a
# different sha only passes if its semver is strictly newer).
JASTR_FLOOR_SHA="6674fd3"
JASTR_FLOOR_SEMVER="0.1.0"

# semver_ge A B  ->  exit 0 if A >= B (dotted numeric, up to 3 components)
semver_ge() {
  local a="$1" b="$2"
  local a1 a2 a3 b1 b2 b3
  a1="${a%%.*}"; a="${a#*.}"; a2="${a%%.*}"; a="${a#*.}"; a3="${a%%.*}"
  b1="${b%%.*}"; b="${b#*.}"; b2="${b%%.*}"; b="${b#*.}"; b3="${b%%.*}"
  a1=${a1:-0}; a2=${a2:-0}; a3=${a3:-0}
  b1=${b1:-0}; b2=${b2:-0}; b3=${b3:-0}
  # strip any non-numeric trailers
  a1=${a1//[!0-9]/}; a2=${a2//[!0-9]/}; a3=${a3//[!0-9]/}
  b1=${b1//[!0-9]/}; b2=${b2//[!0-9]/}; b3=${b3//[!0-9]/}
  a1=${a1:-0}; a2=${a2:-0}; a3=${a3:-0}
  b1=${b1:-0}; b2=${b2:-0}; b3=${b3:-0}
  if [ "$a1" -ne "$b1" ]; then [ "$a1" -gt "$b1" ]; return; fi
  if [ "$a2" -ne "$b2" ]; then [ "$a2" -gt "$b2" ]; return; fi
  [ "$a3" -ge "$b3" ]
}

# Version output, e.g. "0.1.0 (6674fd3)".
VERSION_OUT="$("${JASTR_BIN_ARR[@]}" --version 2>&1)"
VERSION_RC=$?
if [ "$VERSION_RC" -ne 0 ]; then
  echo "PREFLIGHT FAIL: '\$JASTR_BIN --version' exited $VERSION_RC" >&2
  echo "  output: $VERSION_OUT" >&2
  print_build_recipe
  exit 1
fi

# Extract the semver (first dotted token) and check the sha / semver floor.
VERSION_SEMVER="$(printf '%s\n' "$VERSION_OUT" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
VERSION_OK=0
case "$VERSION_OUT" in
  *"$JASTR_FLOOR_SHA"*) VERSION_OK=1 ;;  # exact known-good floor sha
esac
if [ "$VERSION_OK" -eq 0 ] && [ -n "$VERSION_SEMVER" ]; then
  # Different sha: accept only if semver is strictly newer than the floor.
  if semver_ge "$VERSION_SEMVER" "$JASTR_FLOOR_SEMVER" && \
     [ "$VERSION_SEMVER" != "$JASTR_FLOOR_SEMVER" ]; then
    VERSION_OK=1
  fi
fi
if [ "$VERSION_OK" -eq 0 ]; then
  echo "PREFLIGHT FAIL: jastr version too old or unrecognized." >&2
  echo "  reported: $VERSION_OUT" >&2
  echo "  required floor: $JASTR_FLOOR_SEMVER ($JASTR_FLOOR_SHA) or later" >&2
  print_build_recipe
  exit 1
fi

# Inline-capability: the help text must expose --mode (router vs inline).
HELP_OUT="$("${JASTR_BIN_ARR[@]}" generate agent-skill --help 2>&1)"
HELP_RC=$?
if [ "$HELP_RC" -ne 0 ]; then
  echo "PREFLIGHT FAIL: 'generate agent-skill --help' exited $HELP_RC" >&2
  echo "  output: $HELP_OUT" >&2
  print_build_recipe
  exit 1
fi
case "$HELP_OUT" in
  *"--mode"*) : ;;  # inline-capable
  *)
    echo "PREFLIGHT FAIL: 'generate agent-skill --help' lacks '--mode'." >&2
    echo "  This binary cannot render inline bodies; it would emit a router wrapper." >&2
    print_build_recipe
    exit 1
    ;;
esac

# ---------------------------------------------------------------------------
# Build the skill-id -> phase map by walking skills/workflow/<phase>/<skill>/.
# Detect ambiguity (a skill-id that resolves to more than one phase) and fail.
#
# bash 3.2 has no associative arrays, so we keep two parallel indexed arrays
# (MAP_IDS / MAP_PHASES) and a small linear lookup.
# ---------------------------------------------------------------------------
MAP_IDS=()
MAP_PHASES=()

map_lookup() {  # echo the phase for skill-id $1, or empty
  local want="$1" i=0
  while [ "$i" -lt "${#MAP_IDS[@]}" ]; do
    if [ "${MAP_IDS[$i]}" = "$want" ]; then
      printf '%s' "${MAP_PHASES[$i]}"
      return 0
    fi
    i=$((i + 1))
  done
  return 1
}

AMBIGUOUS=0
while IFS= read -r skillmd; do
  # skillmd = skills/workflow/<phase>/<skill>/SKILL.md
  rel="${skillmd#"$SKILLS_ROOT"/}"      # <phase>/<skill>/SKILL.md
  phase="${rel%%/*}"                     # <phase>
  rest="${rel#*/}"                       # <skill>/SKILL.md
  skill="${rest%%/*}"                    # <skill>
  existing="$(map_lookup "$skill")" && rc=0 || rc=1
  if [ "$rc" -eq 0 ]; then
    if [ "$existing" != "$phase" ]; then
      echo "FATAL: ambiguous skill->phase mapping for '$skill': '$existing' and '$phase'" >&2
      AMBIGUOUS=1
    fi
  else
    MAP_IDS+=("$skill")
    MAP_PHASES+=("$phase")
  fi
done < <(find "$SKILLS_ROOT" -mindepth 3 -name SKILL.md -type f | sort)

if [ "$AMBIGUOUS" -ne 0 ]; then
  exit 1
fi

# ---------------------------------------------------------------------------
# Reference-mirror helpers.
# ---------------------------------------------------------------------------

# realpath_safe PATH -> prints the realpath of PATH (the path need not exist;
# resolves its existing parent then re-appends the leaf, so symlink/.. tricks in
# the parent chain cannot escape).
realpath_safe() {
  local p="$1"
  if [ -e "$p" ]; then
    realpath "$p"
  else
    local parent leaf
    parent="$(dirname "$p")"
    leaf="$(basename "$p")"
    if [ -d "$parent" ]; then
      printf '%s/%s' "$(realpath "$parent")" "$leaf"
    else
      printf '%s' "$p"
    fi
  fi
}

# is_contained CHILD PARENT -> exit 0 if realpath(CHILD) is PARENT or under it.
is_contained() {
  local child parent
  child="$(realpath_safe "$1")"
  parent="$(realpath_safe "$2")"
  case "$child" in
    "$parent") return 0 ;;
    "$parent"/*) return 0 ;;
    *) return 1 ;;
  esac
}

# ---------------------------------------------------------------------------
# Iterate over every catalog template directory.
# ---------------------------------------------------------------------------
FAILED=0

# Guard: nothing to do if there are no templates.
if [ ! -d "$TEMPLATES_DIR" ]; then
  echo "FATAL: no catalog templates dir at $TEMPLATES_DIR" >&2
  exit 1
fi

for tdir in "$TEMPLATES_DIR"/*/; do
  [ -d "$tdir" ] || continue
  skill="$(basename "$tdir")"

  phase="$(map_lookup "$skill")" && rc=0 || rc=1
  if [ "$rc" -ne 0 ]; then
    echo "FAIL [$skill]: template has no matching skill folder under $SKILLS_ROOT/*/$skill/" >&2
    FAILED=1
    continue
  fi

  skill_dir="$SKILLS_ROOT/$phase/$skill"
  out="$skill_dir/SKILL.md"

  template_refs="${tdir%/}/references"    # catalog references/ (strip trailing /)
  skill_refs="$skill_dir/references"      # skill-folder references/

  # -------------------------------------------------------------------------
  # Reference-mirror PRE-CHECK guard (applies in BOTH modes, before any write):
  # if the skill currently HAS a references/ folder but the catalog has NO
  # references/ directory, FAIL WITHOUT MUTATING ANYTHING. This stops the first
  # migration from silently deleting a skill's references just because the
  # catalog has not been populated with them yet.
  # -------------------------------------------------------------------------
  if [ -d "$skill_refs" ] && [ ! -d "$template_refs" ]; then
    echo "FAIL [$skill]: skill folder has references/ but catalog template has none." >&2
    echo "  Refusing to mutate. Add $template_refs before regenerating." >&2
    FAILED=1
    continue
  fi

  if [ "$CHECK" -eq 1 ]; then
    # -----------------------------------------------------------------------
    # CHECK MODE — verify SKILL.md freshness AND report reference orphan/drift.
    # Mutate nothing.
    # -----------------------------------------------------------------------
    if ! "${JASTR_BIN_ARR[@]}" generate agent-skill "workflow/$skill" \
          --out "$out" --check --mode=inline; then
      echo "FAIL [$skill]: SKILL.md is stale or missing (check failed)." >&2
      FAILED=1
      # keep checking the rest so a single run reports all problems
    fi

    # Reference reporting: compare the skill folder against the template.
    if [ -d "$template_refs" ] || [ -d "$skill_refs" ]; then
      # Orphans: present in skill folder, absent in template.
      if [ -d "$skill_refs" ]; then
        while IFS= read -r f; do
          rel="${f#"$skill_refs"/}"
          if [ ! -e "$template_refs/$rel" ]; then
            echo "FAIL [$skill]: orphan reference (in skill folder, not template): references/$rel" >&2
            FAILED=1
          fi
        done < <(find "$skill_refs" -type f 2>/dev/null)
      fi
      # Missing / drifted: present in template, absent or differing in skill folder.
      if [ -d "$template_refs" ]; then
        while IFS= read -r f; do
          rel="${f#"$template_refs"/}"
          if [ ! -e "$skill_refs/$rel" ]; then
            echo "FAIL [$skill]: missing reference (in template, not skill folder): references/$rel" >&2
            FAILED=1
          elif ! cmp -s "$f" "$skill_refs/$rel"; then
            echo "FAIL [$skill]: drifted reference (template != skill folder): references/$rel" >&2
            FAILED=1
          fi
        done < <(find "$template_refs" -type f 2>/dev/null)
      fi
    fi

  else
    # -----------------------------------------------------------------------
    # DEFAULT MODE — regenerate SKILL.md inline, then mirror references.
    # -----------------------------------------------------------------------
    if ! "${JASTR_BIN_ARR[@]}" generate agent-skill "workflow/$skill" \
          --out "$out" --mode=inline --force; then
      echo "FAIL [$skill]: generation failed." >&2
      FAILED=1
      continue
    fi

    # Reference mirror: make skill_refs an EXACT copy of template_refs.
    if [ -d "$template_refs" ]; then
      # Realpath-contain the delete target so a symlink/.. cannot escape it.
      if [ -d "$skill_refs" ] && ! is_contained "$skill_refs" "$skill_dir"; then
        echo "FAIL [$skill]: references/ path escapes $skill_dir (realpath guard)." >&2
        FAILED=1
        continue
      fi
      mkdir -p "$skill_refs"
      # rsync with --delete makes the destination an exact byte-copy of the
      # source: files removed from the template are deleted from the skill
      # folder. --delete only ever removes entries inside the (guarded) dest.
      if ! rsync -a --delete "$template_refs"/ "$skill_refs"/; then
        echo "FAIL [$skill]: reference mirror (rsync) failed." >&2
        FAILED=1
        continue
      fi
    fi
    # If the template has NO references/, the pre-check guard above already
    # ensured the skill folder has none either, so there is nothing to mirror
    # or delete.
  fi
done

if [ "$FAILED" -ne 0 ]; then
  if [ "$CHECK" -eq 1 ]; then
    echo "RESULT: --check FAILED (one or more skills stale/drifted)." >&2
  else
    echo "RESULT: generation FAILED for one or more skills." >&2
  fi
  exit 1
fi

if [ "$CHECK" -eq 1 ]; then
  echo "OK: all skills up to date; references match."
else
  echo "OK: all skills regenerated; references mirrored."
fi
exit 0

#!/usr/bin/env python3
"""Rank Markdown headers across every SKILL.md in this repo.

Walks the `skills/` directory, extracts ATX headers from each SKILL.md body
(ignoring YAML frontmatter and fenced code blocks), and prints one of:

  * a frequency ranking of headers with the skills that use them (default), or
  * a similarity report comparing the *bodies* of each shared header across
    the skills that use it (`--bodies`), optionally showing the actual diffs
    between variants (`--diff`) and/or focusing on drift candidates
    (`--drift`).

Because skills in this repo are deliberately self-contained, the same
boilerplate section is copy-pasted into many SKILL.md files rather than
factored out. The genuinely useful signal is therefore *drift*: a section that
is meant to be identical everywhere but has silently diverged into several
near-identical variants. `--drift` surfaces exactly those, and `--diff` shows
what changed.

Usage:
    python3 scripts/skill_header_stats.py
    python3 scripts/skill_header_stats.py --min-count 3
    python3 scripts/skill_header_stats.py --bucket workflow
    python3 scripts/skill_header_stats.py --bodies
    python3 scripts/skill_header_stats.py --bodies --min-count 5
    python3 scripts/skill_header_stats.py --drift              # accidental-drift view
    python3 scripts/skill_header_stats.py --drift --diff       # ...with the diffs
    python3 scripts/skill_header_stats.py --bodies --diff --min-count 4
    python3 scripts/skill_header_stats.py --bodies --max-similarity 0.999  # hide identical
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter, defaultdict
from difflib import SequenceMatcher, unified_diff
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = REPO_ROOT / "skills"

FRONTMATTER_RE = re.compile(r"^---\s*$")
FENCE_RE = re.compile(r"^\s{0,3}(```+|~~~+)")
# ATX header: up to 3 spaces of indent, 1-6 '#', at least one space, then text.
# Allows the optional trailing run of '#' that CommonMark strips.
HEADER_RE = re.compile(r"^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$")

# A section is "meant to be identical but drifted" when it has more than one
# variant yet the variants are still highly similar. This is the floor used by
# --drift (overridable with --min-similarity).
DRIFT_SIMILARITY_FLOOR = 0.5


def extract_sections(path: Path) -> list[tuple[int, str, str]]:
    """Return one (level, '## Heading', body) tuple per ATX header.

    The body for a header runs from the line after the header up to (but not
    including) the next header of the same-or-higher level (smaller level
    number = higher rank, i.e. fewer #s). YAML frontmatter and fenced code
    blocks are excluded from header detection but their lines remain part of
    any surrounding section body.
    """
    lines: list[str] = []
    headers_at: list[tuple[int, int, str]] = []  # (line_idx, level, key)

    in_frontmatter = False
    in_code_fence = False
    fence_marker: str | None = None

    with path.open("r", encoding="utf-8") as f:
        for lineno, raw in enumerate(f):
            line = raw.rstrip("\n")
            lines.append(line)

            if lineno == 0 and FRONTMATTER_RE.match(line):
                in_frontmatter = True
                continue
            if in_frontmatter:
                if FRONTMATTER_RE.match(line):
                    in_frontmatter = False
                continue

            fence = FENCE_RE.match(line)
            if fence:
                marker = fence.group(1)[0]  # '`' or '~'
                if not in_code_fence:
                    in_code_fence = True
                    fence_marker = marker
                elif marker == fence_marker:
                    in_code_fence = False
                    fence_marker = None
                continue
            if in_code_fence:
                continue

            hm = HEADER_RE.match(line)
            if hm:
                level = len(hm.group(1))
                text = hm.group(2).strip()
                if text:
                    headers_at.append((lineno, level, f"{'#' * level} {text}"))

    sections: list[tuple[int, str, str]] = []
    for i, (start_idx, level, key) in enumerate(headers_at):
        end_idx = len(lines)
        for j in range(i + 1, len(headers_at)):
            next_idx, next_level, _ = headers_at[j]
            if next_level <= level:
                end_idx = next_idx
                break
        body = "\n".join(lines[start_idx + 1 : end_idx])
        sections.append((level, key, body))

    return sections


def extract_headers(path: Path) -> list[str]:
    return [key for _, key, _ in extract_sections(path)]


def normalize_body(body: str) -> str:
    """Whitespace-normalize a section body for comparison.

    - rstrip every line (kills trailing spaces and CRs)
    - collapse runs of blank lines into a single blank line
    - strip leading and trailing blank lines
    """
    stripped = [ln.rstrip() for ln in body.splitlines()]
    collapsed: list[str] = []
    prev_blank = False
    for ln in stripped:
        is_blank = ln == ""
        if is_blank and prev_blank:
            continue
        collapsed.append(ln)
        prev_blank = is_blank
    while collapsed and collapsed[0] == "":
        collapsed.pop(0)
    while collapsed and collapsed[-1] == "":
        collapsed.pop()
    return "\n".join(collapsed)


def avg_pairwise_similarity(bodies: list[str]) -> float | None:
    """Average difflib SequenceMatcher ratio over all unordered pairs.

    Returns None if fewer than 2 bodies are supplied.
    """
    n = len(bodies)
    if n < 2:
        return None
    total = 0.0
    pairs = 0
    for i in range(n):
        for j in range(i + 1, n):
            total += SequenceMatcher(None, bodies[i], bodies[j]).ratio()
            pairs += 1
    return total / pairs


def variant_label(i: int) -> str:
    """0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, 27 -> AB, ..."""
    label = ""
    n = i + 1
    while n > 0:
        n, r = divmod(n - 1, 26)
        label = chr(ord("A") + r) + label
    return label


def skill_id(path: Path) -> str:
    """Return the skill's directory path relative to the repo root."""
    try:
        return str(path.parent.relative_to(REPO_ROOT))
    except ValueError:
        return str(path.parent)


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--min-count",
        type=int,
        default=None,
        help="Only show headers with at least this many total occurrences. "
        "Default is 1 for the ranking report and 2 for the body reports.",
    )
    p.add_argument(
        "--bucket",
        choices=("workflow", "deprecated", "all"),
        default="all",
        help="Restrict to a top-level skills bucket (default: all).",
    )
    p.add_argument(
        "--no-skills",
        action="store_true",
        help="In the default ranking report, suppress the per-header skill list.",
    )
    p.add_argument(
        "--bodies",
        action="store_true",
        help="Compare section BODIES per shared header: cluster skills by exact "
        "whitespace-normalized body and report average pairwise similarity.",
    )
    p.add_argument(
        "--diff",
        action="store_true",
        help="In a body report, also print a unified diff of every non-canonical "
        "variant against the canonical (most-used) variant. Implies --bodies.",
    )
    p.add_argument(
        "--drift",
        action="store_true",
        help="Focus on DRIFT candidates: headers with more than one variant whose "
        "variants are still highly similar (>= --min-similarity, default "
        f"{DRIFT_SIMILARITY_FLOOR}), ranked by a drift score that weights "
        "similarity by how many skills/variants are affected. Implies --bodies.",
    )
    p.add_argument(
        "--min-similarity",
        type=float,
        default=None,
        help="Lower bound (0..1) on avg pairwise similarity for body reports. "
        f"Default 0.0, or {DRIFT_SIMILARITY_FLOOR} in --drift mode.",
    )
    p.add_argument(
        "--max-similarity",
        type=float,
        default=None,
        help="Upper bound (0..1) on avg pairwise similarity for body reports. "
        "E.g. 0.999 hides byte-identical sections. Default: no upper bound.",
    )
    p.add_argument(
        "--sort",
        choices=("count", "similarity", "drift"),
        default=None,
        help="Sort order for body reports. Default: 'count', or 'drift' in "
        "--drift mode.",
    )
    return p.parse_args(argv)


def collect(skill_files: list[Path]):
    total_counts: Counter[str] = Counter()
    per_skill: dict[str, Counter[str]] = defaultdict(Counter)
    # header_key -> list[(skill_id, normalized_body, raw_body)]
    occurrences: dict[str, list[tuple[str, str, str]]] = defaultdict(list)

    for path in skill_files:
        sid = skill_id(path)
        for _, key, body in extract_sections(path):
            total_counts[key] += 1
            per_skill[key][sid] += 1
            occurrences[key].append((sid, normalize_body(body), body))

    return total_counts, per_skill, occurrences


def build_header_record(
    header: str,
    count: int,
    occs: list[tuple[str, str, str]],
    skill_count: int,
) -> dict:
    """Compute clusters, similarity and a drift score for one shared header."""
    normalized_bodies = [norm for _, norm, _ in occs]
    sim = avg_pairwise_similarity(normalized_bodies)

    # Cluster by exact normalized body. Each cluster collects skill_id counts
    # and keeps the (identical) body text for diffing.
    cluster_map: dict[str, Counter[str]] = defaultdict(Counter)
    for sid, norm, _raw in occs:
        cluster_map[norm][sid] += 1
    clusters = list(cluster_map.items())  # [(norm_body, Counter{sid: n})]
    clusters.sort(key=lambda kv: (-sum(kv[1].values()), min(kv[1])))

    variants = len(clusters)
    # Drift score: only meaningful when a section split into >1 variant.
    # Weight closeness-to-identical (sim) by blast radius (occurrences) and by
    # how fragmented it is (variants - 1). Higher = more worth reconciling.
    if variants > 1 and sim is not None:
        drift_score = sim * count * (variants - 1)
    else:
        drift_score = 0.0

    return {
        "header": header,
        "count": count,
        "skill_count": skill_count,
        "sim": sim,
        "clusters": clusters,
        "variants": variants,
        "drift_score": drift_score,
    }


def print_ranking_report(
    total_counts: Counter[str],
    per_skill: dict[str, Counter[str]],
    min_count: int,
    show_skills: bool,
    total_skills: int,
) -> None:
    ranked = sorted(
        ((h, c) for h, c in total_counts.items() if c >= min_count),
        key=lambda kv: (-kv[1], kv[0].lower()),
    )
    total_headers = sum(total_counts.values())
    print(
        f"Analyzed {total_skills} SKILL.md file(s); "
        f"{len(total_counts)} unique headers, {total_headers} total occurrences."
    )
    if min_count > 1:
        print(f"Showing headers with count >= {min_count}.")
    print()

    width = len(str(ranked[0][1])) if ranked else 1
    for header, count in ranked:
        skills = per_skill[header]
        print(f"{count:>{width}}  {header}   ({len(skills)} skill(s))")
        if show_skills:
            for sid, n in sorted(skills.items()):
                suffix = f"  (x{n})" if n > 1 else ""
                print(f"        - {sid}{suffix}")
            print()


def print_variant_diffs(clusters: list[tuple[str, Counter[str]]]) -> None:
    """Print a unified diff of each non-canonical variant vs. the canonical one.

    Canonical = clusters[0] (the most-used variant; clusters are pre-sorted).
    Variants are diffed using their whitespace-normalized bodies, the same text
    the similarity score is computed from.
    """
    if len(clusters) < 2:
        print("        (identical across all skills — no diff)")
        return

    canon_body, canon_counts = clusters[0]
    canon_rep = sorted(canon_counts)[0]
    canon_label = f"variant A [{canon_rep}]"
    canon_lines = canon_body.splitlines()

    for i in range(1, len(clusters)):
        body, counts = clusters[i]
        rep = sorted(counts)[0]
        label = f"variant {variant_label(i)} [{rep}]"
        diff = unified_diff(
            canon_lines,
            body.splitlines(),
            fromfile=canon_label,
            tofile=label,
            lineterm="",
            n=2,
        )
        print(f"        --- diff: {canon_label}  ->  {label} ---")
        any_line = False
        for dline in diff:
            print(f"        {dline}")
            any_line = True
        if not any_line:
            print("        (no textual difference)")
        print()


def print_bodies_report(
    total_counts: Counter[str],
    per_skill: dict[str, Counter[str]],
    occurrences: dict[str, list[tuple[str, str, str]]],
    min_count: int,
    total_skills: int,
    *,
    min_similarity: float,
    max_similarity: float,
    drift_only: bool,
    show_diff: bool,
    sort_by: str,
) -> None:
    # Build a record for every header that clears the occurrence threshold.
    records = [
        build_header_record(h, c, occurrences[h], len(per_skill[h]))
        for h, c in total_counts.items()
        if c >= min_count
    ]

    # Repo-wide health summary, computed before filtering so it reflects the
    # whole set of shared sections (not just the filtered view).
    identical = sum(1 for r in records if r["variants"] == 1)
    drifting = sum(
        1
        for r in records
        if r["variants"] > 1 and (r["sim"] or 0.0) >= DRIFT_SIMILARITY_FLOOR
    )
    divergent = len(records) - identical - drifting

    total_headers = sum(total_counts.values())
    print(
        f"Analyzed {total_skills} SKILL.md file(s); "
        f"{len(total_counts)} unique headers, {total_headers} total occurrences."
    )
    print(
        f"Shared sections (count >= {min_count}): {len(records)}  |  "
        f"identical: {identical}   "
        f"drift candidates (>1 variant, sim >= {DRIFT_SIMILARITY_FLOOR:.0%}): "
        f"{drifting}   "
        f"divergent: {divergent}"
    )
    print(
        "Similarity = average pairwise difflib SequenceMatcher ratio over "
        "whitespace-normalized bodies."
    )
    if drift_only:
        print(
            "Drift score = similarity x occurrences x (variants - 1)  "
            "(higher = more copies worth reconciling)."
        )
    print()

    # Apply the view filters.
    def keep(r: dict) -> bool:
        sim = r["sim"] if r["sim"] is not None else 0.0
        if sim < min_similarity or sim > max_similarity:
            return False
        if drift_only and r["variants"] <= 1:
            return False
        return True

    shown = [r for r in records if keep(r)]

    if sort_by == "similarity":
        shown.sort(key=lambda r: (-(r["sim"] or 0.0), r["header"].lower()))
    elif sort_by == "drift":
        shown.sort(key=lambda r: (-r["drift_score"], r["header"].lower()))
    else:  # count
        shown.sort(key=lambda r: (-r["count"], r["header"].lower()))

    if not shown:
        print("(no headers match the current filters)")
        return

    for r in shown:
        header = r["header"]
        sim = r["sim"]
        sim_str = f"{sim * 100:.1f}%" if sim is not None else "n/a"
        clusters = r["clusters"]
        identical_tag = "  [all identical]" if r["variants"] == 1 else ""
        drift_tag = (
            f"   drift score: {r['drift_score']:.1f}"
            if drift_only and r["variants"] > 1
            else ""
        )
        print(
            f"{header}   ({r['count']} occurrences across "
            f"{r['skill_count']} skill(s))"
        )
        print(
            f"    unique variants: {r['variants']}   "
            f"avg pairwise similarity: {sim_str}{identical_tag}{drift_tag}"
        )

        for i, (_norm_body, skill_counts) in enumerate(clusters):
            label = variant_label(i)
            occ_count = sum(skill_counts.values())
            distinct_skills = len(skill_counts)
            if occ_count == distinct_skills:
                size_str = f"{occ_count} skill(s)"
            else:
                size_str = (
                    f"{occ_count} occurrences across {distinct_skills} skill(s)"
                )
            print(f"    variant {label} ({size_str}):")
            for sid, n in sorted(skill_counts.items()):
                suffix = f"  (x{n})" if n > 1 else ""
                print(f"        - {sid}{suffix}")

        if show_diff:
            print()
            print_variant_diffs(clusters)
        print()


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    if not SKILLS_DIR.exists():
        print(f"skills directory not found at {SKILLS_DIR}", file=sys.stderr)
        return 1

    # --diff and --drift are body-report features; either one implies --bodies.
    bodies = args.bodies or args.diff or args.drift

    if args.bucket == "all":
        roots = [SKILLS_DIR]
    else:
        roots = [SKILLS_DIR / args.bucket]
        if not roots[0].exists():
            print(f"bucket directory not found at {roots[0]}", file=sys.stderr)
            return 1

    skill_files: list[Path] = []
    for root in roots:
        skill_files.extend(root.rglob("SKILL.md"))
    skill_files.sort()

    if not skill_files:
        print("No SKILL.md files found.", file=sys.stderr)
        return 1

    if args.min_count is None:
        min_count = 2 if bodies else 1
    else:
        min_count = args.min_count

    min_similarity = (
        args.min_similarity
        if args.min_similarity is not None
        else (DRIFT_SIMILARITY_FLOOR if args.drift else 0.0)
    )
    max_similarity = (
        args.max_similarity if args.max_similarity is not None else 1.01
    )
    sort_by = args.sort if args.sort is not None else ("drift" if args.drift else "count")

    total_counts, per_skill, occurrences = collect(skill_files)

    if bodies:
        print_bodies_report(
            total_counts=total_counts,
            per_skill=per_skill,
            occurrences=occurrences,
            min_count=min_count,
            total_skills=len(skill_files),
            min_similarity=min_similarity,
            max_similarity=max_similarity,
            drift_only=args.drift,
            show_diff=args.diff,
            sort_by=sort_by,
        )
    else:
        print_ranking_report(
            total_counts=total_counts,
            per_skill=per_skill,
            min_count=min_count,
            show_skills=not args.no_skills,
            total_skills=len(skill_files),
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

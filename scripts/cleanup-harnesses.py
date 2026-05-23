#!/usr/bin/env python3
"""
Per-harness skills cleanup.

For every harness supported by skills.sh, check whether its skills directory
exists in the home folder. For each one that exists:

  - list what's inside,
  - if the folder is empty (or contains only empty subfolders), ask once,
  - otherwise (has real content), ask twice.

Harnesses with no skills directory are listed at the end so you can see
the full picture. Symlinks are never followed.

Source of the path map: github.com/vercel-labs/skills (the skills CLI itself).
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path


def xdg_config_home() -> Path:
    val = os.environ.get("XDG_CONFIG_HOME")
    return Path(val).expanduser() if val else Path.home() / ".config"


HOME = Path.home()
XDG = xdg_config_home()

# (display name, absolute skills directory)
# Where multiple harnesses share the same dir, they're grouped on one row.
HARNESSES: list[tuple[str, Path]] = [
    ("AdaL",                                HOME / ".adal" / "skills"),
    ("Aider Desk",                          HOME / ".aider-desk" / "skills"),
    # ("Amp / Kimi CLI / Replit / Universal", XDG / "agents" / "skills"),  # kept — never delete
    ("Antigravity",                         HOME / ".gemini" / "antigravity" / "skills"),
    ("Augment",                             HOME / ".augment" / "skills"),
    ("Bob",                                 HOME / ".bob" / "skills"),
    # ("Claude Code",                         HOME / ".claude" / "skills"),  # kept — never delete
    # ("Cline / Dexto / Warp",                HOME / ".agents" / "skills"),
    ("Code Studio",                         HOME / ".codestudio" / "skills"),
    ("CodeArts Agent",                      HOME / ".codeartsdoer" / "skills"),
    ("CodeBuddy",                           HOME / ".codebuddy" / "skills"),
    ("Codemaker",                           HOME / ".codemaker" / "skills"),
    # ("Codex",                               HOME / ".codex" / "skills"),  # kept — never delete
    ("Command Code",                        HOME / ".commandcode" / "skills"),
    ("Continue",                            HOME / ".continue" / "skills"),
    ("Cortex Code (Snowflake)",             HOME / ".snowflake" / "cortex" / "skills"),
    ("Crush",                               XDG / "crush" / "skills"),
    # ("Cursor",                              HOME / ".cursor" / "skills"),  # kept — never delete
    ("Deep Agents",                         HOME / ".deepagents" / "agent" / "skills"),
    ("Devin for Terminal",                  XDG / "devin" / "skills"),
    ("Droid",                               HOME / ".factory" / "skills"),
    ("Firebender",                          HOME / ".firebender" / "skills"),
    ("ForgeCode",                           HOME / ".forge" / "skills"),
    ("Gemini CLI",                          HOME / ".gemini" / "skills"),
    ("GitHub Copilot",                      HOME / ".copilot" / "skills"),
    ("Goose",                               XDG / "goose" / "skills"),
    ("Hermes Agent",                        HOME / ".hermes" / "skills"),
    ("iFlow CLI",                           HOME / ".iflow" / "skills"),
    ("Junie",                               HOME / ".junie" / "skills"),
    ("Kilo Code",                           HOME / ".kilocode" / "skills"),
    ("Kiro CLI",                            HOME / ".kiro" / "skills"),
    ("Kode",                                HOME / ".kode" / "skills"),
    ("MCPJam",                              HOME / ".mcpjam" / "skills"),
    ("Mistral Vibe",                        HOME / ".vibe" / "skills"),
    ("Mux",                                 HOME / ".mux" / "skills"),
    ("Neovate",                             HOME / ".neovate" / "skills"),
    ("OpenClaw",                            HOME / ".openclaw" / "skills"),
    ("OpenCode",                            XDG / "opencode" / "skills"),
    ("OpenHands",                           HOME / ".openhands" / "skills"),
    ("Pi",                                  HOME / ".pi" / "agent" / "skills"),
    ("Pochi",                               HOME / ".pochi" / "skills"),
    ("Qoder",                               HOME / ".qoder" / "skills"),
    ("Qwen Code",                           HOME / ".qwen" / "skills"),
    ("Roo Code",                            HOME / ".roo" / "skills"),
    ("Rovo Dev",                            HOME / ".rovodev" / "skills"),
    ("Tabnine CLI",                         HOME / ".tabnine" / "agent" / "skills"),
    ("Trae",                                HOME / ".trae" / "skills"),
    ("Trae CN",                             HOME / ".trae-cn" / "skills"),
    ("Windsurf",                            HOME / ".codeium" / "windsurf" / "skills"),
    ("Zencoder",                            HOME / ".zencoder" / "skills"),
]


# ---------- inspection helpers (read-only) ----------

def is_effectively_empty(path: Path) -> tuple[bool, bool]:
    """Return (is_effectively_empty, is_directly_empty).
    Treats files and symlinks as real content. Does not follow symlinks.
    """
    try:
        entries = list(os.scandir(path))
    except (PermissionError, OSError):
        return False, False
    if not entries:
        return True, True
    for e in entries:
        try:
            if e.is_symlink():
                return False, False
            if not e.is_dir(follow_symlinks=False):
                return False, False
            sub_eff, _ = is_effectively_empty(Path(e.path))
            if not sub_eff:
                return False, False
        except OSError:
            return False, False
    return True, False


def list_contents(path: Path) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    try:
        for e in sorted(os.scandir(path), key=lambda x: x.name):
            try:
                if e.is_symlink():
                    kind = "link"
                elif e.is_dir(follow_symlinks=False):
                    kind = "dir"
                elif e.is_file(follow_symlinks=False):
                    kind = "file"
                else:
                    kind = "other"
            except OSError:
                kind = "?"
            out.append((e.name, kind))
    except (PermissionError, OSError):
        pass
    return out


def count_contents(path: Path) -> tuple[int, int]:
    """Recursive (file_count, dir_count). Symlinks not followed."""
    fc = dc = 0
    for _root, dirs, files in os.walk(path, followlinks=False, onerror=lambda e: None):
        dc += len(dirs)
        fc += len(files)
    return fc, dc


# ---------- prompts ----------

def prompt(msg: str) -> str:
    try:
        return input(msg).strip()
    except EOFError:
        return "q"


def ask_yes_no(msg: str) -> "bool | None":
    while True:
        ans = prompt(msg).lower()
        if ans in ("y", "yes"):
            return True
        if ans in ("", "n", "no"):
            return False
        if ans in ("q", "quit", "exit"):
            return None
        print("  please answer y, n, or q.")


# ---------- deletion ----------

def delete(path: Path) -> "tuple[bool, str | None]":
    try:
        shutil.rmtree(path)
        return True, None
    except OSError as e:
        return False, str(e)


# ---------- main ----------

def main() -> int:
    if not sys.stdin.isatty():
        print("error: this script needs an interactive terminal", file=sys.stderr)
        return 1

    print("skills.sh harness install locations under your home directory")
    print("(read-only listing; delete prompts are per-harness; no symlinks followed)\n")

    seen: set[Path] = set()
    present: list[tuple[str, Path]] = []
    absent: list[tuple[str, Path]] = []
    for name, skills_dir in HARNESSES:
        if skills_dir in seen:
            continue
        seen.add(skills_dir)
        harness_root = skills_dir.parent
        if (
            harness_root.is_symlink()
            or not harness_root.exists()
            or not harness_root.is_dir()
        ):
            absent.append((name, skills_dir))
            continue
        # The harness root is on disk. We want to act if EITHER the harness
        # root itself is effectively empty (delete the whole harness folder)
        # OR a skills dir is present (delete just that, with the usual rules).
        h_eff, _ = is_effectively_empty(harness_root)
        has_skills = (
            skills_dir.exists() and skills_dir.is_dir() and not skills_dir.is_symlink()
        )
        if h_eff or has_skills:
            present.append((name, skills_dir))
        else:
            absent.append((name, skills_dir))

    print(f"present on disk: {len(present)}   nothing to clean: {len(absent)}\n")

    removed: list[tuple[str, Path]] = []
    kept: list[tuple[str, Path]] = []
    failed: list[tuple[str, Path, str]] = []
    quit_early = False

    for idx, (name, skills_dir) in enumerate(present, 1):
        harness_root = skills_dir.parent
        print("─" * 72)
        print(f"[{idx}/{len(present)}] {name}")
        print(f"  harness folder: {harness_root}")
        print(f"  skills folder:  {skills_dir}")

        h_eff, h_dir_empty = is_effectively_empty(harness_root)

        # Case A: the entire harness folder is effectively empty -> offer to
        # delete the whole harness folder (single confirmation).
        if h_eff:
            contents = list_contents(harness_root)
            if h_dir_empty:
                print("  state: harness folder is empty (0 entries)")
            else:
                print(
                    f"  state: harness folder contains only empty subfolders "
                    f"({len(contents)} top-level entries)"
                )
                for n, k in contents[:25]:
                    print(f"    [{k}] {n}")
                if len(contents) > 25:
                    print(f"    ... +{len(contents) - 25} more")
            ans = ask_yes_no(f"  delete entire harness folder {harness_root}? [y/N/q] ")
            if ans is None:
                print("  aborting — remaining harnesses left untouched.")
                quit_early = True
                break
            if ans is False:
                print("  kept.")
                kept.append((name, harness_root))
                continue
            ok, err = delete(harness_root)
            if ok:
                print(f"  deleted {harness_root}")
                removed.append((name, harness_root))
            else:
                print(f"  failed: {err}")
                failed.append((name, harness_root, err))
            continue

        # Case B: harness folder has real content. Operate on the skills dir.
        if not (skills_dir.exists() and skills_dir.is_dir() and not skills_dir.is_symlink()):
            # Shouldn't happen given the present/absent split, but guard anyway.
            print("  state: harness folder has other content; no skills dir to clean.")
            kept.append((name, harness_root))
            continue

        contents = list_contents(skills_dir)
        s_eff, s_dir_empty = is_effectively_empty(skills_dir)

        if s_dir_empty:
            print("  state: skills folder is empty (0 entries)")
        elif s_eff:
            print(
                f"  state: skills folder contains only empty subfolders "
                f"({len(contents)} top-level entries)"
            )
            for n, k in contents[:25]:
                print(f"    [{k}] {n}")
            if len(contents) > 25:
                print(f"    ... +{len(contents) - 25} more")
        else:
            fc, dc = count_contents(skills_dir)
            print(
                f"  state: skills folder NOT empty — {len(contents)} top-level entries, "
                f"{dc} dirs + {fc} files total"
            )
            for n, k in contents[:25]:
                print(f"    [{k}] {n}")
            if len(contents) > 25:
                print(f"    ... +{len(contents) - 25} more")

        if s_eff:
            ans = ask_yes_no(f"  delete skills folder {skills_dir}? [y/N/q] ")
        else:
            ans = ask_yes_no(
                f"  delete skills folder {skills_dir} (has REAL content)? [y/N/q] "
            )
            if ans is True:
                ans = ask_yes_no(
                    f"  CONFIRM: really delete {skills_dir} and ALL contents? [y/N/q] "
                )

        if ans is None:
            print("  aborting — remaining harnesses left untouched.")
            quit_early = True
            break
        if ans is False:
            print("  kept.")
            kept.append((name, skills_dir))
            continue

        ok, err = delete(skills_dir)
        if ok:
            print(f"  deleted {skills_dir}")
            removed.append((name, skills_dir))
        else:
            print(f"  failed: {err}")
            failed.append((name, skills_dir, err))
            continue

        # After deleting skills_dir, see if the harness folder is now empty.
        h_eff2, _ = is_effectively_empty(harness_root)
        if h_eff2:
            print(f"  → harness folder {harness_root} is now effectively empty.")
            ans2 = ask_yes_no(
                f"  also delete entire harness folder {harness_root}? [y/N/q] "
            )
            if ans2 is None:
                print("  aborting — remaining harnesses left untouched.")
                quit_early = True
                break
            if ans2 is True:
                ok2, err2 = delete(harness_root)
                if ok2:
                    print(f"  deleted {harness_root}")
                    removed.append((f"{name} (harness root)", harness_root))
                else:
                    print(f"  failed: {err2}")
                    failed.append((name, harness_root, err2))

    print()
    print("=" * 72)
    print(f"summary: removed {len(removed)} • kept {len(kept)} • failed {len(failed)}"
          + (" • aborted early" if quit_early else ""))

    if removed:
        print("\nremoved:")
        for n, p in removed:
            print(f"  - {n}: {p}")
    if kept:
        print("\nkept:")
        for n, p in kept:
            print(f"  - {n}: {p}")
    if failed:
        print("\nfailed:")
        for n, p, err in failed:
            print(f"  - {n}: {p} ({err})")

    if absent:
        print(f"\nnothing to clean ({len(absent)}):")
        for n, p in absent:
            print(f"  - {n}: {p}")

    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())

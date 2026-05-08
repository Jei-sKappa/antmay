#!/usr/bin/env python3
"""Copy stdin or a file's contents to the macOS clipboard.

Usage:
    copy-to-clipboard.py <file>
    cat <file> | copy-to-clipboard.py
"""

import subprocess
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) == 2:
        path = Path(sys.argv[1])
        if not path.is_file():
            sys.exit(f"error: file not found: {path}")
        text = path.read_text()
    elif not sys.stdin.isatty():
        text = sys.stdin.read()
    else:
        sys.exit("usage: copy-to-clipboard.py <file>  (or pipe text via stdin)")

    subprocess.run(["pbcopy"], input=text, text=True, check=True)
    print(f"copied {len(text)} characters to clipboard")


if __name__ == "__main__":
    main()

"""
Emit manifest.csv rows for every PNG under Social/Highlights (excluding tools/ and _out/).

Usage (repo root):
  python Social/Highlights/tools/scan_templates.py > Social/Highlights/tools/manifest.csv

Edit the screenshot column to your capture paths, calibrate corners, then run render.py.
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
HIGHLIGHTS = TOOLS.parent
REPO = HIGHLIGHTS.parent.parent
SKIP_DIR = {"tools", "_out", "screenshots"}


def should_skip(p: Path) -> bool:
    try:
        rel = p.relative_to(HIGHLIGHTS)
    except ValueError:
        return True
    for part in rel.parts[:-1]:
        if part in SKIP_DIR:
            return True
    return False


def main() -> None:
    paths: list[Path] = []
    for pattern in ("*.PNG", "*.png"):
        paths.extend(HIGHLIGHTS.rglob(pattern))
    paths = sorted({p.resolve() for p in paths if not should_skip(p)})

    w = csv.DictWriter(sys.stdout, fieldnames=["template", "screenshot", "preset"], lineterminator="\n")
    w.writeheader()
    for p in paths:
        rel = p.relative_to(REPO)
        w.writerow(
            {
                "template": str(rel).replace("\\", "/"),
                "screenshot": "PUT_PATH_TO_MATCHING_SCREENSHOT.png",
                "preset": "",
            }
        )


if __name__ == "__main__":
    main()

"""
Click 4 corners on a template (TL, TR, BR, BL) and append normalized coords to corners.json.

Usage (from repo root or any cwd):
  python Social/Highlights/tools/calibrate.py "Social/Highlights/H1/1019268E-E9B8-4B09-944D-81B7AB84E85B.PNG"

After 4 clicks the window closes and corners are saved. Re-run for each template (or reuse
the same preset_id for templates that share the exact same angle and canvas size).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageTk
    import tkinter as tk
except ImportError as e:
    print("Install deps: pip install -r Social/Highlights/tools/requirements.txt", file=sys.stderr)
    raise SystemExit(1) from e


def load_corners(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_corners(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description="Pick 4 screen corners (TL, TR, BR, BL) on a highlight template.")
    ap.add_argument("template", type=Path, help="Path to PNG/JPG template")
    ap.add_argument(
        "--corners-file",
        type=Path,
        default=Path(__file__).resolve().parent / "corners.json",
        help="JSON file to read/write",
    )
    ap.add_argument(
        "--key",
        type=str,
        default=None,
        help="Key in corners.json (default: path relative to Social/Highlights/)",
    )
    args = ap.parse_args()

    template = args.template.resolve()
    if not template.is_file():
        raise SystemExit(f"Not a file: {template}")

    img = Image.open(template).convert("RGBA")
    w, h = img.size

    # Fit on screen (max 900px height) for comfortable clicking
    max_h = 900
    scale = min(1.0, max_h / h)
    disp_w, disp_h = int(w * scale), int(h * scale)
    disp = img.resize((disp_w, disp_h), Image.Resampling.LANCZOS)

    root = tk.Tk()
    root.title(f"Calibrate: {template.name} — click TL, TR, BR, BL")
    photo = ImageTk.PhotoImage(disp)
    label = tk.Label(root, image=photo)
    label.pack()

    clicks: list[tuple[float, float]] = []

    def on_click(event: tk.Event) -> None:
        # map display coords back to image pixel coords
        ix = event.x / scale
        iy = event.y / scale
        clicks.append((ix, iy))
        root.title(f"{len(clicks)}/4 — TL, TR, BR, BL")
        if len(clicks) >= 4:
            root.destroy()

    label.bind("<Button-1>", on_click)
    root.mainloop()

    if len(clicks) != 4:
        raise SystemExit("Cancelled: need exactly 4 clicks.")

    corners_fr = [[x / w, y / h] for x, y in clicks]

    highlights_root = template.parent
    while highlights_root.parent != highlights_root and highlights_root.name != "Highlights":
        highlights_root = highlights_root.parent
    if highlights_root.name != "Highlights":
        highlights_root = template.parent

    try:
        rel = template.resolve().relative_to(highlights_root.resolve())
        key = args.key or str(rel).replace("\\", "/")
    except ValueError:
        key = args.key or template.name

    data = load_corners(args.corners_file)
    data[key] = {
        "template": str(template),
        "size": [w, h],
        "corners_fr": corners_fr,
        "order": ["tl", "tr", "br", "bl"],
    }
    save_corners(args.corners_file, data)
    print(f"Saved key {key!r} to {args.corners_file}")
    print(json.dumps(corners_fr, indent=2))


if __name__ == "__main__":
    main()

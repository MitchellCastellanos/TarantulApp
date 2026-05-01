"""
Composite app screenshots onto Instagram highlight templates using a perspective warp.

Requires corners.json (from calibrate.py) and manifest.csv.

Usage:
  python Social/Highlights/tools/render.py --manifest Social/Highlights/tools/manifest.csv

Optional:
  --out-dir Social/Highlights/_out
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def load_corners(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"Missing corners file: {path}. Run calibrate.py on each template first.")
    return json.loads(path.read_text(encoding="utf-8"))


def corners_to_pixels(corners_fr: list[list[float]], w: int, h: int) -> np.ndarray:
    pts = []
    for fx, fy in corners_fr:
        pts.append([fx * w, fy * h])
    return np.array(pts, dtype=np.float32)


def composite(
    template_bgr: np.ndarray,
    screenshot_bgr: np.ndarray,
    dst_quad: np.ndarray,
) -> np.ndarray:
    """Warp screenshot (full rectangle) into dst_quad on canvas same size as template; blend over template."""
    th, tw = template_bgr.shape[:2]
    sh, sw = screenshot_bgr.shape[:2]

    src = np.float32([[0, 0], [sw, 0], [sw, sh], [0, sh]])
    dst = dst_quad.astype(np.float32)
    m = cv2.getPerspectiveTransform(src, dst)

    warped = cv2.warpPerspective(screenshot_bgr, m, (tw, th), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=0)

    white = np.full((sh, sw), 255, dtype=np.uint8)
    mask = cv2.warpPerspective(white, m, (tw, th), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    mask_f = mask.astype(np.float32) / 255.0
    mask_f = cv2.GaussianBlur(mask_f, (0, 0), sigmaX=0.6, sigmaY=0.6)[..., None]

    out = template_bgr.astype(np.float32)
    warped_f = warped.astype(np.float32)
    blended = out * (1.0 - mask_f) + warped_f * mask_f
    return np.clip(blended, 0, 255).astype(np.uint8)


def pil_to_bgr(img: Image.Image) -> np.ndarray:
    rgb = np.array(img.convert("RGB"))
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def bgr_to_pil(bgr: np.ndarray) -> Image.Image:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def resolve_corner_key(row_key: str, corners: dict, template_path: Path, highlights_root: Path) -> tuple[str, list[list[float]]]:
    if row_key and row_key in corners:
        entry = corners[row_key]
        return row_key, entry["corners_fr"]

    # try relative path as stored by calibrate
    try:
        rel = template_path.resolve().relative_to(highlights_root.resolve())
        k = str(rel).replace("\\", "/")
        if k in corners:
            return k, corners[k]["corners_fr"]
    except ValueError:
        pass

    # try filename only
    name = template_path.name
    for k, v in corners.items():
        if k.endswith(name) or Path(v.get("template", "")).name == name:
            return k, v["corners_fr"]

    raise KeyError(f"No corners for template {template_path}. Calibrate it or set preset column in manifest.")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", type=Path, required=True, help="CSV: template,screenshot[,preset]")
    ap.add_argument(
        "--corners-file",
        type=Path,
        default=Path(__file__).resolve().parent / "corners.json",
    )
    ap.add_argument(
        "--highlights-root",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
        help="Folder that contains H1, H2, ... (default: Social/Highlights)",
    )
    ap.add_argument("--out-dir", type=Path, default=Path(__file__).resolve().parent.parent / "_out")
    args = ap.parse_args()

    corners = load_corners(args.corners_file)
    highlights_root = args.highlights_root.resolve()
    out_root = args.out_dir.resolve()
    out_root.mkdir(parents=True, exist_ok=True)

    with args.manifest.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames or "template" not in reader.fieldnames or "screenshot" not in reader.fieldnames:
            raise SystemExit("manifest CSV must have headers: template,screenshot[,preset]")
        rows = list(reader)

    # __file__ = .../Social/Highlights/tools/render.py -> repo = .../tarantulapp
    repo = Path(__file__).resolve().parent.parent.parent.parent

    for i, row in enumerate(rows):
        tpl = Path(row["template"].strip())
        shot = Path(row["screenshot"].strip())
        preset = (row.get("preset") or "").strip()

        if not tpl.is_absolute():
            tpl = (repo / tpl).resolve()
        if not shot.is_absolute():
            shot = (repo / shot).resolve()

        if not tpl.is_file():
            print(f"[skip] missing template: {tpl}", file=sys.stderr)
            continue
        if not shot.is_file():
            print(f"[skip] missing screenshot: {shot}", file=sys.stderr)
            continue

        try:
            _, corners_fr = resolve_corner_key(preset, corners, tpl, highlights_root)
        except KeyError as e:
            print(f"[skip] {tpl.name}: {e}", file=sys.stderr)
            continue

        tpl_img = Image.open(tpl)
        w, h = tpl_img.size
        dst_quad = corners_to_pixels(corners_fr, w, h)

        tpl_bgr = pil_to_bgr(tpl_img)
        shot_bgr = pil_to_bgr(Image.open(shot))
        out_bgr = composite(tpl_bgr, shot_bgr, dst_quad)

        try:
            rel = tpl.relative_to(highlights_root)
        except ValueError:
            rel = Path(tpl.name)
        out_path = out_root / rel
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_img = bgr_to_pil(out_bgr)
        if out_path.suffix.lower() == ".png":
            out_img.save(out_path, compress_level=3)
        else:
            out_img.save(out_path, quality=95)
        print(f"[ok] {out_path}")

    print(f"Done. Outputs under {out_root}")


if __name__ == "__main__":
    main()

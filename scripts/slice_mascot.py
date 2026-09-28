"""Slice the mascot contact sheet into transparent per-pose PNGs.

Border multi-seed flood-fill removes the grey studio background; interior
shadows (not connected to the border) are preserved. Autocrops to content.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / ".context/attachments/Dsquei/image.png"
OUT = ROOT / "public/mascot"
OUT.mkdir(parents=True, exist_ok=True)

# (name, x0, y0, x1, y1) — top row even; bottom row custom (whiteboard is wide)
TILES = [
    ("hero", 0, 0, 384, 512),
    ("wave", 384, 0, 768, 512),
    ("laptop", 768, 0, 1152, 512),
    ("xray", 1152, 0, 1536, 512),
    ("point", 0, 525, 525, 1024),
    ("thumbsup", 545, 525, 800, 1024),
    ("peek", 820, 525, 1115, 1024),
    ("cheer", 1135, 525, 1536, 1024),
]

KEY = (255, 0, 255)


def remove_bg(tile: Image.Image, thresh: int = 46) -> Image.Image:
    rgb = tile.convert("RGB")
    w, h = rgb.size
    seeds = []
    step = 16
    for x in range(0, w, step):
        seeds += [(x, 0), (x, h - 1)]
    for y in range(0, h, step):
        seeds += [(0, y), (w - 1, y)]
    for s in seeds:
        try:
            ImageDraw.floodfill(rgb, s, KEY, thresh=thresh)
        except Exception:
            pass
    arr = np.array(rgb)
    mask = (arr[:, :, 0] == KEY[0]) & (arr[:, :, 1] == KEY[1]) & (arr[:, :, 2] == KEY[2])
    rgba = np.array(tile.convert("RGBA"))
    rgba[mask, 3] = 0
    out = Image.fromarray(rgba, "RGBA")
    # drop tiny stray fragments: keep only reasonably opaque content for bbox
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def main() -> None:
    sheet = Image.open(SRC).convert("RGBA")
    for name, x0, y0, x1, y1 in TILES:
        tile = sheet.crop((x0, y0, x1, y1))
        cleaned = remove_bg(tile)
        cleaned.save(OUT / f"{name}.png")
        print(f"  {name}.png  {cleaned.size}")
    print("done ->", OUT)


if __name__ == "__main__":
    main()

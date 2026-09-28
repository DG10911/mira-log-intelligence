"""High-quality mascot slicing: rembg (u2net) matte on the full sheet, then
crop with tuned, gap-separated boxes (no neighbor bleed), autocrop to content.
"""
from pathlib import Path

from PIL import Image
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / ".context/attachments/Dsquei/image.png"
OUT = ROOT / "public/mascot"
OUT.mkdir(parents=True, exist_ok=True)

# Tuned boxes with gaps between neighbors so no adjacent mascot bleeds in.
# (name, x0, y0, x1, y1)
TILES = [
    ("hero", 30, 10, 370, 512),
    ("wave", 395, 10, 745, 512),
    ("laptop", 775, 10, 1120, 512),
    ("xray", 1130, 10, 1536, 512),
    ("point", 10, 520, 545, 1020),      # mascot + whiteboard
    ("thumbsup", 545, 520, 790, 1020),
    ("peek", 815, 520, 1115, 1020),
    ("cheer", 1140, 520, 1536, 1020),
]


def autocrop(img: Image.Image, pad: int = 6) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad); y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


def main() -> None:
    print("Loading sheet + running rembg (u2net) on full sheet …")
    sheet = Image.open(SRC).convert("RGBA")
    session = new_session("u2net")
    cut = remove(sheet, session=session, post_process_mask=True)  # transparent bg
    cut.save(OUT / "_sheet_cut.png")
    print("  matte done")
    for name, x0, y0, x1, y1 in TILES:
        tile = cut.crop((x0, y0, x1, y1))
        cleaned = autocrop(tile)
        cleaned.save(OUT / f"{name}.png")
        print(f"  {name}.png  {cleaned.size}")
    print("done ->", OUT)


if __name__ == "__main__":
    main()

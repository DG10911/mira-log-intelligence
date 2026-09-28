"""High-quality mascot slicing: crop each pose from the sheet, then run rembg
(u2net) on each SINGLE-subject tile (what it's good at), autocrop to content.
"""
from pathlib import Path

from PIL import Image
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / ".context/attachments/Dsquei/image.png"
OUT = ROOT / "public/mascot"
OUT.mkdir(parents=True, exist_ok=True)

# Tuned boxes with gaps so no adjacent mascot bleeds in. (name, x0,y0,x1,y1)
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


def autocrop(img: Image.Image, pad: int = 8) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))


def main() -> None:
    print("rembg per-tile (u2net, single subject each) …")
    sheet = Image.open(SRC).convert("RGBA")
    session = new_session("u2net")
    for name, x0, y0, x1, y1 in TILES:
        tile = sheet.crop((x0, y0, x1, y1))
        cut = remove(tile, session=session, post_process_mask=True)
        cleaned = autocrop(cut)
        cleaned.save(OUT / f"{name}.png")
        print(f"  {name}.png  {cleaned.size}")
    (OUT / "_sheet_cut.png").unlink(missing_ok=True)
    print("done ->", OUT)


if __name__ == "__main__":
    main()

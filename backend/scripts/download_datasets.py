#!/usr/bin/env python3
"""Download the full LogHub dataset collection to the KIOXIA SSD.

- Reads the live Zenodo manifest (record 8196385) for exact URLs + md5 checksums.
- Resumable downloads (curl -C -), md5-verified, then extracted.
- Safe to re-run: verified files are skipped.

Usage:
    python3 download_datasets.py            # download + verify + extract all
    python3 download_datasets.py --only HDFS_v1,BGL
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import tarfile
import urllib.request
import zipfile
from pathlib import Path

RECORD = "8196385"
API = f"https://zenodo.org/api/records/{RECORD}"
ROOT = Path("/Volumes/KIOXIA/acentra-logintel/datasets")
RAW = ROOT / "raw"
EXTRACTED = ROOT / "extracted"


def log(msg: str) -> None:
    print(msg, flush=True)


def md5(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def manifest() -> list[dict]:
    log(f"fetching manifest {API}")
    with urllib.request.urlopen(API, timeout=60) as r:
        data = json.load(r)
    out = []
    for f in data["files"]:
        cs = f.get("checksum", "")  # "md5:...."
        out.append(
            {
                "key": f["key"],
                "url": f["links"]["self"],
                "size": f.get("size", 0),
                "md5": cs.split(":", 1)[1] if ":" in cs else "",
            }
        )
    return out


def download(item: dict) -> Path:
    dest = RAW / item["key"]
    if dest.exists() and item["md5"] and md5(dest) == item["md5"]:
        log(f"  [skip] {item['key']} already verified")
        return dest
    log(f"  [get ] {item['key']} ({item['size']/1e6:.1f} MB)")
    # curl with resume + retry
    subprocess.run(
        [
            "curl", "-L", "--fail", "--retry", "5", "--retry-delay", "3",
            "-C", "-", "-o", str(dest), item["url"],
        ],
        check=True,
    )
    if item["md5"]:
        got = md5(dest)
        if got != item["md5"]:
            raise SystemExit(f"CHECKSUM MISMATCH {item['key']}: {got} != {item['md5']}")
        log(f"  [ok  ] {item['key']} md5 verified")
    return dest


def extract(archive: Path) -> None:
    name = archive.name
    out = EXTRACTED / name.split(".")[0]
    if out.exists() and any(out.iterdir()):
        log(f"  [skip] extract {name} (exists)")
        return
    out.mkdir(parents=True, exist_ok=True)
    log(f"  [xtr ] {name} -> {out}")
    if name.endswith(".zip"):
        with zipfile.ZipFile(archive) as z:
            z.extractall(out)
    elif name.endswith((".tar.gz", ".tgz")):
        with tarfile.open(archive, "r:gz") as t:
            t.extractall(out)  # noqa: S202 (trusted source)
    else:
        log(f"  [warn] unknown archive type {name}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="comma list of dataset keys (prefix match)")
    ap.add_argument("--no-extract", action="store_true")
    args = ap.parse_args()

    RAW.mkdir(parents=True, exist_ok=True)
    EXTRACTED.mkdir(parents=True, exist_ok=True)

    items = manifest()
    if args.only:
        keys = [k.strip().lower() for k in args.only.split(",")]
        items = [i for i in items if any(i["key"].lower().startswith(k) for k in keys)]
    # smallest first so the labeled/quick ones land early
    items.sort(key=lambda i: i["size"])

    total = sum(i["size"] for i in items) / 1e9
    log(f"downloading {len(items)} datasets ({total:.2f} GB) to {RAW}")

    for it in items:
        try:
            arc = download(it)
            if not args.no_extract:
                extract(arc)
        except Exception as e:  # keep going; report at end
            log(f"  [FAIL] {it['key']}: {e}")

    log("DONE.")
    log("raw:       " + str(RAW))
    log("extracted: " + str(EXTRACTED))


if __name__ == "__main__":
    main()

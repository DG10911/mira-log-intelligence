#!/usr/bin/env python3
"""Offline detector evaluation against ground-truth labels (BGL).

Proves the detection engine works on REAL labeled production logs, not just
synthetic traffic. Groups BGL lines into fixed windows, derives the window
feature vector, trains the adaptive baseline on early (mostly-normal) windows,
then reports precision / recall / F1 for the combined detector bank.

BGL line format: first whitespace token is "-" (normal) or an alert category
(anomaly). We label a WINDOW anomalous if it contains >=1 alert line.

Usage:
    uv run python scripts/evaluate_detectors.py \
        --path /Volumes/KIOXIA/acentra-logintel/datasets/extracted/BGL/BGL.log \
        --window 100 --limit 400000
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# make `app` importable when run from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.detection.baseline import BaselineEngine  # noqa: E402
from app.detection.cusum import CusumEngine  # noqa: E402
from app.detection.detectors import MONITORED, run_statistical  # noqa: E402

LEVELS_ERROR = {"ERROR", "FATAL", "SEVERE", "CRITICAL"}
LEVELS_WARN = {"WARN", "WARNING"}


def bgl_windows(path: Path, window: int, limit: int):
    """Yield (feature_dict, is_anomaly) per window of `window` lines."""
    buf_err = buf_warn = buf_n = 0
    buf_anom = False
    seen = 0
    with path.open("r", errors="replace") as f:
        for line in f:
            seen += 1
            if limit and seen > limit:
                break
            parts = line.split()
            if not parts:
                continue
            label = parts[0]
            is_anom_line = label != "-"
            up = line.upper()
            is_err = any(f" {lv} " in f" {up} " for lv in LEVELS_ERROR)
            is_warn = any(f" {lv} " in f" {up} " for lv in LEVELS_WARN)
            buf_n += 1
            buf_err += int(is_err)
            buf_warn += int(is_warn)
            buf_anom = buf_anom or is_anom_line
            if buf_n >= window:
                yield (
                    {
                        "error_rate": buf_err / buf_n,
                        "warn_rate": buf_warn / buf_n,
                        "event_rate": buf_n,
                        "rate_5xx": 0.0,
                        "rate_4xx": 0.0,
                        "latency_p95": 0.0,
                        "failed_logins": 0.0,
                        "top_ip_share": 0.0,
                        "endpoint_concentration": 0.0,
                        "novel_template_count": 0.0,
                    },
                    buf_anom,
                )
                buf_err = buf_warn = buf_n = 0
                buf_anom = False


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--path", required=True)
    ap.add_argument("--window", type=int, default=100)
    ap.add_argument("--limit", type=int, default=400000)
    ap.add_argument("--warmup", type=int, default=200, help="windows used only to train baseline")
    args = ap.parse_args()

    path = Path(args.path)
    if not path.exists():
        raise SystemExit(f"not found: {path} (has BGL finished downloading?)")

    baseline = BaselineEngine(MONITORED, min_samples=30)
    cusum = CusumEngine(h=5.0)

    tp = fp = tn = fn = 0
    total = anomalous = 0

    class _Snap:
        def __init__(self, d):
            self._d = d
        def as_dict(self):
            return self._d

    for i, (feat, is_anom) in enumerate(bgl_windows(path, args.window, args.limit)):
        total += 1
        anomalous += int(is_anom)
        snap = _Snap(feat)
        if i < args.warmup:
            baseline.observe(feat)  # train on early stream
            continue
        dets = run_statistical(snap, baseline, critical_sigma=8.0)
        dets += cusum.update(snap, baseline)
        predicted = len(dets) > 0
        # update baseline after prediction, guarding contaminating features
        baseline.observe(feat, anomalous_features={d.feature for d in dets})
        if predicted and is_anom:
            tp += 1
        elif predicted and not is_anom:
            fp += 1
        elif not predicted and is_anom:
            fn += 1
        else:
            tn += 1

    prec = tp / (tp + fp) if (tp + fp) else 0.0
    rec = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0

    print("=" * 56)
    print(f"Dataset      : {path.name}")
    print(f"Windows      : {total}  (size={args.window} lines, warmup={args.warmup})")
    print(f"Anomalous    : {anomalous} ({100*anomalous/max(total,1):.1f}%)")
    print("-" * 56)
    print(f"TP={tp}  FP={fp}  TN={tn}  FN={fn}")
    print(f"Precision    : {prec:.3f}")
    print(f"Recall       : {rec:.3f}")
    print(f"F1           : {f1:.3f}")
    print("=" * 56)


if __name__ == "__main__":
    main()

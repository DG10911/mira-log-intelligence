#!/usr/bin/env python3
"""Controlled-injection accuracy benchmark for the REAL detector bank.

Runs the exact production path (normalize -> feature engine -> adaptive baseline
-> statistical + CUSUM detectors -> effect-size gate) over labeled windows with
known ground truth, and reports Precision / Recall / F1 / false-positive rate.

Also compares the effect-size gate ON vs OFF, quantifying the precision win.

Usage:
    uv run python scripts/accuracy_bench.py --trials 400 --lines 200
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.detection import detectors as det  # noqa: E402
from app.detection.baseline import BaselineEngine  # noqa: E402
from app.detection.cusum import CusumEngine  # noqa: E402
from app.detection.detectors import MONITORED, run_novel_template, run_statistical  # noqa: E402
from app.features.engine import compute  # noqa: E402
from app.features.windows import TimeWindow  # noqa: E402
from app.normalization.normalizer import normalize  # noqa: E402
from app.security.rules import evaluate as evaluate_security  # noqa: E402
from app.simulator.scenarios import generate  # noqa: E402

ATTACKS = ["BRUTE_FORCE", "CREDENTIAL_STUFFING", "API_ABUSE", "5XX_STORM",
           "LATENCY_DEGRADATION", "NOVEL_TEMPLATE", "COMBINED"]


def snapshot_from_lines(lines: list[str]):
    w = TimeWindow(30)
    t = time.time()
    for i, raw in enumerate(lines):
        ev = normalize(raw)
        if ev is None:
            continue
        w.add(t + i * 0.001, ev)
    return compute(w)


def fired(snap, baseline, cusum) -> bool:
    dets = run_statistical(snap, baseline, critical_sigma=8.0)
    dets += run_novel_template(snap, 8.0)
    dets += cusum.update(snap, baseline)
    sigs = evaluate_security(snap, [])
    return bool(dets or sigs)


def run(trials: int, lines: int, warmup: int, gate: bool, seed: int) -> dict:
    import random
    random.seed(seed)
    # toggle the effect-size gate by swapping the floors
    saved_effect, saved_rel = det.MIN_EFFECT, det.MIN_RELATIVE
    if not gate:
        det.MIN_EFFECT = dict.fromkeys(saved_effect, 0.0)
        det.MIN_RELATIVE = {}
    try:
        baseline = BaselineEngine(MONITORED, min_samples=25)
        cusum = CusumEngine(h=5.0)
        # warm-up on NORMAL traffic
        for _ in range(warmup):
            snap = snapshot_from_lines(generate("NORMAL", lines))
            baseline.observe(snap.as_dict())
        tp = fp = tn = fn = 0
        for _ in range(trials):
            is_attack = random.random() < 0.5
            scen = random.choice(ATTACKS) if is_attack else "NORMAL"
            snap = snapshot_from_lines(generate(scen, lines))
            pred = fired(snap, baseline, cusum)
            baseline.observe(snap.as_dict())  # keep learning on normal drift
            if pred and is_attack:
                tp += 1
            elif pred and not is_attack:
                fp += 1
            elif not pred and is_attack:
                fn += 1
            else:
                tn += 1
    finally:
        det.MIN_EFFECT, det.MIN_RELATIVE = saved_effect, saved_rel

    prec = tp / (tp + fp) if (tp + fp) else 0.0
    rec = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
    fpr = fp / (fp + tn) if (fp + tn) else 0.0
    return {"tp": tp, "fp": fp, "tn": tn, "fn": fn,
            "precision": prec, "recall": rec, "f1": f1, "fpr": fpr}


def show(title: str, r: dict) -> None:
    print(f"\n{title}")
    print(f"  TP={r['tp']} FP={r['fp']} TN={r['tn']} FN={r['fn']}")
    print(f"  Precision {r['precision']:.3f} | Recall {r['recall']:.3f} | "
          f"F1 {r['f1']:.3f} | FalsePosRate {r['fpr']:.3f}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=400)
    ap.add_argument("--lines", type=int, default=200)
    ap.add_argument("--warmup", type=int, default=40)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()

    print("=" * 60)
    print(f"Accuracy benchmark: {args.trials} labeled windows "
          f"({args.lines} lines each), warmup={args.warmup}")
    off = run(args.trials, args.lines, args.warmup, gate=False, seed=args.seed)
    on = run(args.trials, args.lines, args.warmup, gate=True, seed=args.seed)
    show("WITHOUT effect-size gate (baseline)", off)
    show("WITH effect-size gate (tuned)", on)
    print("\n" + "-" * 60)
    print(f"Precision: {off['precision']:.3f} -> {on['precision']:.3f}  "
          f"(false positives {off['fp']} -> {on['fp']})")
    print(f"F1:        {off['f1']:.3f} -> {on['f1']:.3f}")
    print("=" * 60)


if __name__ == "__main__":
    main()

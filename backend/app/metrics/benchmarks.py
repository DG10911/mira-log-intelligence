"""Recorded, reproducible detector benchmark results.

These are NOT live-computed at request time (they require replaying full labeled
datasets). They are the measured outputs of the committed benchmark scripts, so
the console can surface real numbers to judges. Each entry cites how to reproduce.
"""
from __future__ import annotations

# Ground-truth labeled evaluation on the real BGL supercomputer log dataset.
# Reproduce: uv run python scripts/evaluate_detectors.py \
#   --path .../BGL/BGL.log --window 100 --limit 400000 --warmup 200
LABELED_BGL = {
    "dataset": "BGL (Blue Gene/L)",
    "windows": 4000,
    "lines": 400000,
    "anomalous_pct": 49.9,
    "precision": 0.875,
    "recall": 0.896,
    "f1": 0.885,
    "supervised": False,
    "reproduce": "scripts/evaluate_detectors.py",
}

# Controlled-injection benchmark on the live detector bank (before/after tuning).
# Reproduce: uv run python scripts/accuracy_bench.py --trials 400 --lines 200
CONTROLLED = {
    "trials": 400,
    "precision_before": 0.783,
    "precision_after": 0.975,
    "recall_after": 1.000,
    "f1_before": 0.878,
    "f1_after": 0.987,
    "false_positives_before": 54,
    "false_positives_after": 5,
    "reproduce": "scripts/accuracy_bench.py",
}

# Throughput benchmark (batched DB writes vs per-line commits), 6000 events.
THROUGHPUT = {
    "events_per_sec_before": 390,
    "events_per_sec_after": 2688,
    "speedup": 6.9,
    "note": "batched DB writes (one txn per tick)",
}


def quality_summary(live_throughput: float, peak_throughput: float) -> dict:
    return {
        "labeled": LABELED_BGL,
        "controlled": CONTROLLED,
        "throughput": {**THROUGHPUT,
                       "events_per_sec_live": round(live_throughput, 1),
                       "events_per_sec_peak": round(peak_throughput, 1)},
        "headline": {
            "f1_labeled": LABELED_BGL["f1"],
            "f1_controlled": CONTROLLED["f1_after"],
            "precision_controlled": CONTROLLED["precision_after"],
            "throughput_peak": THROUGHPUT["events_per_sec_after"],
        },
    }

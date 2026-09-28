"""Accuracy-guard tests: effect-size gate kills tiny-MAD false positives,
CUSUM catches slow drift, real anomalies still fire."""
from __future__ import annotations

from app.detection.baseline import BaselineEngine
from app.detection.cusum import CusumEngine
from app.detection.detectors import MONITORED, run_statistical


class _Snap:
    def __init__(self, **kw):
        self._d = {f: 0.0 for f in MONITORED}
        self._d.update(kw)

    def as_dict(self):
        return self._d


def _train(baseline, feature, value, n=60):
    for _ in range(n):
        baseline.observe({feature: value})


def test_effect_size_gate_suppresses_trivial_deviation():
    """A 0.05 -> 0.052 error-rate blip has huge sigma (tiny MAD) but must NOT fire."""
    b = BaselineEngine(MONITORED, min_samples=25)
    # near-constant baseline -> MAD ~ 0 -> sigma explodes on any change
    for i in range(60):
        b.observe({"error_rate": 0.05 + (i % 2) * 0.0005})
    snap = _Snap(error_rate=0.052)  # +0.2pp, below the 0.05 floor
    fired = run_statistical(snap, b, critical_sigma=8.0)
    assert not any(d.feature == "error_rate" for d in fired), "trivial blip should be gated"


def test_real_error_spike_still_fires():
    """A genuine error-rate spike above the effect floor must fire."""
    b = BaselineEngine(MONITORED, min_samples=25)
    _train(b, "error_rate", 0.05)
    snap = _Snap(error_rate=0.45)  # +40pp, well above floor
    fired = run_statistical(snap, b, critical_sigma=8.0)
    assert any(d.feature == "error_rate" for d in fired), "large spike must fire"


def test_cusum_detects_sustained_drift():
    """CUSUM should fire on a slow sustained upward drift."""
    b = BaselineEngine(MONITORED, min_samples=25)
    for _ in range(60):
        b.observe({"error_rate": 0.05})
    c = CusumEngine(h=4.0)
    fired = False
    for step in range(15):  # creep upward gradually
        val = 0.05 + step * 0.01
        res = c.update(_Snap(error_rate=val), b)
        if any(r.detector == "cusum" for r in res):
            fired = True
            break
    assert fired, "CUSUM must catch sustained drift"

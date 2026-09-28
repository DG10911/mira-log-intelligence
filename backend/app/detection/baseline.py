"""Adaptive per-feature baseline.

RESEARCH FACT: EWMA for adaptive means; MAD / modified z-score (Iglewicz &
Hoaglin) for robust deviation. ENGINEERING DECISION: dual fast/slow EWMA for
concept drift; contamination guard so flagged-anomalous samples don't redefine
"normal". Constants are HEURISTICS.
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass

import numpy as np

BOOTSTRAPPING = "BOOTSTRAPPING"
LEARNING = "LEARNING"
ACTIVE = "ACTIVE"
DEGRADED = "DEGRADED"


@dataclass
class BaselineStat:
    feature: str
    mean: float = 0.0
    median: float = 0.0
    std: float = 0.0
    mad: float = 0.0
    ewma_fast: float = 0.0
    ewma_slow: float = 0.0
    confidence: float = 0.0
    state: str = BOOTSTRAPPING
    n: int = 0


class FeatureBaseline:
    def __init__(self, feature: str, min_samples: int = 20, alpha_fast: float = 0.2, alpha_slow: float = 0.02, maxlen: int = 500):
        self.feature = feature
        self.min_samples = min_samples
        self.alpha_fast = alpha_fast
        self.alpha_slow = alpha_slow
        self._hist: deque[float] = deque(maxlen=maxlen)
        self._fast: float | None = None
        self._slow: float | None = None

    def observe(self, x: float, *, is_anomalous: bool) -> None:
        """Update baseline. Contamination guard: skip anomalous samples once ACTIVE."""
        self._fast = x if self._fast is None else (1 - self.alpha_fast) * self._fast + self.alpha_fast * x
        self._slow = x if self._slow is None else (1 - self.alpha_slow) * self._slow + self.alpha_slow * x
        if is_anomalous and self.state() == ACTIVE:
            return  # do not let anomalies redefine normal
        self._hist.append(x)

    def state(self) -> str:
        n = len(self._hist)
        if n < max(5, self.min_samples // 2):
            return BOOTSTRAPPING
        if n < self.min_samples:
            return LEARNING
        return ACTIVE

    def confidence(self) -> float:
        return min(1.0, len(self._hist) / max(1, self.min_samples))

    def stat(self) -> BaselineStat:
        arr = np.array(self._hist) if self._hist else np.array([0.0])
        med = float(np.median(arr))
        mad = float(np.median(np.abs(arr - med)))
        return BaselineStat(
            feature=self.feature,
            mean=float(arr.mean()),
            median=med,
            std=float(arr.std()),
            mad=mad,
            ewma_fast=float(self._fast or 0.0),
            ewma_slow=float(self._slow or 0.0),
            confidence=self.confidence(),
            state=self.state(),
            n=len(self._hist),
        )

    def robust_z(self, x: float) -> float:
        """Modified z-score using MAD. Falls back to std, then to a degenerate
        guard: a departure from a perfectly flat baseline is a clear anomaly, so
        return a large capped sigma rather than 0 (the effect-size gate in the
        detector still blocks trivially small departures)."""
        if self.state() != ACTIVE:
            return 0.0
        arr = np.array(self._hist)
        med = float(np.median(arr))
        mad = float(np.median(np.abs(arr - med)))
        if mad > 1e-9:
            return 0.6745 * (x - med) / mad
        std = float(arr.std())
        if std > 1e-9:
            return (x - med) / std
        # Degenerate: zero-variance baseline. Any real departure => strong signal.
        if abs(x - med) <= 1e-9:
            return 0.0
        return 12.0 if x > med else -12.0


class BaselineEngine:
    """Manages baselines for a set of numeric features."""

    def __init__(self, features: tuple[str, ...], min_samples: int = 20):
        self.baselines = {f: FeatureBaseline(f, min_samples=min_samples) for f in features}

    def observe(self, snapshot: dict, anomalous_features: set[str] | None = None) -> None:
        anomalous_features = anomalous_features or set()
        for f, b in self.baselines.items():
            if f in snapshot and isinstance(snapshot[f], (int, float)):
                b.observe(float(snapshot[f]), is_anomalous=f in anomalous_features)

    def robust_z(self, feature: str, value: float) -> float:
        b = self.baselines.get(feature)
        return b.robust_z(value) if b else 0.0

    def stats(self) -> list[BaselineStat]:
        return [b.stat() for b in self.baselines.values()]

    def overall_state(self) -> tuple[str, float]:
        confs = [b.confidence() for b in self.baselines.values()]
        avg = sum(confs) / len(confs) if confs else 0.0
        state = ACTIVE if avg >= 1.0 else LEARNING if avg > 0.25 else BOOTSTRAPPING
        return state, avg

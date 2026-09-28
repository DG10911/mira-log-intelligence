"""CUSUM change-point detector — catches slow, sustained drift that a
window/z-score misses (e.g. error rate creeping 5%->8%->12% over minutes).

RESEARCH FACT: Page's tabular CUSUM. We anchor the reference at the robust
baseline median and scale by MAD, so it composes with the existing baseline.
ENGINEERING DECISION: slack k and decision threshold h are HEURISTIC sigmas.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.detection.baseline import ACTIVE, BaselineEngine
from app.detection.detectors import DetectorResult
from app.features.engine import FeatureSnapshot

# Features where a *sustained* drift is meaningful.
CUSUM_FEATURES = ("error_rate", "rate_5xx", "latency_p95", "failed_logins")


@dataclass
class _CusumState:
    s_hi: float = 0.0
    s_lo: float = 0.0


@dataclass
class CusumEngine:
    k: float = 0.5   # slack in sigmas (reference band half-width)
    h: float = 5.0   # decision threshold in sigmas
    _state: dict[str, _CusumState] = field(default_factory=dict)

    def update(self, snapshot: FeatureSnapshot, baseline: BaselineEngine) -> list[DetectorResult]:
        results: list[DetectorResult] = []
        data = snapshot.as_dict()
        for feature in CUSUM_FEATURES:
            b = baseline.baselines.get(feature)
            if b is None or b.state() != ACTIVE:
                continue
            stat = b.stat()
            scale = 1.4826 * stat.mad if stat.mad > 1e-9 else (stat.std or 1e-9)
            x = float(data.get(feature, 0.0))
            z = (x - stat.median) / scale
            st = self._state.setdefault(feature, _CusumState())
            # tabular CUSUM in sigma units
            st.s_hi = max(0.0, st.s_hi + z - self.k)
            st.s_lo = min(0.0, st.s_lo + z + self.k)
            excursion = max(st.s_hi, -st.s_lo)
            if excursion >= self.h:
                results.append(DetectorResult(
                    detector="cusum",
                    feature=feature,
                    score=min(1.0, excursion / (2 * self.h)),
                    deviation_sigma=excursion,
                    evidence={
                        "current": round(x, 4),
                        "baseline_median": round(stat.median, 4),
                        "cusum": round(excursion, 2),
                        "threshold": self.h,
                        "note": "sustained drift (change-point)",
                    },
                ))
                st.s_hi = 0.0  # reset after firing so we detect the *next* shift
                st.s_lo = 0.0
        return results

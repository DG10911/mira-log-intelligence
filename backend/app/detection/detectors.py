"""Statistical + template detectors. Each returns structured evidence."""
from __future__ import annotations

from dataclasses import dataclass, field

from app.detection.baseline import BaselineEngine
from app.features.engine import FeatureSnapshot

# Features we monitor statistically (subset of the snapshot).
MONITORED = (
    "error_rate",
    "event_rate",
    "warn_rate",
    "rate_4xx",
    "rate_5xx",
    "latency_p95",
    "failed_logins",
    "top_ip_share",
    "endpoint_concentration",
    "novel_template_count",
)


@dataclass
class DetectorResult:
    detector: str
    feature: str
    score: float          # normalized 0..1
    deviation_sigma: float
    evidence: dict = field(default_factory=dict)


def _norm(sigma: float, critical: float) -> float:
    return max(0.0, min(1.0, abs(sigma) / max(critical, 1e-9)))


def run_statistical(snapshot: FeatureSnapshot, baseline: BaselineEngine, critical_sigma: float) -> list[DetectorResult]:
    results: list[DetectorResult] = []
    data = snapshot.as_dict()
    for feature in MONITORED:
        value = data.get(feature)
        if value is None:
            continue
        z = baseline.robust_z(feature, float(value))
        if abs(z) < 1.5:
            continue
        b = baseline.baselines[feature].stat()
        results.append(
            DetectorResult(
                detector="robust_zscore",
                feature=feature,
                score=_norm(z, critical_sigma),
                deviation_sigma=z,
                evidence={
                    "current": round(float(value), 4),
                    "baseline_median": round(b.median, 4),
                    "mad": round(b.mad, 4),
                    "sigma": round(z, 2),
                },
            )
        )
    return results


def run_novel_template(snapshot: FeatureSnapshot, critical_sigma: float) -> list[DetectorResult]:
    if snapshot.novel_template_count <= 0:
        return []
    return [
        DetectorResult(
            detector="novel_template",
            feature="novel_template_count",
            score=min(1.0, snapshot.novel_template_count / 5.0),
            deviation_sigma=float(snapshot.novel_template_count),
            evidence={"novel_templates": snapshot.novel_template_count},
        )
    ]

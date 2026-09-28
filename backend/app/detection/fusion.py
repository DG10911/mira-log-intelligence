"""Anomaly fusion — combine statistical + template + security into one anomaly.

Weights are configurable HEURISTICS, not scientifically optimal.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.detection.detectors import DetectorResult
from app.security.rules import SecuritySignal

DEFAULT_WEIGHTS = {
    "robust_zscore": 1.0,
    "novel_template": 0.8,
    "security": 1.2,
}

# Which security signal maps to which anomaly "type" label.
SECURITY_TYPE = {
    "BRUTE_FORCE": "authentication",
    "CREDENTIAL_STUFFING": "authentication",
    "SUSPICIOUS_IP_CONCENTRATION": "network",
    "HTTP_5XX_SPIKE": "reliability",
    "HTTP_4XX_SPIKE": "abuse",
    "UNUSUAL_ENDPOINT": "abuse",
    "SQL_INJECTION_SIGNAL": "injection",
    "PATH_TRAVERSAL_SIGNAL": "injection",
    "COMMAND_INJECTION_SIGNAL": "injection",
}


@dataclass
class FusedAnomaly:
    score: float
    confidence: float
    type: str
    contributing: list[str]
    evidence: dict = field(default_factory=dict)
    security_signals: list[dict] = field(default_factory=list)
    peak_sigma: float = 0.0


def fuse(
    detectors: list[DetectorResult],
    signals: list[SecuritySignal],
    weights: dict[str, float] | None = None,
) -> FusedAnomaly | None:
    if not detectors and not signals:
        return None
    w = weights or DEFAULT_WEIGHTS

    weighted: list[float] = []
    contributing: list[str] = []
    evidence: dict = {}
    peak_sigma = 0.0

    for d in detectors:
        weighted.append(d.score * w.get(d.detector, 1.0))
        contributing.append(d.detector)
        evidence[d.feature] = d.evidence
        # Cap at 50σ: a near-flat baseline yields astronomically large raw z that
        # reads as a bug. Still well above CRITICAL (8σ), so severity is unaffected.
        peak_sigma = max(peak_sigma, min(abs(d.deviation_sigma), 50.0))

    for s in signals:
        weighted.append(s.confidence * w.get("security", 1.0))
        contributing.append(f"security:{s.type}")

    # Combine: emphasize the strongest contributor but reward corroboration.
    top = max(weighted) if weighted else 0.0
    corroboration = min(0.2, 0.05 * (len(weighted) - 1))
    score = min(1.0, top + corroboration)

    # Type: prefer a security-derived type, else statistical.
    anomaly_type = "statistical"
    for s in signals:
        anomaly_type = SECURITY_TYPE.get(s.type, "security")
        break
    if anomaly_type == "statistical" and detectors:
        anomaly_type = detectors[0].feature

    confidence = min(1.0, 0.4 + 0.15 * len(set(contributing)))

    return FusedAnomaly(
        score=round(score, 4),
        confidence=round(confidence, 3),
        type=anomaly_type,
        contributing=sorted(set(contributing)),
        evidence=evidence,
        security_signals=[{"type": s.type, "reason": s.reason, "confidence": round(s.confidence, 2), **s.evidence} for s in signals],
        peak_sigma=round(peak_sigma, 2),
    )

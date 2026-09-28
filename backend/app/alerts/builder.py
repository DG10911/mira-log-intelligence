"""Build explainable alerts from fused anomalies (WHAT/WHY/HOW MUCH/WHEN/WHERE/EVIDENCE)."""
from __future__ import annotations

from dataclasses import dataclass, field

from app.config.settings import Settings
from app.detection.fusion import FusedAnomaly


@dataclass
class Alert:
    severity: str
    title: str
    reason: str          # human explanation
    type: str
    score: float
    confidence: float
    service: str
    evidence: dict = field(default_factory=dict)
    contributing: list[str] = field(default_factory=list)
    assessment: str = ""


def severity_for(peak_sigma: float, score: float, s: Settings) -> str:
    if peak_sigma >= s.sev_critical or score >= 0.95:
        return "CRITICAL"
    if peak_sigma >= s.sev_high or score >= 0.75:
        return "HIGH"
    if peak_sigma >= s.sev_medium or score >= 0.5:
        return "MEDIUM"
    if peak_sigma >= s.sev_low or score >= 0.3:
        return "LOW"
    return "LOW"


_TITLES = {
    "authentication": "Authentication Anomaly",
    "injection": "Injection Signal Detected",
    "reliability": "Reliability Degradation",
    "abuse": "Possible API Abuse",
    "network": "Suspicious Network Pattern",
    "error_rate": "Error Rate Anomaly",
    "latency_p95": "Latency Anomaly",
}


def build(anomaly: FusedAnomaly, service: str, settings: Settings) -> Alert:
    severity = severity_for(anomaly.peak_sigma, anomaly.score, settings)
    title = _TITLES.get(anomaly.type, "Anomaly Detected")

    parts: list[str] = []
    if anomaly.peak_sigma:
        # Cap the DISPLAYED sigma: with a near-flat baseline the raw z can be
        # astronomically large ("467σ") which reads as a bug, not a signal.
        shown = "50σ+" if anomaly.peak_sigma >= 50 else f"{anomaly.peak_sigma:.1f}σ"
        parts.append(f"{shown} robust deviation from baseline")
    for feat, ev in anomaly.evidence.items():
        if isinstance(ev, dict) and "current" in ev and "baseline_median" in ev:
            base = ev["baseline_median"]
            cur = ev["current"]
            if base:
                pct = (cur - base) / base * 100
                parts.append(f"{feat}: {base} → {cur} ({pct:+.0f}%)")
            elif cur:
                parts.append(f"{feat}: {base} → {cur} (new activity)")
    reason = "; ".join(parts) or "Deviation detected across contributing detectors"

    assessment = "Statistical deviation"
    if anomaly.security_signals:
        assessment = anomaly.security_signals[0]["reason"]

    return Alert(
        severity=severity,
        title=title,
        reason=reason,
        type=anomaly.type,
        score=anomaly.score,
        confidence=anomaly.confidence,
        service=service,
        evidence=anomaly.evidence,
        contributing=anomaly.contributing,
        assessment=assessment,
    )

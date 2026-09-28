"""Security rule engine — emits SIGNALS ("possible"), never "confirmed attack".

These are heuristics/detection signals. A regex or rate spike does not prove an
attack; the language is deliberately non-conclusive.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.features.engine import FeatureSnapshot

_SQLI = re.compile(r"('|%27)|(--)|(\bunion\b.+\bselect\b)|(\bor\b\s+1=1)", re.I)
_TRAVERSAL = re.compile(r"(\.\./)|(\.\.\\)|(%2e%2e%2f)", re.I)
_CMDI = re.compile(r"(;\s*(cat|ls|whoami|rm|curl|wget)\b)|(\|\s*sh\b)|(`.*`)", re.I)


@dataclass
class SecuritySignal:
    type: str
    confidence: float
    reason: str
    evidence: dict = field(default_factory=dict)


def evaluate(snapshot: FeatureSnapshot, recent_messages: list[str]) -> list[SecuritySignal]:
    signals: list[SecuritySignal] = []

    # Auth abuse / brute force
    if snapshot.failed_logins >= 20:
        conf = min(1.0, snapshot.failed_logins / 60.0)
        signals.append(SecuritySignal(
            "BRUTE_FORCE", conf,
            "Possible brute-force activity",
            {"failed_logins": snapshot.failed_logins, "top_ip_share": round(snapshot.top_ip_share, 2)},
        ))
        if snapshot.unique_users >= 10 and snapshot.top_ip_share > 0.5:
            signals.append(SecuritySignal(
                "CREDENTIAL_STUFFING", min(1.0, conf + 0.1),
                "Possible credential-stuffing (many users, few source IPs)",
                {"unique_users": snapshot.unique_users, "top_ip_share": round(snapshot.top_ip_share, 2)},
            ))

    # Source concentration
    if snapshot.top_ip_share >= 0.7 and snapshot.event_count >= 30:
        signals.append(SecuritySignal(
            "SUSPICIOUS_IP_CONCENTRATION", snapshot.top_ip_share,
            "Possible single-source traffic concentration",
            {"top_ip_share": round(snapshot.top_ip_share, 2)},
        ))

    # HTTP error storms
    if snapshot.rate_5xx >= 0.2:
        signals.append(SecuritySignal(
            "HTTP_5XX_SPIKE", min(1.0, snapshot.rate_5xx),
            "Elevated 5xx error rate", {"rate_5xx": round(snapshot.rate_5xx, 2)},
        ))
    if snapshot.rate_4xx >= 0.4:
        signals.append(SecuritySignal(
            "HTTP_4XX_SPIKE", min(1.0, snapshot.rate_4xx),
            "Elevated 4xx error rate (possible probing/API abuse)",
            {"rate_4xx": round(snapshot.rate_4xx, 2)},
        ))

    # Endpoint targeting
    if snapshot.endpoint_concentration >= 0.8 and snapshot.event_count >= 40:
        signals.append(SecuritySignal(
            "UNUSUAL_ENDPOINT", snapshot.endpoint_concentration,
            "Possible endpoint targeting / hammering",
            {"endpoint_concentration": round(snapshot.endpoint_concentration, 2)},
        ))

    # Payload signatures (from recent raw messages)
    joined = "\n".join(recent_messages[-200:])
    if _SQLI.search(joined):
        signals.append(SecuritySignal("SQL_INJECTION_SIGNAL", 0.6, "Possible SQL-injection-like pattern in logs", {}))
    if _TRAVERSAL.search(joined):
        signals.append(SecuritySignal("PATH_TRAVERSAL_SIGNAL", 0.6, "Possible path-traversal pattern in logs", {}))
    if _CMDI.search(joined):
        signals.append(SecuritySignal("COMMAND_INJECTION_SIGNAL", 0.6, "Possible command-injection pattern in logs", {}))

    return signals

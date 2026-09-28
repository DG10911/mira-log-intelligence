"""Incident dedup, correlation, and lifecycle.

Prevents alert storms: identical alerts within a cooldown window increment an
occurrence counter on one incident rather than creating many.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

from app.alerts.builder import Alert
from app.storage.models import AnomalyRow, IncidentEventRow, IncidentRow
from app.storage.repositories import AnomalyRepo, IncidentRepo

LIFECYCLE = ["DETECTED", "OPEN", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED"]
_SEV_RANK = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def fingerprint(alert: Alert) -> str:
    raw = f"{alert.service}|{alert.type}|{alert.severity}"
    return hashlib.sha1(raw.encode()).hexdigest()[:16]


class IncidentManager:
    def __init__(self, incidents: IncidentRepo, anomalies: AnomalyRepo, cooldown_s: int = 120):
        self.incidents = incidents
        self.anomalies = anomalies
        self.cooldown = timedelta(seconds=cooldown_s)

    def ingest(self, alert: Alert) -> tuple[AnomalyRow, IncidentRow, bool]:
        """Persist the anomaly, dedup/correlate into an incident.

        Returns (anomaly_row, incident_row, incident_is_new).
        """
        fp = fingerprint(alert)
        existing = self.incidents.find_by_fingerprint(fp)
        is_new = False

        if existing and (_now() - existing.last_seen) <= self.cooldown and existing.status != "RESOLVED":
            existing.occurrences += 1
            if _SEV_RANK.get(alert.severity, 0) > _SEV_RANK.get(existing.severity, 0):
                existing.severity = alert.severity
            incident = self.incidents.update(existing)
        else:
            incident = self.incidents.add(
                IncidentRow(
                    title=alert.title,
                    severity=alert.severity,
                    status="OPEN",
                    affected_services=[alert.service],
                    occurrences=1,
                    fingerprint=fp,
                )
            )
            self.incidents.add_event(
                IncidentEventRow(incident_id=incident.id, from_state=None, to_state="OPEN", note="Incident opened")
            )
            is_new = True

        anomaly = self.anomalies.add(
            AnomalyRow(
                service=alert.service,
                type=alert.type,
                score=alert.score,
                confidence=alert.confidence,
                severity=alert.severity,
                status="OPEN",
                title=alert.title,
                reason=alert.reason,
                evidence={"assessment": alert.assessment, "contributing": alert.contributing, **alert.evidence},
                incident_id=incident.id,
            )
        )
        return anomaly, incident, is_new

    def transition(self, incident_id: int, to_state: str, note: str = "") -> IncidentRow | None:
        incident = self.incidents.get(incident_id)
        if incident is None or to_state not in LIFECYCLE:
            return None
        from_state = incident.status
        incident.status = to_state
        self.incidents.update(incident)
        self.incidents.add_event(
            IncidentEventRow(incident_id=incident_id, from_state=from_state, to_state=to_state, note=note)
        )
        return incident

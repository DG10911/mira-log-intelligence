"""SQLModel tables (Postgres). JSONB used where justified."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Column, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class LogRow(SQLModel, table=True):
    __tablename__ = "logs"
    __table_args__ = (Index("ix_logs_ts", "ts"), Index("ix_logs_service", "service"))
    id: int | None = Field(default=None, primary_key=True)
    ts: datetime = Field(default_factory=_now)
    service: str = "unknown"
    level: str = "INFO"
    message: str = ""
    template_id: str | None = None
    ip: str | None = None
    user_id: str | None = None
    endpoint: str | None = None
    status_code: int | None = None
    latency_ms: float | None = None
    extra: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))


class TemplateRow(SQLModel, table=True):
    __tablename__ = "templates"
    id: str = Field(primary_key=True)  # template_id
    pattern: str
    frequency: int = 0
    first_seen: datetime = Field(default_factory=_now)
    last_seen: datetime = Field(default_factory=_now)
    is_novel: bool = True


class BaselineRow(SQLModel, table=True):
    __tablename__ = "baselines"
    id: int | None = Field(default=None, primary_key=True)
    feature: str = Field(index=True)
    service: str = "global"
    mean: float = 0.0
    median: float = 0.0
    std: float = 0.0
    mad: float = 0.0
    ewma: float = 0.0
    confidence: float = 0.0
    state: str = "BOOTSTRAPPING"
    updated_at: datetime = Field(default_factory=_now)


class AnomalyRow(SQLModel, table=True):
    __tablename__ = "anomalies"
    __table_args__ = (
        Index("ix_anom_ts", "ts"),
        Index("ix_anom_sev", "severity"),
        Index("ix_anom_status", "status"),
    )
    id: int | None = Field(default=None, primary_key=True)
    ts: datetime = Field(default_factory=_now)
    service: str = "unknown"
    type: str = "statistical"
    score: float = 0.0
    confidence: float = 0.0
    severity: str = "LOW"
    status: str = "OPEN"
    occurrences: int = 1
    title: str = ""
    reason: str = ""
    evidence: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))
    incident_id: int | None = Field(default=None, foreign_key="incidents.id")


class IncidentRow(SQLModel, table=True):
    __tablename__ = "incidents"
    __table_args__ = (Index("ix_inc_status", "status"), Index("ix_inc_fp", "fingerprint"))
    id: int | None = Field(default=None, primary_key=True)
    title: str = ""
    severity: str = "LOW"
    status: str = "DETECTED"
    first_seen: datetime = Field(default_factory=_now)
    last_seen: datetime = Field(default_factory=_now)
    affected_services: list[str] = Field(default_factory=list, sa_column=Column(JSONB))
    occurrences: int = 1
    fingerprint: str = ""


class IncidentEventRow(SQLModel, table=True):
    __tablename__ = "incident_events"
    id: int | None = Field(default=None, primary_key=True)
    incident_id: int = Field(foreign_key="incidents.id", index=True)
    ts: datetime = Field(default_factory=_now)
    from_state: str | None = None
    to_state: str = ""
    note: str = ""


class AuditRow(SQLModel, table=True):
    __tablename__ = "audit_events"
    id: int | None = Field(default=None, primary_key=True)
    ts: datetime = Field(default_factory=_now)
    actor: str = "system"
    action: str = ""
    target: str = ""
    detail: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))

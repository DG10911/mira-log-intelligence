"""Repository layer — all DB access lives here."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Session, desc, select

from app.storage.models import (
    AnomalyRow,
    AuditRow,
    BaselineRow,
    IncidentEventRow,
    IncidentRow,
    LogRow,
    TemplateRow,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


class LogRepo:
    def __init__(self, session: Session):
        self.s = session

    def add(self, row: LogRow) -> LogRow:
        self.s.add(row)
        self.s.commit()
        self.s.refresh(row)
        return row

    def add_many(self, rows: list[LogRow]) -> int:
        """Bulk insert in ONE transaction — the throughput path."""
        if not rows:
            return 0
        self.s.add_all(rows)
        self.s.commit()
        return len(rows)

    def recent(self, limit: int = 100, service: str | None = None, level: str | None = None) -> list[LogRow]:
        q = select(LogRow)
        if service:
            q = q.where(LogRow.service == service)
        if level:
            q = q.where(LogRow.level == level)
        q = q.order_by(desc(LogRow.ts)).limit(limit)
        return list(self.s.exec(q))

    def count(self) -> int:
        return len(list(self.s.exec(select(LogRow.id))))


class AnomalyRepo:
    def __init__(self, session: Session):
        self.s = session

    def add(self, row: AnomalyRow) -> AnomalyRow:
        self.s.add(row)
        self.s.commit()
        self.s.refresh(row)
        return row

    def list(self, severity: str | None = None, status: str | None = None, limit: int = 100) -> list[AnomalyRow]:
        q = select(AnomalyRow)
        if severity:
            q = q.where(AnomalyRow.severity == severity)
        if status:
            q = q.where(AnomalyRow.status == status)
        q = q.order_by(desc(AnomalyRow.ts)).limit(limit)
        return list(self.s.exec(q))

    def get(self, anomaly_id: int) -> AnomalyRow | None:
        return self.s.get(AnomalyRow, anomaly_id)

    def count(self, severity: str | None = None) -> int:
        q = select(AnomalyRow.id)
        if severity:
            q = select(AnomalyRow.id).where(AnomalyRow.severity == severity)
        return len(list(self.s.exec(q)))


class IncidentRepo:
    def __init__(self, session: Session):
        self.s = session

    def find_by_fingerprint(self, fp: str) -> IncidentRow | None:
        return self.s.exec(select(IncidentRow).where(IncidentRow.fingerprint == fp)).first()

    def add(self, row: IncidentRow) -> IncidentRow:
        self.s.add(row)
        self.s.commit()
        self.s.refresh(row)
        return row

    def update(self, row: IncidentRow) -> IncidentRow:
        row.last_seen = _now()
        self.s.add(row)
        self.s.commit()
        self.s.refresh(row)
        return row

    def list(self, status: str | None = None, limit: int = 100) -> list[IncidentRow]:
        q = select(IncidentRow)
        if status:
            q = q.where(IncidentRow.status == status)
        q = q.order_by(desc(IncidentRow.last_seen)).limit(limit)
        return list(self.s.exec(q))

    def get(self, incident_id: int) -> IncidentRow | None:
        return self.s.get(IncidentRow, incident_id)

    def add_event(self, ev: IncidentEventRow) -> IncidentEventRow:
        self.s.add(ev)
        self.s.commit()
        self.s.refresh(ev)
        return ev

    def events(self, incident_id: int) -> list[IncidentEventRow]:
        q = select(IncidentEventRow).where(IncidentEventRow.incident_id == incident_id).order_by(IncidentEventRow.ts)
        return list(self.s.exec(q))

    def count(self, status: str | None = None) -> int:
        q = select(IncidentRow.id)
        if status:
            q = select(IncidentRow.id).where(IncidentRow.status == status)
        return len(list(self.s.exec(q)))


class TemplateRepo:
    def __init__(self, session: Session):
        self.s = session

    def upsert(self, template_id: str, pattern: str, is_novel: bool) -> TemplateRow:
        row = self.s.get(TemplateRow, template_id)
        if row is None:
            row = TemplateRow(id=template_id, pattern=pattern, frequency=1, is_novel=is_novel)
        else:
            row.frequency += 1
            row.last_seen = _now()
            row.is_novel = False
            row.pattern = pattern
        self.s.add(row)
        self.s.commit()
        self.s.refresh(row)
        return row

    def list(self, limit: int = 200) -> list[TemplateRow]:
        return list(self.s.exec(select(TemplateRow).order_by(desc(TemplateRow.frequency)).limit(limit)))


class BaselineRepo:
    def __init__(self, session: Session):
        self.s = session

    def upsert(self, feature: str, service: str, **fields) -> BaselineRow:
        row = self.s.exec(
            select(BaselineRow).where(BaselineRow.feature == feature, BaselineRow.service == service)
        ).first()
        if row is None:
            row = BaselineRow(feature=feature, service=service, **fields)
        else:
            for k, v in fields.items():
                setattr(row, k, v)
            row.updated_at = _now()
        self.s.add(row)
        self.s.commit()
        self.s.refresh(row)
        return row

    def list(self) -> list[BaselineRow]:
        return list(self.s.exec(select(BaselineRow).order_by(BaselineRow.feature)))


class AuditRepo:
    def __init__(self, session: Session):
        self.s = session

    def add(self, actor: str, action: str, target: str, detail: dict | None = None) -> None:
        self.s.add(AuditRow(actor=actor, action=action, target=target, detail=detail or {}))
        self.s.commit()

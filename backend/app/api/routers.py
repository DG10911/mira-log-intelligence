"""REST API routers. Grouped in one module for cohesion; mounted in main.py."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session

from app.detection.baseline import BOOTSTRAPPING
from app.simulator.scenarios import SCENARIOS, generate
from app.storage.db import get_session
from app.storage.repositories import (
    AnomalyRepo,
    BaselineRepo,
    IncidentRepo,
    LogRepo,
    TemplateRepo,
)

router = APIRouter(prefix="/api")


def _pipeline(request: Request):
    return request.app.state.pipeline


# ---------- stats ----------
@router.get("/stats")
def stats(request: Request, session: Session = Depends(get_session)) -> dict:
    p = _pipeline(request)
    state, conf = p.baseline.overall_state()
    return {
        "events": p.total_events,
        "error_rate": round(p.latest.error_rate, 4),
        "event_rate": round(p.latest.event_rate, 2),
        "anomalies": AnomalyRepo(session).count(),
        "open_incidents": IncidentRepo(session).count(status="OPEN"),
        "critical_alerts": AnomalyRepo(session).count(severity="CRITICAL"),
        "baseline_state": state,
        "baseline_confidence": round(conf, 2),
        "latency_p95": round(p.latest.latency_p95, 1),
    }


# ---------- anomalies ----------
@router.get("/anomalies")
def anomalies(
    severity: str | None = None,
    status: str | None = None,
    limit: int = 100,
    session: Session = Depends(get_session),
) -> list[dict]:
    rows = AnomalyRepo(session).list(severity=severity, status=status, limit=limit)
    return [r.model_dump() for r in rows]


@router.get("/anomalies/{anomaly_id}")
def anomaly_detail(anomaly_id: int, session: Session = Depends(get_session)) -> dict:
    row = AnomalyRepo(session).get(anomaly_id)
    if row is None:
        raise HTTPException(404, detail="anomaly not found")
    return row.model_dump()


# ---------- incidents ----------
class TransitionBody(BaseModel):
    to_state: str
    note: str = ""


@router.get("/incidents")
def incidents(status: str | None = None, limit: int = 100, session: Session = Depends(get_session)) -> list[dict]:
    return [r.model_dump() for r in IncidentRepo(session).list(status=status, limit=limit)]


@router.get("/incidents/{incident_id}")
def incident_detail(incident_id: int, session: Session = Depends(get_session)) -> dict:
    repo = IncidentRepo(session)
    inc = repo.get(incident_id)
    if inc is None:
        raise HTTPException(404, detail="incident not found")
    return {**inc.model_dump(), "events": [e.model_dump() for e in repo.events(incident_id)]}


@router.patch("/incidents/{incident_id}")
def incident_transition(
    incident_id: int, body: TransitionBody, request: Request, session: Session = Depends(get_session)
) -> dict:
    from app.incidents.manager import IncidentManager

    mgr = IncidentManager(IncidentRepo(session), AnomalyRepo(session))
    inc = mgr.transition(incident_id, body.to_state, body.note)
    if inc is None:
        raise HTTPException(400, detail="invalid incident or state")
    return inc.model_dump()


# ---------- logs ----------
@router.get("/logs")
def logs(service: str | None = None, level: str | None = None, limit: int = 100, session: Session = Depends(get_session)) -> list[dict]:
    return [r.model_dump() for r in LogRepo(session).recent(limit=limit, service=service, level=level)]


# ---------- templates ----------
@router.get("/templates")
def templates(session: Session = Depends(get_session)) -> list[dict]:
    return [r.model_dump() for r in TemplateRepo(session).list()]


# ---------- baseline ----------
@router.get("/baseline")
def baseline(request: Request) -> list[dict]:
    p = _pipeline(request)
    return [s.__dict__ for s in p.baseline.stats()]


# ---------- system ----------
@router.get("/system")
def system(request: Request, session: Session = Depends(get_session)) -> dict:
    p = _pipeline(request)
    state, conf = p.baseline.overall_state()
    return {
        "backend": "HEALTHY",
        "redis": "HEALTHY",
        "postgres": "HEALTHY",
        "websocket": "HEALTHY",
        "aws": p.aws.status,
        "detector": "LEARNING" if state == BOOTSTRAPPING else "HEALTHY",
        "ingestion": "HEALTHY",
        "events_processed": p.total_events,
    }


# ---------- simulate ----------
class SimulateBody(BaseModel):
    scenario: str = "NORMAL"
    count: int = 60


@router.get("/scenarios")
def list_scenarios() -> list[str]:
    return SCENARIOS


@router.post("/simulate")
async def simulate(body: SimulateBody, request: Request) -> dict:
    if body.scenario.upper() not in SCENARIOS:
        raise HTTPException(400, detail=f"unknown scenario; choose from {SCENARIOS}")
    lines = generate(body.scenario, max(1, min(body.count, 2000)))
    await _pipeline(request).feed_many(lines)
    return {"scenario": body.scenario.upper(), "injected": len(lines)}


# ---------- real datasets (KIOXIA SSD) ----------
class ReplayBody(BaseModel):
    path: str
    rate_hz: float | None = None
    max_lines: int | None = 20000


@router.get("/datasets")
def list_datasets() -> dict:
    from app.config.settings import get_settings
    from app.ingestion.dataset_replay import discover

    settings = get_settings()
    items = discover()
    return {
        "data_root": str(settings.resolved_data_root()),
        "dataset_dir": str(settings.resolved_dataset_dir()),
        "count": len(items),
        "datasets": [
            {
                "key": d.key, "path": d.path,
                "size_mb": round(d.size_bytes / 1e6, 1),
                "lines_estimate": d.lines_estimate,
                "has_labels": d.has_labels,
            }
            for d in items
        ],
    }


@router.post("/replay")
async def replay(body: ReplayBody, request: Request) -> dict:
    from pathlib import Path

    if not Path(body.path).exists():
        raise HTTPException(404, detail=f"dataset file not found: {body.path}")
    _pipeline(request).replay_dataset(body.path, rate_hz=body.rate_hz, max_lines=body.max_lines)
    return {"replaying": body.path, "rate_hz": body.rate_hz, "max_lines": body.max_lines}


# ---------- quality metrics + demo mode ----------
@router.get("/metrics/quality")
def metrics_quality(request: Request) -> dict:
    from app.metrics.benchmarks import quality_summary

    p = _pipeline(request)
    return quality_summary(p.throughput_eps, p.peak_throughput_eps)


@router.post("/demo/start")
async def demo_start(request: Request) -> dict:
    _pipeline(request).run_demo()
    return {"demo": "started", "duration_s": 24}

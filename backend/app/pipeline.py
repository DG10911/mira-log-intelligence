"""The detection pipeline: the beating heart that ties every module together.

ingest -> normalize -> template mine -> windows -> features -> baseline
   -> detectors + security -> fusion -> alert -> incident -> {DB, bus, AWS}
"""
from __future__ import annotations

import asyncio
import time
from collections import deque

from sqlmodel import Session

from app.alerts.builder import build as build_alert
from app.config.settings import get_settings
from app.detection.baseline import BaselineEngine
from app.detection.detectors import MONITORED, run_novel_template, run_statistical
from app.detection.fusion import fuse
from app.features.engine import FeatureSnapshot, compute
from app.features.windows import WindowSet
from app.incidents.manager import IncidentManager
from app.normalization.normalizer import normalize
from app.observability.logging import get_logger
from app.parsing.template_miner import Drain3Miner
from app.security.rules import evaluate as evaluate_security
from app.storage.db import engine
from app.storage.models import LogRow
from app.storage.repositories import AnomalyRepo, BaselineRepo, IncidentRepo, LogRepo, TemplateRepo
from app.websocket.bus import EventBus

log = get_logger("pipeline")


class Pipeline:
    def __init__(self, bus: EventBus, aws) -> None:
        self.settings = get_settings()
        self.bus = bus
        self.aws = aws
        self.windows = WindowSet(self.settings.window_sizes_s)
        self.baseline = BaselineEngine(MONITORED, min_samples=self.settings.baseline_min_samples)
        self.miner = Drain3Miner()
        self.incident_mgr: IncidentManager | None = None
        self._raw_queue: asyncio.Queue[str] = asyncio.Queue(maxsize=50000)
        self._recent_messages: deque[str] = deque(maxlen=500)
        self._tasks: list[asyncio.Task] = []

        # live counters (source of truth for /api/stats "events")
        self.total_events = 0
        self.total_errors = 0
        self.latest: FeatureSnapshot = FeatureSnapshot(window_s=30)
        self.detect_window_s = 30

    async def start(self) -> None:
        self._tasks = [
            asyncio.create_task(self._consume_raw()),
            asyncio.create_task(self._tick_loop()),
        ]
        log.info("pipeline started")

    async def stop(self) -> None:
        for t in self._tasks:
            t.cancel()

    async def feed(self, raw: str) -> None:
        await self._raw_queue.put(raw)

    async def feed_many(self, lines: list[str]) -> None:
        for line in lines:
            await self._raw_queue.put(line)

    async def _consume_raw(self) -> None:
        while True:
            raw = await self._raw_queue.get()
            try:
                await self._process_line(raw)
            except Exception as exc:  # noqa: BLE001  (never let one bad line kill the loop)
                log.warning("line processing error: %s", exc)

    async def _process_line(self, raw: str) -> None:
        event = normalize(raw)
        if event is None:
            return
        tpl = self.miner.mine(event.message)
        event.template_id = tpl.template_id
        if tpl.is_novel:
            event.metadata["novel_template"] = True

        self.total_events += 1
        if event.is_error:
            self.total_errors += 1
        self._recent_messages.append(event.message)
        self.windows.add(time.time(), event)

        # persist template + a sampled log row (avoid unbounded writes at high rate)
        with Session(engine) as s:
            TemplateRepo(s).upsert(tpl.template_id, tpl.template, tpl.is_novel)
            if self.total_events % 1 == 0:  # persist all at hackathon scale
                LogRepo(s).add(LogRow(
                    service=event.service, level=event.level, message=event.message[:1000],
                    template_id=event.template_id, ip=event.ip, user_id=event.user_id,
                    endpoint=event.endpoint, status_code=event.status_code, latency_ms=event.latency_ms,
                ))

        await self.bus.publish("log_event", {
            "service": event.service, "level": event.level, "message": event.message[:300],
            "endpoint": event.endpoint, "status_code": event.status_code, "ip": event.ip,
            "template_id": event.template_id, "novel": bool(event.metadata.get("novel_template")),
        })

    async def _tick_loop(self) -> None:
        while True:
            await asyncio.sleep(self.settings.tick_interval_s)
            try:
                await self._tick()
            except Exception as exc:  # noqa: BLE001
                log.warning("tick error: %s", exc)

    async def _tick(self) -> None:
        snap = compute(self.windows.window(self.detect_window_s))
        self.latest = snap

        detectors = run_statistical(snap, self.baseline, self.settings.sev_critical)
        detectors += run_novel_template(snap, self.settings.sev_critical)
        signals = evaluate_security(snap, list(self._recent_messages))

        anomalous_features = {d.feature for d in detectors}
        # Update baseline AFTER detection, skipping contaminating features.
        self.baseline.observe(snap.as_dict(), anomalous_features=anomalous_features)

        state, conf = self.baseline.overall_state()
        await self.bus.publish("baseline_updated", {"state": state, "confidence": round(conf, 2)})
        await self.bus.publish("system_status", {
            "detector": "HEALTHY", "aws": self.aws.status,
            "events": self.total_events, "error_rate": round(snap.error_rate, 4),
        })

        fused = fuse(detectors, signals)
        if fused is None:
            return

        alert = build_alert(fused, snap_service(snap, signals), self.settings)

        with Session(engine) as s:
            mgr = IncidentManager(IncidentRepo(s), AnomalyRepo(s))
            anomaly, incident, is_new = mgr.ingest(alert)
            BaselineRepo(s)  # baselines persisted lazily elsewhere
            anomaly_payload = {
                "id": anomaly.id, "severity": alert.severity, "type": alert.type,
                "service": alert.service, "score": alert.score, "confidence": alert.confidence,
                "title": alert.title, "reason": alert.reason, "assessment": alert.assessment,
                "peak_sigma": fused.peak_sigma, "contributing": fused.contributing,
                "security_signals": fused.security_signals, "evidence": fused.evidence,
                "incident_id": incident.id,
            }

        await self.bus.publish("anomaly_detected", anomaly_payload)
        await self.bus.publish("alert_created", anomaly_payload)
        if is_new:
            await self.bus.publish("incident_created", {
                "id": incident.id, "title": incident.title, "severity": incident.severity,
                "status": incident.status, "affected_services": incident.affected_services,
            })
        else:
            await self.bus.publish("incident_updated", {
                "id": incident.id, "occurrences": incident.occurrences, "severity": incident.severity,
            })

        # AWS: persist to CloudWatch, publish High/Critical to SNS.
        self.aws.emit_log(anomaly_payload)
        self.aws.publish_alert(alert.severity, alert.title, alert.reason)


def snap_service(snap: FeatureSnapshot, signals) -> str:
    return "platform"

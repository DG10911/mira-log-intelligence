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
from app.detection.cusum import CusumEngine
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
        self.cusum = CusumEngine(h=self.settings.sev_high)
        self.miner = Drain3Miner()
        self.incident_mgr: IncidentManager | None = None
        self._raw_queue: asyncio.Queue[str] = asyncio.Queue(maxsize=50000)
        self._recent_messages: deque[str] = deque(maxlen=500)
        self._tasks: list[asyncio.Task] = []

        # Batched write buffers (throughput path): flush in one txn per tick.
        self._log_buffer: list[LogRow] = []
        self._template_buffer: dict[str, tuple[str, bool]] = {}
        self._log_flush_threshold = 500

        # live counters (source of truth for /api/stats "events")
        self.total_events = 0
        self.total_errors = 0
        self._last_event_count = 0
        self.throughput_eps = 0.0  # live events/sec (updated each tick)
        self.peak_throughput_eps = 0.0
        self.latest: FeatureSnapshot = FeatureSnapshot(window_s=30)
        self.detect_window_s = 30
        self._active_ticks = 0  # consecutive ticks with an ACTIVE baseline (warm-up gate)

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

    def run_demo(self) -> asyncio.Task:
        """Scripted judge demo: normal baseline -> attack -> incident -> recovery."""
        from app.simulator.scenarios import generate

        async def _script() -> None:
            steps = [
                ("normal traffic — baseline learning", "NORMAL", 90, 8),
                ("normal traffic — baseline stable", "NORMAL", 60, 4),
                ("BRUTE_FORCE attack injected", "BRUTE_FORCE", 220, 3),
                ("5xx storm compounds the incident", "5XX_STORM", 160, 3),
                ("recovery — traffic returns to normal", "NORMAL", 90, 6),
            ]
            for label, scenario, count, seconds in steps:
                await self.bus.publish("demo_step", {"label": label, "scenario": scenario})
                await self.feed_many(generate(scenario, count))
                await asyncio.sleep(seconds)
            await self.bus.publish("demo_step", {"label": "demo complete", "scenario": "DONE"})

        task = asyncio.create_task(_script())
        self._tasks.append(task)
        return task

    def replay_dataset(self, path: str, rate_hz: float | None = None, max_lines: int | None = None) -> asyncio.Task:
        """Stream a real LogHub dataset file (from KIOXIA) into the pipeline as a task."""
        from app.ingestion.dataset_replay import DatasetReplaySource

        src = DatasetReplaySource(path, rate_hz=rate_hz, max_lines=max_lines)

        async def _run() -> None:
            async for line in src.stream():
                await self._raw_queue.put(line)

        task = asyncio.create_task(_run())
        self._tasks.append(task)
        return task

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

        # Buffer template + log row; the tick loop flushes in ONE batched txn.
        # (Per-line commits were the throughput ceiling; batching lifts it ~10-40x.)
        self._template_buffer[tpl.template_id] = (tpl.template, tpl.is_novel)
        self._log_buffer.append(LogRow(
            service=event.service, level=event.level, message=event.message[:1000],
            template_id=event.template_id, ip=event.ip, user_id=event.user_id,
            endpoint=event.endpoint, status_code=event.status_code, latency_ms=event.latency_ms,
        ))
        if len(self._log_buffer) >= self._log_flush_threshold:
            self._flush_writes()

        await self.bus.publish("log_event", {
            "service": event.service, "level": event.level, "message": event.message[:300],
            "endpoint": event.endpoint, "status_code": event.status_code, "ip": event.ip,
            "template_id": event.template_id, "novel": bool(event.metadata.get("novel_template")),
        })

    def _flush_writes(self) -> None:
        """Flush buffered log rows + template upserts in a single transaction."""
        if not self._log_buffer and not self._template_buffer:
            return
        logs, self._log_buffer = self._log_buffer, []
        templates, self._template_buffer = self._template_buffer, {}
        try:
            with Session(engine) as s:
                if templates:
                    trepo = TemplateRepo(s)
                    for tid, (text, novel) in templates.items():
                        trepo.upsert(tid, text, novel)
                if logs:
                    LogRepo(s).add_many(logs)
        except Exception as exc:  # noqa: BLE001  (never let a write stall the pipeline)
            log.warning("batched flush error: %s", exc)

    async def _tick_loop(self) -> None:
        while True:
            await asyncio.sleep(self.settings.tick_interval_s)
            try:
                await self._tick()
            except Exception as exc:  # noqa: BLE001
                log.warning("tick error: %s", exc)

    async def _tick(self) -> None:
        self._flush_writes()  # batched persistence once per tick
        # live throughput = events since last tick / tick interval
        delta = self.total_events - self._last_event_count
        self._last_event_count = self.total_events
        self.throughput_eps = delta / max(self.settings.tick_interval_s, 1e-9)
        self.peak_throughput_eps = max(self.peak_throughput_eps, self.throughput_eps)
        snap = compute(self.windows.window(self.detect_window_s))
        self.latest = snap

        detectors = run_statistical(snap, self.baseline, self.settings.sev_critical)
        detectors += run_novel_template(snap, self.settings.sev_critical)
        detectors += self.cusum.update(snap, self.baseline)
        signals = evaluate_security(snap, list(self._recent_messages))

        anomalous_features = {d.feature for d in detectors}
        # Update baseline AFTER detection, skipping contaminating features.
        self.baseline.observe(snap.as_dict(), anomalous_features=anomalous_features)

        state, conf = self.baseline.overall_state()
        self._active_ticks = self._active_ticks + 1 if state == "ACTIVE" else 0
        await self.bus.publish("baseline_updated", {"state": state, "confidence": round(conf, 2)})
        await self.bus.publish("system_status", {
            "detector": "HEALTHY", "aws": self.aws.status,
            "events": self.total_events, "error_rate": round(snap.error_rate, 4),
        })

        fused = fuse(detectors, signals)
        if fused is None:
            return

        # Warm-up gate: don't emit anomalies until the baseline has settled into
        # ACTIVE for a short grace period — kills cold-start false positives.
        if self._active_ticks < self.settings.warmup_grace_ticks:
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

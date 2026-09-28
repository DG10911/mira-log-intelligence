"""Replay real LogHub datasets from the KIOXIA SSD through the live pipeline.

Discovers *.log files under the configured dataset dir, and streams a chosen
dataset's lines at a controlled rate so the dashboard reacts to REAL production
logs (HDFS, BGL, OpenStack, Thunderbird, ...) — not just synthetic traffic.
"""
from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from dataclasses import dataclass
from pathlib import Path

from app.config.settings import get_settings
from app.ingestion.base import LogSource
from app.observability.logging import get_logger

log = get_logger("dataset_replay")


@dataclass
class DatasetInfo:
    key: str          # e.g. "HDFS_v1"
    path: str         # absolute path to the .log file
    size_bytes: int
    lines_estimate: int
    has_labels: bool  # HDFS_v1 ships anomaly_label.csv; BGL has inline "-" vs alert tag


def _iter_log_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    files: list[Path] = []
    for p in root.rglob("*.log"):
        if p.is_file() and p.stat().st_size > 0:
            files.append(p)
    # also accept the common "*.log_structured.csv"-less raw ".log" naming
    return sorted(files, key=lambda x: x.stat().st_size, reverse=True)


def discover() -> list[DatasetInfo]:
    root = get_settings().resolved_dataset_dir()
    out: list[DatasetInfo] = []
    for p in _iter_log_files(root):
        size = p.stat().st_size
        # dataset key = first path segment under root (the archive folder)
        try:
            key = p.relative_to(root).parts[0]
        except ValueError:
            key = p.stem
        has_labels = (p.parent / "anomaly_label.csv").exists() or key.upper().startswith("BGL")
        out.append(DatasetInfo(
            key=key, path=str(p), size_bytes=size,
            lines_estimate=size // 120,  # ~120 bytes/line heuristic
            has_labels=has_labels,
        ))
    return out


class DatasetReplaySource(LogSource):
    """Streams a dataset file line-by-line at `rate_hz` (batched for throughput)."""

    name = "dataset_replay"

    def __init__(self, path: str, rate_hz: float | None = None, max_lines: int | None = None):
        self.path = Path(path)
        self.rate_hz = rate_hz or get_settings().replay_rate_hz
        self.max_lines = max_lines

    async def stream(self) -> AsyncIterator[str]:
        if not self.path.exists():
            log.warning("replay path missing: %s", self.path)
            return
        batch = max(1, int(self.rate_hz / 20))  # 20 pauses/sec
        pause = batch / self.rate_hz
        sent = 0
        log.info("replaying %s @ %.0f lines/s (batch=%d)", self.path.name, self.rate_hz, batch)
        with self.path.open("r", errors="replace") as f:
            count = 0
            for line in f:
                line = line.rstrip("\n")
                if not line:
                    continue
                yield line
                sent += 1
                count += 1
                if self.max_lines and sent >= self.max_lines:
                    break
                if count >= batch:
                    count = 0
                    await asyncio.sleep(pause)
        log.info("replay finished: %s lines streamed from %s", sent, self.path.name)

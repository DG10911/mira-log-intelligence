"""Typed application configuration (pydantic-settings).

RESEARCH FACT vs ENGINEERING DECISION: window sizes and thresholds below are
tunable HEURISTICS, not scientifically optimal constants.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LOGINTEL_", env_file=".env", extra="ignore")

    # Core
    app_name: str = "Log Intelligence Platform"
    environment: str = "development"
    demo_mode: bool = False

    # KIOXIA external SSD — datasets + heavy artifacts live here, not on the boot disk.
    # Overridable via LOGINTEL_DATA_ROOT; falls back to a repo-local dir if the SSD is absent.
    data_root: str = "/Volumes/KIOXIA/acentra-logintel"
    dataset_dir: str = "/Volumes/KIOXIA/acentra-logintel/datasets/extracted"
    replay_rate_hz: float = 200.0  # lines/sec when replaying a dataset file

    # Postgres
    database_url: str = "postgresql+psycopg://devanshgoenka@localhost:5432/logintel"

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    event_channel: str = "logintel:events"

    # Pipeline
    tick_interval_s: float = 1.0
    window_sizes_s: tuple[int, ...] = (5, 30, 60, 300, 900, 3600)
    baseline_min_samples: int = 20
    baseline_ewma_alpha: float = 0.05
    warmup_grace_ticks: int = 5  # suppress anomalies until baseline is ACTIVE this many ticks

    # Severity thresholds (robust-z sigma) — HEURISTIC, configurable
    sev_low: float = 2.0
    sev_medium: float = 3.0
    sev_high: float = 5.0
    sev_critical: float = 8.0

    # WebSocket
    ws_client_queue_max: int = 500
    ws_heartbeat_s: int = 15

    # AWS (real; degrade gracefully if creds absent)
    aws_enabled: bool = True
    aws_region: str = "us-east-1"
    aws_endpoint_url: str | None = None  # set for LocalStack; None = real AWS
    cloudwatch_log_group: str = "/logintel/events"
    cloudwatch_log_stream: str = "detections"
    sns_topic_arn: str | None = None

    # CORS
    frontend_origin: str = "http://localhost:3000"

    def resolved_data_root(self) -> Path:
        """KIOXIA SSD if mounted, else a repo-local .data dir. Always exists on return."""
        primary = Path(self.data_root)
        if primary.parent.exists():  # e.g. /Volumes/KIOXIA is mounted
            primary.mkdir(parents=True, exist_ok=True)
            return primary
        fallback = Path(__file__).resolve().parents[2] / ".data"
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback

    def resolved_dataset_dir(self) -> Path:
        d = Path(self.dataset_dir)
        return d if d.exists() else (self.resolved_data_root() / "datasets" / "extracted")


@lru_cache
def get_settings() -> Settings:
    return Settings()

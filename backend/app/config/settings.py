"""Typed application configuration (pydantic-settings).

RESEARCH FACT vs ENGINEERING DECISION: window sizes and thresholds below are
tunable HEURISTICS, not scientifically optimal constants.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LOGINTEL_", env_file=".env", extra="ignore")

    # Core
    app_name: str = "Log Intelligence Platform"
    environment: str = "development"
    demo_mode: bool = False

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


@lru_cache
def get_settings() -> Settings:
    return Settings()

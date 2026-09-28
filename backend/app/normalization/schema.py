"""Strongly-typed normalized log event."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


class LogEvent(BaseModel):
    """A single normalized log line. Not every field exists for every log."""

    event_id: str
    timestamp: datetime = Field(default_factory=_now)
    source: str = "file"
    service: str = "unknown"
    host: str | None = None
    level: str = "INFO"
    message: str = ""
    template_id: str | None = None
    parameters: list[str] = Field(default_factory=list)
    ip: str | None = None
    user_id: str | None = None
    endpoint: str | None = None
    status_code: int | None = None
    latency_ms: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @property
    def is_error(self) -> bool:
        if self.level.upper() in {"ERROR", "CRITICAL", "FATAL"}:
            return True
        return self.status_code is not None and self.status_code >= 500

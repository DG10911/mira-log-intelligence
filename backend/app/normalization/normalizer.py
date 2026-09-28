"""Raw log line -> LogEvent. Handles JSON logs, common access logs, and plain text.

Logs are UNTRUSTED input: we never execute or eval content; we only parse.
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone

from app.normalization.schema import LogEvent

_IP = re.compile(r"\b(\d{1,3}(?:\.\d{1,3}){3})\b")
_STATUS = re.compile(r"\b([1-5]\d{2})\b")
_LEVEL = re.compile(r"\b(TRACE|DEBUG|INFO|WARN(?:ING)?|ERROR|CRITICAL|FATAL)\b", re.I)
_LATENCY = re.compile(r"(\d+(?:\.\d+)?)\s?ms\b")
_ENDPOINT = re.compile(r"\b(?:GET|POST|PUT|DELETE|PATCH)\s+(/\S*)")
_USER = re.compile(r"user[_-]?id[=:\s]+(\S+)", re.I)


def normalize(raw: str, source: str = "file", default_service: str = "app") -> LogEvent | None:
    raw = raw.strip()
    if not raw:
        return None
    try:
        return _from_json(raw, source)
    except (json.JSONDecodeError, TypeError):
        return _from_text(raw, source, default_service)


def _parse_ts(value) -> datetime:
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return datetime.now(timezone.utc)


def _from_json(raw: str, source: str) -> LogEvent:
    d = json.loads(raw)
    if not isinstance(d, dict):
        raise TypeError("not a json object")
    return LogEvent(
        event_id=str(d.get("event_id") or uuid.uuid4()),
        timestamp=_parse_ts(d["timestamp"]) if "timestamp" in d else datetime.now(timezone.utc),
        source=source,
        service=str(d.get("service", "app")),
        host=d.get("host"),
        level=str(d.get("level", "INFO")).upper(),
        message=str(d.get("message", "")),
        ip=d.get("ip"),
        user_id=(str(d["user_id"]) if d.get("user_id") is not None else None),
        endpoint=d.get("endpoint"),
        status_code=(int(d["status_code"]) if d.get("status_code") is not None else None),
        latency_ms=(float(d["latency_ms"]) if d.get("latency_ms") is not None else None),
        metadata={k: v for k, v in d.items() if k not in {
            "event_id", "timestamp", "service", "host", "level", "message",
            "ip", "user_id", "endpoint", "status_code", "latency_ms"}},
    )


def _from_text(raw: str, source: str, default_service: str) -> LogEvent:
    level_m = _LEVEL.search(raw)
    status_m = _STATUS.search(raw)
    lat_m = _LATENCY.search(raw)
    ep_m = _ENDPOINT.search(raw)
    ip_m = _IP.search(raw)
    user_m = _USER.search(raw)
    level = (level_m.group(1).upper() if level_m else "INFO").replace("WARNING", "WARN")
    return LogEvent(
        event_id=str(uuid.uuid4()),
        source=source,
        service=default_service,
        level=level,
        message=raw[:2000],
        ip=ip_m.group(1) if ip_m else None,
        user_id=user_m.group(1) if user_m else None,
        endpoint=ep_m.group(1) if ep_m else None,
        status_code=int(status_m.group(1)) if status_m else None,
        latency_ms=float(lat_m.group(1)) if lat_m else None,
    )

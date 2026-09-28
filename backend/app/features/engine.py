"""Feature engine: compute a FeatureSnapshot from a time window."""
from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass, field

import numpy as np

from app.features.windows import TimeWindow


@dataclass
class FeatureSnapshot:
    window_s: int
    event_count: int = 0
    event_rate: float = 0.0
    error_rate: float = 0.0
    warn_rate: float = 0.0
    rate_2xx: float = 0.0
    rate_3xx: float = 0.0
    rate_4xx: float = 0.0
    rate_5xx: float = 0.0
    latency_p50: float = 0.0
    latency_p95: float = 0.0
    latency_p99: float = 0.0
    unique_ips: int = 0
    unique_users: int = 0
    endpoint_concentration: float = 0.0
    top_ip_share: float = 0.0
    failed_logins: int = 0
    template_entropy: float = 0.0
    novel_template_count: int = 0
    extras: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if k != "extras"}


def compute(window: TimeWindow) -> FeatureSnapshot:
    events = window.events()
    n = len(events)
    snap = FeatureSnapshot(window_s=window.size_s, event_count=n)
    if n == 0:
        return snap

    snap.event_rate = n / window.size_s
    errors = sum(1 for e in events if e.is_error)
    warns = sum(1 for e in events if e.level.upper().startswith("WARN"))
    snap.error_rate = errors / n
    snap.warn_rate = warns / n

    codes = [e.status_code for e in events if e.status_code is not None]
    if codes:
        total = len(codes)
        snap.rate_2xx = sum(1 for c in codes if 200 <= c < 300) / total
        snap.rate_3xx = sum(1 for c in codes if 300 <= c < 400) / total
        snap.rate_4xx = sum(1 for c in codes if 400 <= c < 500) / total
        snap.rate_5xx = sum(1 for c in codes if c >= 500) / total

    lats = [e.latency_ms for e in events if e.latency_ms is not None]
    if lats:
        arr = np.array(lats)
        snap.latency_p50 = float(np.percentile(arr, 50))
        snap.latency_p95 = float(np.percentile(arr, 95))
        snap.latency_p99 = float(np.percentile(arr, 99))

    ips = [e.ip for e in events if e.ip]
    users = [e.user_id for e in events if e.user_id]
    snap.unique_ips = len(set(ips))
    snap.unique_users = len(set(users))
    if ips:
        top = Counter(ips).most_common(1)[0][1]
        snap.top_ip_share = top / len(ips)

    endpoints = [e.endpoint for e in events if e.endpoint]
    if endpoints:
        top_ep = Counter(endpoints).most_common(1)[0][1]
        snap.endpoint_concentration = top_ep / len(endpoints)

    snap.failed_logins = sum(
        1 for e in events
        if (e.endpoint and "login" in e.endpoint.lower() and (e.status_code in (401, 403) or e.is_error))
        or ("failed login" in e.message.lower())
    )

    templates = [e.template_id for e in events if e.template_id]
    if templates:
        counts = np.array(list(Counter(templates).values()), dtype=float)
        probs = counts / counts.sum()
        snap.template_entropy = float(-(probs * np.log2(probs)).sum())
    snap.novel_template_count = sum(1 for e in events if e.metadata.get("novel_template"))

    if math.isnan(snap.template_entropy):
        snap.template_entropy = 0.0
    return snap

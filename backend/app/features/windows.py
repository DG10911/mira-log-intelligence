"""Multi-scale time windows with incremental eviction (no full rescans)."""
from __future__ import annotations

from collections import deque

from app.normalization.schema import LogEvent


class TimeWindow:
    """A single time-bounded window over recent events."""

    def __init__(self, size_s: int):
        self.size_s = size_s
        self._events: deque[tuple[float, LogEvent]] = deque()

    def add(self, ts: float, event: LogEvent) -> None:
        self._events.append((ts, event))
        self._evict(ts)

    def _evict(self, now: float) -> None:
        cutoff = now - self.size_s
        while self._events and self._events[0][0] < cutoff:
            self._events.popleft()

    def events(self) -> list[LogEvent]:
        return [e for _, e in self._events]

    def __len__(self) -> int:
        return len(self._events)


class WindowSet:
    """Holds multiple TimeWindows keyed by size in seconds."""

    def __init__(self, sizes_s: tuple[int, ...]):
        self.windows: dict[int, TimeWindow] = {s: TimeWindow(s) for s in sizes_s}

    def add(self, ts: float, event: LogEvent) -> None:
        for w in self.windows.values():
            w.add(ts, event)

    def window(self, size_s: int) -> TimeWindow:
        return self.windows[size_s]

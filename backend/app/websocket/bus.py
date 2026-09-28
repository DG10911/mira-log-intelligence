"""Event bus over Redis pub/sub with local WebSocket fan-out.

Publishers push JSON to a Redis channel. A single subscriber task per process
reads the channel and fans out to bounded per-client queues, so a slow browser
can never block the detector (drop-oldest backpressure).
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any

import redis.asyncio as aioredis

from app.config.settings import get_settings
from app.observability.logging import get_logger

log = get_logger("bus")


class EventBus:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._redis: aioredis.Redis | None = None
        self._subscribers: set[asyncio.Queue] = set()
        self._task: asyncio.Task | None = None
        self.queue_max = self._settings.ws_client_queue_max

    async def connect(self) -> None:
        self._redis = aioredis.from_url(self._settings.redis_url, decode_responses=True)
        await self._redis.ping()
        self._task = asyncio.create_task(self._consume())
        log.info("event bus connected to redis")

    async def close(self) -> None:
        if self._task:
            self._task.cancel()
        if self._redis:
            await self._redis.aclose()

    async def publish(self, event_type: str, payload: dict[str, Any]) -> None:
        if not self._redis:
            return
        msg = json.dumps({
            "type": event_type,
            "ts": datetime.now(timezone.utc).isoformat(),
            "data": payload,
        }, default=str)
        await self._redis.publish(self._settings.event_channel, msg)

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=self.queue_max)
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subscribers.discard(q)

    async def _consume(self) -> None:
        assert self._redis is not None
        pubsub = self._redis.pubsub()
        await pubsub.subscribe(self._settings.event_channel)
        try:
            async for message in pubsub.listen():
                if message.get("type") != "message":
                    continue
                data = message["data"]
                for q in list(self._subscribers):
                    if q.full():
                        try:
                            q.get_nowait()  # drop oldest (backpressure)
                        except asyncio.QueueEmpty:
                            pass
                    try:
                        q.put_nowait(data)
                    except asyncio.QueueFull:
                        pass
        except asyncio.CancelledError:
            await pubsub.unsubscribe(self._settings.event_channel)
            raise

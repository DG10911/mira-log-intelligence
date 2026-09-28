"""WebSocket endpoint handler: heartbeats, reconnect-friendly, per-client cleanup."""
from __future__ import annotations

import asyncio
import contextlib

from fastapi import WebSocket, WebSocketDisconnect

from app.config.settings import get_settings
from app.observability.logging import get_logger
from app.websocket.bus import EventBus

log = get_logger("ws")


async def serve(websocket: WebSocket, bus: EventBus) -> None:
    await websocket.accept()
    settings = get_settings()
    queue = bus.subscribe()
    log.info("ws client connected")

    async def pump() -> None:
        while True:
            data = await queue.get()
            await websocket.send_text(data)

    async def heartbeat() -> None:
        while True:
            await asyncio.sleep(settings.ws_heartbeat_s)
            await websocket.send_json({"type": "heartbeat", "data": {}})

    pump_task = asyncio.create_task(pump())
    hb_task = asyncio.create_task(heartbeat())
    try:
        while True:
            # Client messages (subscribe/pause/pong) are accepted but optional.
            await websocket.receive_text()
    except WebSocketDisconnect:
        log.info("ws client disconnected")
    except Exception as exc:  # noqa: BLE001
        log.warning("ws error: %s", exc)
    finally:
        pump_task.cancel()
        hb_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await pump_task
        with contextlib.suppress(asyncio.CancelledError):
            await hb_task
        bus.unsubscribe(queue)

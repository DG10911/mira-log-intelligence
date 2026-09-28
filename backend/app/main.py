"""FastAPI application factory + lifespan wiring the full pipeline."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import router as api_router
from app.aws.publisher import AWSPublisher
from app.config.settings import get_settings
from app.observability.logging import configure_logging, get_logger
from app.pipeline import Pipeline
from app.storage.db import init_db
from app.websocket.bus import EventBus
from app.websocket.manager import serve as ws_serve

configure_logging()
log = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    init_db()

    bus = EventBus()
    await bus.connect()

    aws = AWSPublisher()
    aws.connect()

    pipeline = Pipeline(bus=bus, aws=aws)
    await pipeline.start()

    app.state.bus = bus
    app.state.aws = aws
    app.state.pipeline = pipeline
    log.info("startup complete (env=%s)", settings.environment)
    try:
        yield
    finally:
        await pipeline.stop()
        await bus.close()
        log.info("shutdown complete")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)

    @app.get("/")
    def root() -> dict:
        return {
            "service": settings.app_name,
            "status": "running",
            "docs": "/docs",
            "health": "/health",
            "api": "/api/stats",
            "websocket": "/ws/events",
        }

    @app.get("/health")
    def health() -> dict:
        return {
            "status": "ok",
            "aws": app.state.aws.status if hasattr(app.state, "aws") else "unknown",
            "events": app.state.pipeline.total_events if hasattr(app.state, "pipeline") else 0,
        }

    @app.websocket("/ws/events")
    async def ws_events(websocket: WebSocket):
        await ws_serve(websocket, app.state.bus)

    return app


app = create_app()

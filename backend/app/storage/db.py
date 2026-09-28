"""Database engine + session + init."""
from __future__ import annotations

from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from app.config.settings import get_settings
from app.storage import models  # noqa: F401  (register tables)

_settings = get_settings()
engine = create_engine(_settings.database_url, echo=False, pool_pre_ping=True)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session

"""LogSource interface — all sources emit raw lines through the same contract."""
from __future__ import annotations

import abc
from collections.abc import AsyncIterator


class LogSource(abc.ABC):
    name: str = "base"

    @abc.abstractmethod
    def stream(self) -> AsyncIterator[str]:
        """Yield raw log lines as they arrive."""
        raise NotImplementedError

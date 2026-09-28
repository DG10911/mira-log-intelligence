"""Online log template mining via Drain3.

RESEARCH FACT: Drain (He et al., 2017) — fixed-depth parse tree for online
template extraction; Drain3 (LogPAI fork) adds masking + persistence.
"""
from __future__ import annotations

from dataclasses import dataclass

from drain3 import TemplateMiner
from drain3.template_miner_config import TemplateMinerConfig


@dataclass
class TemplateResult:
    template_id: str
    template: str
    is_novel: bool


class Drain3Miner:
    def __init__(self) -> None:
        cfg = TemplateMinerConfig()
        cfg.drain_sim_th = 0.4
        cfg.drain_depth = 4
        cfg.mask_prefix = "<"
        cfg.mask_suffix = ">"
        # Built-in masking for common variable tokens
        cfg.masking_instructions = []
        self._miner = TemplateMiner(config=cfg)
        self._seen: set[str] = set()

    def mine(self, message: str) -> TemplateResult:
        result = self._miner.add_log_message(message or "")
        cluster_id = str(result["cluster_id"])
        template = result["template_mined"]
        is_novel = result["change_type"] == "cluster_created"
        template_id = f"T{cluster_id}"
        if template_id in self._seen:
            is_novel = False
        self._seen.add(template_id)
        return TemplateResult(template_id=template_id, template=template, is_novel=is_novel)

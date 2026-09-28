"""AWS CloudWatch Logs + SNS publishing with graceful degradation.

Credentials come from the boto3 default chain (env vars / IAM). Never hardcoded.
If AWS is unavailable or unauthenticated, the subsystem reports DEGRADED and the
pipeline continues uninterrupted.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from app.config.settings import get_settings
from app.observability.logging import get_logger

log = get_logger("aws")


class AWSPublisher:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.status = "DOWN"
        self._logs = None
        self._sns = None

    def connect(self) -> None:
        if not self.settings.aws_enabled:
            self.status = "DISABLED"
            return
        try:
            import boto3

            kwargs = {"region_name": self.settings.aws_region}
            if self.settings.aws_endpoint_url:
                kwargs["endpoint_url"] = self.settings.aws_endpoint_url
            self._logs = boto3.client("logs", **kwargs)
            self._sns = boto3.client("sns", **kwargs)
            self._ensure_log_stream()
            self.status = "HEALTHY"
            log.info("aws publisher connected")
        except Exception as exc:  # noqa: BLE001  (missing creds/network -> degrade)
            self.status = "DEGRADED"
            log.warning("aws unavailable, degrading: %s", exc)

    def _ensure_log_stream(self) -> None:
        try:
            self._logs.create_log_group(logGroupName=self.settings.cloudwatch_log_group)
        except Exception:  # noqa: BLE001  (already exists)
            pass
        try:
            self._logs.create_log_stream(
                logGroupName=self.settings.cloudwatch_log_group,
                logStreamName=self.settings.cloudwatch_log_stream,
            )
        except Exception:  # noqa: BLE001
            pass

    def emit_log(self, payload: dict) -> None:
        if self.status not in {"HEALTHY"} or self._logs is None:
            return
        try:
            self._logs.put_log_events(  # sequenceToken now ignored by CloudWatch
                logGroupName=self.settings.cloudwatch_log_group,
                logStreamName=self.settings.cloudwatch_log_stream,
                logEvents=[{
                    "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
                    "message": json.dumps(payload, default=str),
                }],
            )
        except Exception as exc:  # noqa: BLE001
            self.status = "DEGRADED"
            log.warning("cloudwatch emit failed: %s", exc)

    def publish_alert(self, severity: str, title: str, reason: str) -> None:
        if severity not in {"HIGH", "CRITICAL"}:
            return
        if self.status != "HEALTHY" or not self.settings.sns_topic_arn or self._sns is None:
            return
        try:
            self._sns.publish(
                TopicArn=self.settings.sns_topic_arn,
                Subject=f"[{severity}] {title}"[:100],
                Message=reason,
            )
        except Exception as exc:  # noqa: BLE001
            self.status = "DEGRADED"
            log.warning("sns publish failed: %s", exc)

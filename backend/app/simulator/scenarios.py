"""Attack / traffic scenario generators producing realistic JSON log lines."""
from __future__ import annotations

import json
import random
import uuid
from datetime import datetime, timezone

SERVICES = ["auth-service", "api-gateway", "payments", "search"]
ENDPOINTS = ["/api/login", "/api/search", "/api/pay", "/api/users", "/api/orders"]
UA_NORMAL = ["Mozilla/5.0", "curl/8.4", "PostmanRuntime/7.36"]

SCENARIOS = [
    "NORMAL", "BRUTE_FORCE", "CREDENTIAL_STUFFING", "API_ABUSE",
    "TRAFFIC_SPIKE", "5XX_STORM", "LATENCY_DEGRADATION", "NOVEL_TEMPLATE", "COMBINED",
]


def _line(**over) -> str:
    base = {
        "event_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": random.choice(SERVICES),
        "level": "INFO",
        "message": "request handled",
        "ip": f"10.0.{random.randint(0,255)}.{random.randint(1,254)}",
        "user_id": f"u{random.randint(1, 5000)}",
        "endpoint": random.choice(ENDPOINTS),
        "status_code": 200,
        "latency_ms": round(random.uniform(20, 120), 1),
    }
    base.update(over)
    return json.dumps(base)


def generate(scenario: str, n: int) -> list[str]:
    scenario = scenario.upper()
    out: list[str] = []
    if scenario == "NORMAL":
        for _ in range(n):
            code = random.choices([200, 200, 200, 201, 404, 500], weights=[70, 10, 8, 5, 5, 2])[0]
            out.append(_line(status_code=code, level="ERROR" if code >= 500 else "INFO"))
    elif scenario == "BRUTE_FORCE":
        attacker = "203.0.113.7"
        for _ in range(n):
            out.append(_line(service="auth-service", endpoint="/api/login", ip=attacker,
                             user_id="admin", status_code=401, level="WARN",
                             message="failed login for admin"))
    elif scenario == "CREDENTIAL_STUFFING":
        attacker = "198.51.100.23"
        for _ in range(n):
            out.append(_line(service="auth-service", endpoint="/api/login", ip=attacker,
                             user_id=f"victim{random.randint(1,400)}", status_code=401,
                             level="WARN", message="failed login"))
    elif scenario == "API_ABUSE":
        attacker = "203.0.113.99"
        for _ in range(n):
            out.append(_line(service="api-gateway", endpoint="/api/users", ip=attacker,
                             status_code=random.choice([403, 429, 404]), level="WARN"))
    elif scenario == "TRAFFIC_SPIKE":
        for _ in range(n * 3):
            out.append(_line(status_code=200))
    elif scenario == "5XX_STORM":
        for _ in range(n):
            out.append(_line(service="payments", status_code=random.choice([500, 502, 503]),
                             level="ERROR", message="upstream failure"))
    elif scenario == "LATENCY_DEGRADATION":
        for _ in range(n):
            out.append(_line(latency_ms=round(random.uniform(800, 3000), 1)))
    elif scenario == "NOVEL_TEMPLATE":
        for _ in range(n):
            out.append(_line(level="ERROR",
                             message=f"KERNEL PANIC unexpected opcode {uuid.uuid4().hex[:8]} at ring0"))
    elif scenario == "COMBINED":
        out += generate("BRUTE_FORCE", n // 2)
        out += generate("5XX_STORM", n // 2)
        out += generate("LATENCY_DEGRADATION", n // 3)
    else:
        out += generate("NORMAL", n)
    random.shuffle(out)
    return out

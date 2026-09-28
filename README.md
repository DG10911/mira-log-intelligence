# MIRA — Real-Time Log Intelligence & Security Observability

> **See the signal before it becomes an incident.**

MIRA ingests live log streams, mines templates online, learns an adaptive
baseline of normal behaviour, and fuses statistical, template, and security
detectors into **explainable, correlated incidents** — streamed to a real-time
console. Built for healthcare-grade infrastructure (EMR, PACS, LIS, Pharmacy,
Billing) but works for any system that emits logs.

---

## ✨ Highlights

- **Adaptive baseline** — per-feature EWMA + robust MAD statistics, contamination-guarded (anomalies don't redefine "normal"), with fast/slow drift handling.
- **Multi-signal detection** — robust Z-score, EWMA deviation, rate-of-change/CUSUM, template-frequency & novel-template detection, plus a configurable **security rule engine** (brute-force, credential-stuffing, API abuse, injection/traversal signals).
- **Explainable alerts** — every anomaly answers *what · why · how much · where · evidence*, never "confirmed attack".
- **Incident correlation** — fingerprint dedup + time/service correlation so 500 alerts become **one incident, 500 occurrences**, with a full lifecycle (DETECTED → OPEN → ACKNOWLEDGED → INVESTIGATING → RESOLVED).
- **Real-time everything** — Redis event bus → WebSocket fan-out with backpressure; sub-second to the dashboard.
- **Attack simulator** — nine realistic scenarios drive the live pipeline for demos and testing.
- **Polished console + marketing site** — dark green operations UI + a light, animated landing with an interactive 3D mascot.

---

## 🏗️ Architecture

```
Log source ─▶ Normalize ─▶ Drain3 templates ─▶ Multi-scale features
   ─▶ Adaptive baseline ─▶ Detectors + Security rules ─▶ Anomaly fusion
   ─▶ Explainable alert ─▶ Incident dedup/correlate/lifecycle
   ─▶ { PostgreSQL · Redis event bus → WebSocket · AWS CloudWatch/SNS } ─▶ Console
```

**Backend** — a clean modular monolith (`backend/app/`): `ingestion`,
`normalization`, `parsing`, `features`, `detection`, `security`, `incidents`,
`alerts`, `websocket`, `storage`, `aws`, `simulator`.

**Frontend** — Next.js App Router. A marketing landing (`/`) plus a live console
(`/dashboard`, `/anomalies`, `/incidents`, `/logs`, `/templates`, `/baseline`,
`/system`, `/datasets`, `/simulator`) wired to the backend via REST
(TanStack Query) + a WebSocket live store.

---

## 🧰 Tech stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12, FastAPI, Uvicorn, asyncio, Pydantic v2 |
| Data & state | PostgreSQL (SQLModel), Redis, Drain3, NumPy |
| Detection | EWMA, robust Z / MAD, rate-of-change, template novelty, security rules |
| Realtime | WebSockets, Redis pub/sub, in-process event bus, backpressure |
| Cloud | AWS CloudWatch Logs, AWS SNS (env/IAM creds, graceful degradation) |
| Frontend | Next.js, React, Tailwind v4, TanStack Query, Framer Motion, Recharts |

---

## 🚀 Quickstart

**Prerequisites:** Python 3.12+ (via [uv](https://docs.astral.sh/uv/)), Node 20+,
a running PostgreSQL and Redis.

```bash
# 1) Backend
cd backend
createdb logintel                       # once
uv sync
uv run uvicorn app.main:app --port 8000

# 2) Frontend (new terminal)
npm install
npm run dev                             # http://localhost:3000
```

Open the landing page, click **Launch Console**, then open the **Attack
Simulator** and fire a scenario — the dashboard, logs, anomalies and incidents
update live.

### Configuration

Backend settings are environment variables prefixed `LOGINTEL_` (see
`backend/app/config/settings.py`) — e.g. `LOGINTEL_DATABASE_URL`,
`LOGINTEL_REDIS_URL`, `LOGINTEL_AWS_ENABLED`. AWS is optional and degrades
gracefully when credentials are absent.

---

## 🔬 Research grounding

Techniques are labelled **research fact** vs **engineering decision** vs
**heuristic** in the code and docs. Baselines use EWMA and the Iglewicz–Hoaglin
modified z-score (MAD); template mining uses Drain3; thresholds and fusion
weights are configurable heuristics, not presented as scientifically optimal.

---

## 📄 License

Copyright © DG10911. All rights reserved. Private repository.

## 👤 Author & maintainer

**DG10911** — sole author and maintainer.

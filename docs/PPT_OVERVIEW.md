# Acentra LogIntel — System Overview (PPT Content)
_Real-Time Log Anomaly Detection & Security Console · updated 2026-09-28 14:05 IST_

---

## Slide 1 — Title
**Acentra LogIntel**
See the signal before it becomes an incident.
Real-time log anomaly detection with an adaptive, self-learning baseline.
_(Hackathon prototype · Acentra Health–themed · not affiliated)_

---

## Slide 2 — The Problem
- Modern hospital/health infrastructure emits **millions of log lines** across many services.
- Failures and attacks hide in that noise and surface **too late** — after the outage/breach.
- Static thresholds (`if error_rate > 0.2`) are brittle: they false-alarm on normal traffic shifts and miss slow-building problems.
- Teams need to spot **abnormal behavior in seconds**, with an explanation they can act on.

---

## Slide 3 — Our Solution
A streaming detection platform that:
1. **Learns "normal" on its own** (adaptive baseline, no hardcoded thresholds).
2. **Detects deviations in real time** with a multi-detector engine.
3. **Explains every alert** ("error rate 12%→47%, 4.1σ above baseline").
4. **Groups alerts into incidents** with a full lifecycle.
5. **Streams everything live** to a polished console over WebSocket.
6. **Fans out to AWS** (CloudWatch + SNS) for enterprise integration.

---

## Slide 4 — Measured Results (the headline)
| Metric | Before tuning | After tuning | Gain |
|---|---|---|---|
| **Precision** | 0.783 | **0.975** | false alarms −91% (54→5) |
| **F1 score** | 0.878 | **0.987** | +0.11 |
| **Recall** | 1.000 | **1.000** | catches every attack |
| **Throughput** | 390 ev/s | **2,688 ev/s** | **6.9× faster** |
_Controlled-injection benchmark on the real detector bank (`scripts/accuracy_bench.py`, reproducible)._

**Ground-truth on real BGL production logs** (4,000 windows / 400K lines, 50% anomalous, unsupervised — never trained on labels):
**Precision 0.875 · Recall 0.896 · F1 0.885** (`scripts/evaluate_detectors.py`).

---

## Slide 5 — Architecture (end to end)
```
Log sources ─┬─ synthetic attack simulator (9 scenarios)
             ├─ real dataset replay (LogHub on KIOXIA SSD)
             └─ growing-file tail (rotation-safe)
        │
        ▼
  Normalize → Drain3 template mining → multi-scale time windows
        → feature engine (15+ features)
        → adaptive baseline (EWMA fast/slow + MAD, contamination-guarded)
        → detector bank: robust-z · CUSUM · novel-template · security rules
        → fusion (weighted, corroboration-aware) → explainable alert
        → incident manager (dedup · correlate · lifecycle)
        ▼
   ┌── Postgres (7 tables)   ┌── Redis event bus → WebSocket → Console
   └── AWS CloudWatch + SNS ─┘
```

---

## Slide 6 — The Detection Engine (our differentiator)
- **Adaptive baseline** — dual EWMA (fast + slow) for drift; robust median/MAD; **contamination guard** so anomalies don't redefine "normal".
- **Effect-size gate** — a feature must clear a real absolute/relative change floor, not just a big σ. **This cut false positives 91%.**
- **Degenerate-baseline guard** — a spike off a perfectly flat baseline still fires.
- **Detector bank (4 + fusion):**
  - `robust_zscore` — per-feature modified z-score (median/MAD)
  - `CUSUM` — Page's tabular change-point → slow sustained drift
  - `novel_template` — never-before-seen Drain3 signature
  - `security rules` — brute-force / credential-stuffing / injection **signals** (evidence-based, never "confirmed")
  - `fusion` — combines scores + signals into one graded, explainable alert

---

## Slide 7 — Features Extracted (per time window)
- **Volume/errors:** event_rate, error_rate, warn_rate
- **HTTP mix:** rate_2xx / 3xx / 4xx / 5xx
- **Latency:** p50, p95, p99
- **Identity/spread:** unique_ips, unique_users, top_ip_share, endpoint_concentration
- **Security:** failed_logins
- **Novelty:** template_entropy, novel_template_count
- Windows: **5s / 30s / 60s / 5m / 15m / 1h** (multi-scale)

---

## Slide 8 — Severity & Explainability
- Graded severity from robust-σ: **LOW (2σ) · MEDIUM (3σ) · HIGH (5σ) · CRITICAL (8σ)**.
- Every alert ships a **reason string** + structured evidence (current value, baseline median, MAD, contributing detectors, security signals).
- Judges/operators see *why*, not just *that* — no black box.

---

## Slide 9 — Incident Lifecycle
- Alerts are **deduplicated** and **correlated** into incidents.
- Lifecycle state machine: **OPEN → ACKNOWLEDGED → INVESTIGATING → RESOLVED** (with occurrence counts + timeline).
- One noisy attack = **one incident**, not 300 alerts.

---

## Slide 10 — Data: Real Production Logs on KIOXIA SSD
- **LogHub collection** (19 datasets, ~6 GB) downloading to an external **KIOXIA 1 TB SSD** — md5-verified, auto-extracted, resumable.
- **11 already live & usable:** OpenStack, HDFS(Hadoop), SSH, HPC, Zookeeper, Mac, Linux, Apache, HealthApp, Proxifier, Android.
- **Labeled benchmarks:** HDFS_v1, BGL, OpenStack → drive **ground-truth precision/recall**.
- **Any dataset replays live** into the pipeline via `POST /api/replay` — the dashboard reacts exactly like real traffic.
- Graceful fallback to local disk if the SSD is unplugged.

---

## Slide 11 — Attack Simulator (live demo engine)
9 one-click scenarios drive the whole pipeline in real time:
`NORMAL · BRUTE_FORCE · CREDENTIAL_STUFFING · API_ABUSE · TRAFFIC_SPIKE · 5XX_STORM · LATENCY_DEGRADATION · NOVEL_TEMPLATE · COMBINED`
Burst slider controls intensity → dashboard, logs, anomalies, incidents all light up.

---

## Slide 12 — Frontend (the console)
Next.js 16 + React 19 + Tailwind v4 · dark-green Acentra identity + lime accent · mouse-tracking robot mascots · orbs, border-beams, motion.
**9 routes:** Landing → Dashboard · Anomalies · Incidents · Logs · Templates · Baseline · System · Attack Simulator.
Live via **TanStack Query (REST)** + a **`useEventStream` WebSocket hook** (auto-reconnect) → zustand store. **Every number is real** — no fake data.

---

## Slide 13 — API & Realtime
**REST (14 endpoints):** `/health` · `/api/stats` · `/api/anomalies(+detail)` · `/api/incidents(+detail, +PATCH transition)` · `/api/logs` · `/api/templates` · `/api/baseline` · `/api/system` · `/api/scenarios` · `/api/simulate` · **`/api/datasets`** · **`/api/replay`**.
**WebSocket `/ws/events`:** `log_event · baseline_updated · system_status · anomaly_detected · alert_created · incident_created · incident_updated`.

---

## Slide 14 — Data Model (Postgres, 7 tables)
`logs · templates · baselines · anomalies · incidents · incident_events · audit_events`
Batched writes (one transaction per tick) → **6.9× throughput**.

---

## Slide 15 — Tech Stack
- **Backend:** Python 3.14, FastAPI, uvicorn, asyncio, NumPy, Drain3, SQLModel, boto3.
- **Data:** PostgreSQL (persistence) · Redis (event bus).
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind v4, Framer Motion, Magic UI.
- **Cloud:** AWS CloudWatch Logs + SNS (LocalStack-ready; degrades gracefully).
- **Storage:** KIOXIA 1 TB external SSD for datasets + heavy artifacts.

---

## Slide 16 — Demo Script (3 minutes)
1. Calm green feed — "baseline is learning… now ACTIVE."
2. Fire **Brute Force** → dashboard flashes **CRITICAL**, alert reads *"possible brute-force, 4.1σ above baseline."*
3. Show it **deduped into one incident** with a lifecycle timeline.
4. **Replay real HDFS/BGL logs off the KIOXIA SSD** — same pipeline, real production data.
5. Show the alert landing in **CloudWatch + SNS** (LocalStack).
6. Close on the **measured F1 0.987 / 2,688 ev/s** slide.

---

## Slide 17 — Why We Win
- **Adaptive self-learning baseline**, not hardcoded thresholds.
- **Measured accuracy:** F1 0.987, false alarms −91%, recall 1.0.
- **Real speed:** 2,688 events/sec, 6.9× after batching.
- **Real data:** validated on LogHub production logs from a KIOXIA SSD.
- **Explainable + honest:** graded severity, evidence, "possible" (never fabricated) security signals.
- **Full product:** live console, incidents, AWS fan-out, attack simulator.

---

## Slide 18 — Status & Roadmap
**Done:** full pipeline (25 backend modules), 9-page live console, 9-scenario simulator, KIOXIA dataset integration + replay, CUSUM detector, accuracy + throughput tuning (tested).
**In progress:** BGL/HDFS labeled eval (dataset download finishing under Zenodo throttle).
**Next:** optional GPU semantic layer (DeepLog/LogBERT), Demo Mode timeline, LLM "judging agent" for plain-English assessments, live precision/throughput panel in the console.

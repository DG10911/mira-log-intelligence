# FINAL IMPLEMENTATION PLAN
## Real-Time Log Intelligence & Security Observability Platform
*(built on the existing Acentra-themed Next.js prototype)*

---

## 0. REALITY CHECK — what actually exists today

Phase-0 discovery (verified by inspection), not assumptions:

| Area | Reality |
|---|---|
| Pages/routes | **One** route: `/` → `src/app/page.tsx` (Acentra marketing landing, dark-green, `"use client"`) |
| Backend | **None** |
| Mock data files | **None** (numbers are inline JSX constants in the landing page) |
| State management | **None** |
| Data fetching | **None** (no axios/react-query/swr) |
| Routing | Next.js App Router, single page |
| Styling | Tailwind v4 + shadcn tokens; **brand tokens** `--brand #17a34a`, `--brand-deep #0b3b2e`, `--brand-mint`, `--brand-accent #4ade80` in `globals.css` |
| Component library | shadcn (accordion, avatar, badge, button, card, dialog, dropdown-menu, input, label, separator, sheet, skeleton, sonner, tabs, tooltip); Magic UI (animated-beam, border-beam, marquee, shimmer-button, text-animate); Aceternity (3d-card, background-beams, spotlight); 23rd (ascii-logo, live-orb); uselayouts (3d-book, bento-card); gooey |
| Utils | `src/lib/utils.ts` (`cn`) |

**Implication:** The spec imagines an existing multi-page dashboard with mock numbers ("17 anomalies", "182,421 events"). That does **not** exist. So we **preserve the design language and component library** (the true "visual source of truth") and **build the platform pages fresh in that exact language**. The landing page is kept as the marketing entry.

---

## 1. RESEARCH FOUNDATION (fact vs decision vs heuristic)

Labeled per the spec's research principle.

- **[FACT] Drain3** — online fixed-depth-tree log template mining (He et al., 2017; LogPAI/Drain3 fork adds masking + persistence). Used for template extraction.
- **[FACT] LogHub datasets** — HDFS, BGL, Thunderbird, OpenStack (LogPAI) are standard log-anomaly benchmarks; we cite them and ship a subset-style synthetic generator (we do **not** claim to train on them at hackathon scale).
- **[FACT] EWMA** — exponentially weighted moving average; standard for adaptive baselines (used by Grafana/Datadog-class tooling).
- **[FACT] Robust z-score / MAD** — Iglewicz & Hoaglin modified z-score `0.6745·(x−median)/MAD`; resistant to the very spikes we detect.
- **[FACT] Isolation Forest** — Liu et al., 2008; unsupervised outlier detection (optional multivariate detector).
- **[FACT] Concept drift** — dual fast/slow baselines is a recognized adaptation strategy.
- **[FACT] AWS** — CloudWatch Logs `put_log_events` (sequence token now ignored), SNS `publish`, subscription filters; boto3 SDK.
- **[FACT] FastAPI** supports native WebSockets on Starlette; Redis pub/sub for fan-out; PostgreSQL for durable state.
- **[DECISION] Hackathon stack:** FastAPI + **SQLite via SQLModel** (zero-setup, survives restart) + **in-process asyncio event bus** behind a `Bus` interface (Redis adapter droppable later) + **LocalStack** for AWS. Rationale: demo reliability at a venue with no infra. Production path (Postgres + Redis) documented and interface-compatible.
- **[HEURISTIC] Severity thresholds** (2σ/3σ/5σ/8σ) and **fusion weights** — configurable, explicitly labeled as tunable heuristics, not scientific truth.

Full citations live in `docs/research.md` (to be created in build).

---

## 2. TARGET ARCHITECTURE (modular monolith)

```
backend/app/
  api/            REST routers (stats, anomalies, incidents, logs, templates, baseline, system, simulate)
  ingestion/      LogSource interface + File/Synthetic/CloudWatch sources
  normalization/  raw line -> LogEvent (pydantic)
  parsing/        Drain3 template miner + persistence
  features/       multi-window feature engine
  detection/      baseline engine + detectors + fusion
  security/       rule engine (brute-force, injection signals, ...)
  incidents/      dedup + correlation + lifecycle
  alerts/         alert builder + explainability
  websocket/      connection manager + event bus + heartbeats/backpressure
  storage/        SQLModel models + repositories + migrations
  aws/            CloudWatch + SNS clients (graceful failure)
  simulator/      attack scenarios + demo orchestrator
  config/         settings (pydantic-settings), DI wiring
  observability/  structured logging, metrics, health
  main.py         app factory, lifespan (start pipeline), router mount
```

---

## 3. FILE-BY-FILE PLAN

> Format per file: **PURPOSE · DEPENDENCIES · INPUTS · OUTPUTS · RELATED · TESTS**

### 3A. Backend — core

**`backend/app/config/settings.py`**
- PURPOSE: typed config (paths, window sizes, thresholds, AWS/LocalStack, DB URL, demo flag).
- DEPENDENCIES: pydantic-settings.
- INPUTS: env vars / `.env`.
- OUTPUTS: `Settings` singleton.
- RELATED: every module.
- TESTS: `test_settings.py` (env override, defaults).

**`backend/app/storage/models.py`**
- PURPOSE: SQLModel tables: `logs, templates, anomalies, incidents, incident_events, baselines, alert_rules, audit_events, model_versions`.
- DEPENDENCIES: sqlmodel, sqlalchemy.
- INPUTS: —.
- OUTPUTS: ORM models + Pydantic schemas.
- RELATED: repositories, api.
- TESTS: `test_models.py` (create/read roundtrip).

**`backend/app/storage/repositories.py`**
- PURPOSE: repository classes (AnomalyRepo, IncidentRepo, LogRepo, TemplateRepo, BaselineRepo, AuditRepo) — all DB access.
- DEPENDENCIES: models, session factory.
- INPUTS: domain objects/filters.
- OUTPUTS: persisted rows / query results.
- RELATED: api routers, incidents, detection.
- TESTS: `test_repositories.py` (filters, pagination, upsert).

**`backend/app/storage/db.py`**
- PURPOSE: engine, session, `init_db()` (create tables), restart recovery load.
- DEPENDENCIES: sqlmodel.
- INPUTS: DB URL.
- OUTPUTS: session dependency.
- RELATED: main lifespan.
- TESTS: `test_db.py`.

### 3B. Backend — ingestion & normalization

**`backend/app/ingestion/base.py`**
- PURPOSE: `LogSource` ABC (`async def stream() -> AsyncIterator[str]`), offset/state contract.
- DEPENDENCIES: abc, asyncio.
- INPUTS: —. OUTPUTS: raw lines.
- RELATED: file/synthetic/cloudwatch sources.
- TESTS: interface conformance in each source test.

**`backend/app/ingestion/file_source.py`**
- PURPOSE: rotation/truncation-safe tailer (inode + size tracking, offset file, partial-line buffering, restart recovery).
- DEPENDENCIES: aiofiles/os.
- INPUTS: file path.
- OUTPUTS: complete lines (no dup/no miss).
- RELATED: normalization.
- TESTS: `test_file_source.py` (rotation, truncation, partial line, restart offset).

**`backend/app/ingestion/synthetic_source.py`**
- PURPOSE: programmatic log generator driven by simulator scenarios.
- DEPENDENCIES: random, simulator profiles.
- INPUTS: scenario config.
- OUTPUTS: raw lines at controlled rates.
- RELATED: simulator, demo mode.
- TESTS: `test_synthetic_source.py` (rate, distribution).

**`backend/app/ingestion/cloudwatch_source.py`** *(optional)*
- PURPOSE: pull from CloudWatch Logs (parity interface).
- DEPENDENCIES: boto3.
- INPUTS: group/stream.
- OUTPUTS: raw lines.
- RELATED: aws.
- TESTS: `test_cloudwatch_source.py` (mocked boto3).

**`backend/app/normalization/normalizer.py`**
- PURPOSE: parse raw line → `LogEvent` (regex/JSON detect; fill level, ip, user_id, endpoint, status_code, latency_ms, metadata); malformed-safe.
- DEPENDENCIES: pydantic, parsing.
- INPUTS: raw line.
- OUTPUTS: `LogEvent`.
- RELATED: features, parsing.
- TESTS: `test_normalizer.py` (json, plain, malformed, missing fields).

**`backend/app/normalization/schema.py`**
- PURPOSE: `LogEvent` pydantic model (event_id, timestamp, source, service, host, level, message, template_id, parameters, ip, user_id, endpoint, status_code, latency_ms, metadata).
- TESTS: covered by normalizer tests.

### 3C. Backend — parsing & features

**`backend/app/parsing/template_miner.py`**
- PURPOSE: Drain3 wrapper; assign `template_id`, track frequency/first_seen/last_seen, persist state, flag novel templates.
- DEPENDENCIES: drain3.
- INPUTS: `LogEvent.message`.
- OUTPUTS: template_id + params + `is_novel`.
- RELATED: features (template freq/entropy), detection (novel template).
- TESTS: `test_template_miner.py` (clustering, novelty, persistence).

**`backend/app/features/windows.py`**
- PURPOSE: multi-scale time windows (5s/30s/1m/5m/15m/1h) with **incremental** deques/ring buffers (no full rescans).
- DEPENDENCIES: collections.
- INPUTS: `LogEvent` stream.
- OUTPUTS: per-window aggregates.
- RELATED: feature engine.
- TESTS: `test_windows.py` (eviction, incremental correctness vs brute force).

**`backend/app/features/engine.py`**
- PURPOSE: compute feature vector (event/error/warn rate, 2xx/3xx/4xx/5xx, latency p50/p95/p99, unique IPs/users, endpoint concentration, template freq/entropy, failed logins, new-template rate, bursts).
- DEPENDENCIES: windows, numpy.
- INPUTS: window aggregates.
- OUTPUTS: `FeatureSnapshot` per tick.
- RELATED: detection, baseline, websocket (metrics).
- TESTS: `test_features.py` (percentiles, rates, entropy).

### 3D. Backend — detection

**`backend/app/detection/baseline.py`**
- PURPOSE: per-feature baseline: mean/median/std/MAD/EWMA + confidence + min-sample; states BOOTSTRAPPING/LEARNING/ACTIVE/DEGRADED; **contamination protection** (don't learn from flagged anomalies); **dual fast/slow** for drift; optional hour/day seasonality buckets.
- DEPENDENCIES: numpy.
- INPUTS: `FeatureSnapshot` + anomaly feedback.
- OUTPUTS: baseline stats + expected range + status/confidence.
- RELATED: detectors, baseline API/page.
- TESTS: `test_baseline.py` (contamination resistance, state transitions, drift).

**`backend/app/detection/detectors.py`**
- PURPOSE: detector set — ZScore, RobustZScore(MAD), EWMADeviation, RateOfChange, TemplateFrequency, NovelTemplate, (optional) IsolationForest, (optional) sequence. Each returns structured **evidence**.
- DEPENDENCIES: baseline, numpy, (sklearn optional).
- INPUTS: `FeatureSnapshot` + baseline.
- OUTPUTS: `DetectorResult[]` (score, deviation, evidence).
- RELATED: fusion.
- TESTS: `test_detectors.py` (each detector, warm-up guard).

**`backend/app/detection/fusion.py`**
- PURPOSE: `AnomalyFusionEngine` — combine detector + security results into final score/confidence/contributing-detectors with **configurable weights** (labeled heuristic).
- DEPENDENCIES: detectors, security.
- INPUTS: detector + security results.
- OUTPUTS: `Anomaly` (score, confidence, evidence, signals).
- RELATED: alerts, incidents.
- TESTS: `test_fusion.py` (weighting, no-double-count).

### 3E. Backend — security, alerts, incidents

**`backend/app/security/rules.py`**
- PURPOSE: configurable rule engine — BRUTE_FORCE, CREDENTIAL_STUFFING, AUTH_FAILURE_SPIKE, API_ABUSE, TRAFFIC_BURST, HTTP_5XX/4XX_SPIKE, SUSPICIOUS_IP_CONCENTRATION, UNUSUAL_ENDPOINT, PATH_TRAVERSAL/SQLI/CMDI signals, SUSPICIOUS_USER_AGENT, ACCOUNT/IP_TARGETING. Emits **signals** with "possible", never "confirmed".
- DEPENDENCIES: features, config.
- INPUTS: `FeatureSnapshot` + recent events.
- OUTPUTS: `SecuritySignal[]` (type, confidence, evidence).
- RELATED: fusion, alerts.
- TESTS: `test_security_rules.py` (each rule, false-positive guards).

**`backend/app/alerts/builder.py`**
- PURPOSE: explainability — build alert answering WHAT/WHY/HOW MUCH/WHEN/WHERE/EVIDENCE; severity from score + config.
- DEPENDENCIES: fusion, config.
- INPUTS: `Anomaly`.
- OUTPUTS: `Alert` (severity, title, reason, deviation, signals, assessment).
- RELATED: incidents, aws, websocket.
- TESTS: `test_alert_builder.py` (explanation completeness).

**`backend/app/incidents/manager.py`**
- PURPOSE: dedup (fingerprint + cooldown + occurrence counters), correlation (time+service+type window → single incident), lifecycle DETECTED→OPEN→ACKNOWLEDGED→INVESTIGATING→RESOLVED, transitions persisted.
- DEPENDENCIES: repositories, alerts.
- INPUTS: `Alert[]`.
- OUTPUTS: `Incident` + `incident_events`.
- RELATED: incidents API/page, websocket.
- TESTS: `test_incidents.py` (dedup, correlation grouping, lifecycle).

### 3F. Backend — realtime, aws, simulator, api, main

**`backend/app/websocket/bus.py`** — PURPOSE: `EventBus` interface + in-process asyncio impl (Redis adapter later); topic publish/subscribe. DEPENDENCIES: asyncio. INPUTS: events. OUTPUTS: fan-out. RELATED: manager, pipeline. TESTS: `test_bus.py`.

**`backend/app/websocket/manager.py`** — PURPOSE: `/ws/events` connection manager: register/cleanup, heartbeat ping/pong, **bounded per-client queues + backpressure** (drop-oldest, never block detector), multi-client. DEPENDENCIES: fastapi, bus. INPUTS: bus events. OUTPUTS: WS frames. RELATED: frontend hook. TESTS: `test_ws_manager.py` (slow client isolation, reconnect).

**`backend/app/aws/cloudwatch.py`** & **`aws/sns.py`** — PURPOSE: put_log_events / publish High+Critical; graceful failure + retry/backoff; LocalStack endpoint. DEPENDENCIES: boto3. INPUTS: alerts. OUTPUTS: AWS writes / degraded status. RELATED: alerts, system health. TESTS: mocked boto3 + failure path.

**`backend/app/simulator/scenarios.py`** & **`simulator/orchestrator.py`** — PURPOSE: attack profiles (NORMAL, BRUTE_FORCE, CREDENTIAL_STUFFING, API_ABUSE, TRAFFIC_SPIKE, 5XX_STORM, LATENCY_DEGRADATION, NOVEL_TEMPLATE, COMBINED) + deterministic timed **DEMO** script. DEPENDENCIES: synthetic_source. INPUTS: scenario id. OUTPUTS: log bursts. RELATED: `/api/simulate`, simulator page. TESTS: `test_simulator.py` (rates, determinism).

**`backend/app/api/*.py`** (routers) — `stats.py, anomalies.py, incidents.py, logs.py, templates.py, baseline.py, system.py, simulate.py` — PURPOSE: REST endpoints (see §6). DEPENDENCIES: repositories, features, manager. INPUTS: query/body. OUTPUTS: JSON (typed). RELATED: frontend api client. TESTS: `test_api_*.py` (TestClient, filters, error/empty states).

**`backend/app/observability/{logging,health,metrics}.py`** — PURPOSE: structured JSON logs, `/health` per-subsystem, throughput/latency counters. TESTS: `test_health.py`.

**`backend/app/main.py`** — PURPOSE: app factory; lifespan starts pipeline (ingest→normalize→parse→features→detect→fuse→alert→incident→bus); mounts routers + `/ws/events`; CORS for Next.js. DEPENDENCIES: all. TESTS: `test_app_boot.py` (startup/shutdown, routes present).

### 3G. Frontend — new (App Router), preserving theme

**`src/app/(marketing)/page.tsx`** — MODIFY (move current landing here). PURPOSE: keep marketing page; add "Launch Console" → `/app/dashboard`. RELATED: existing components. TESTS: render smoke.

**`src/app/(app)/layout.tsx`** — CREATE. PURPOSE: `AppShell` (sidebar nav + topbar with LIVE indicator, connection status, demo-mode toggle, "last updated"), preserving `--brand*` tokens/typography. DEPENDENCIES: new nav components, ws hook. INPUTS: route children. OUTPUTS: shell. RELATED: all app pages. TESTS: nav render + active state.

**`src/app/(app)/dashboard/page.tsx`** — CREATE. PURPOSE: command center: 5 stat cards (Events, Error Rate, Anomalies, Open Incidents, Critical Alerts), charts (error rate, request volume, anomaly score, latency, severity timeline), live alert feed. DATA: REST `/api/stats` + WS. RELATED: charts, feed. TESTS: loading/empty/error + live update.

**`src/app/(app)/{anomalies,incidents,logs,templates,baseline,system,simulator}/page.tsx`** — CREATE (one per spec page §UI map). DATA per §5. TESTS: table render, drawer, filters, states.

**`src/lib/api/client.ts`** — CREATE. PURPOSE: typed fetch wrapper (base URL, error schema). DEPS: —. TESTS: error mapping.

**`src/lib/api/hooks.ts`** — CREATE. PURPOSE: TanStack Query hooks (`useStats`, `useAnomalies`, `useIncidents`, `useLogs`, `useTemplates`, `useBaselines`, `useSystemHealth`). DEPS: @tanstack/react-query, client. TESTS: hook mocks.

**`src/lib/ws/useEventStream.ts`** — CREATE. PURPOSE: WebSocket hook — connect `/ws/events`, reconnect w/ backoff, heartbeat, **bounded buffer**, pause/resume, connection status; feeds zustand. DEPS: zustand. TESTS: reconnect, buffer cap, pause.

**`src/lib/store/liveStore.ts`** — CREATE. PURPOSE: zustand store for live events/metrics/connection/demo-mode. TESTS: reducer actions.

**`src/components/platform/*`** — CREATE: `StatCard`, `SeverityBadge`, `LiveIndicator`, `ConnectionStatus`, `AlertFeed`, `AnomalyTable`, `IncidentTimeline`, `EvidencePanel`, `BaselineChart`, `LogTable` (virtualized), `Filters`, `TimeRangeSelector`, `SystemHealthGrid`, `AttackSimulatorPanel` — all styled with existing tokens/components (Card, Badge, border-beam, etc.). TESTS: per component (states, a11y).

**Dependencies to add:** `@tanstack/react-query`, `zustand`, `recharts`, `react-window`, `date-fns`.

---

## 4. DIAGRAMS

### 4.1 Backend architecture
```
Uvicorn ─ FastAPI app
  └ lifespan → Pipeline task:
     Ingestion → Normalizer → Drain3 → Features(windows) → Baseline
        → Detectors ┐
        Security ───┼→ Fusion → AlertBuilder → IncidentManager → Repos(SQLite)
        (ML opt) ───┘                                   │
                                                        └→ EventBus → WS Manager
                                                        └→ AWS (CloudWatch/SNS)
  REST routers ── Repos ── SQLite
```

### 4.2 Frontend architecture
```
app/(marketing)/  → existing Acentra landing (kept)
app/(app)/ AppShell (sidebar+topbar, brand tokens)
   ├ dashboard  ├ anomalies ├ incidents ├ logs
   ├ templates  ├ baseline  ├ system    └ simulator
Data layer: TanStack Query (REST)  +  useEventStream→zustand (WS live)
UI: existing shadcn/MagicUI/Aceternity components, brand-themed
```

### 4.3 Data-flow
```
log line → raw → LogEvent → template_id + features → baseline compare
 → detectors+security → fusion(score,conf,evidence) → alert(explain)
 → dedup/correlate → incident → {DB persist, WS push, AWS publish} → UI
```

### 4.4 WebSocket event architecture
```
/ws/events (JSON frames, versioned)
 server→client: log_event, anomaly_detected, alert_created,
   incident_created, incident_updated, baseline_updated, system_status, heartbeat
 client→server: subscribe{topics}, pause, resume, pong
 guarantees: heartbeat 15s, reconnect w/ backoff, bounded queue (drop-oldest),
             per-client isolation (slow client never blocks pipeline)
```

### 4.5 Database ER (SQLite/SQLModel; Postgres-compatible)
```
services(id, name, status)
logs(id, ts, service_id→services, level, message, template_id→templates,
     ip, user_id, endpoint, status_code, latency_ms, metadata JSON)   [idx: ts, service_id, template_id]
templates(id, pattern, frequency, first_seen, last_seen, is_novel)
baselines(id, feature, service_id, mean, median, std, mad, ewma,
          confidence, state, updated_at)
anomalies(id, ts, service_id, type, score, confidence, severity,
          status, occurrences, evidence JSON, incident_id→incidents)   [idx: ts, severity, status]
incidents(id, title, severity, status, first_seen, last_seen,
          affected_services JSON, occurrences, fingerprint)            [idx: status, fingerprint]
incident_events(id, incident_id→incidents, ts, from_state, to_state, note)
alert_rules(id, type, enabled, params JSON)
audit_events(id, ts, actor, action, target, detail JSON)
model_versions(id, name, version, created_at, params JSON)
```

### 4.6 Detection pipeline
```
FeatureSnapshot ─┬─ Statistical: ZScore / RobustZ(MAD) / EWMAdev / RateOfChange
                 ├─ Template: frequency spike / novel template
                 ├─ Security: rule signals (possible-*)
                 └─ ML(opt): IsolationForest / sequence
   → Fusion(weights, conf) → Anomaly{score,confidence,evidence,signals}
   (warm-up guard + baseline-contamination guard applied upstream)
```

### 4.7 Incident lifecycle
```
DETECTED → OPEN → ACKNOWLEDGED → INVESTIGATING → RESOLVED
  every transition → incident_events row + incident_updated WS event
  dedup: fingerprint+cooldown → occurrences++ (not new incident)
  correlate: same (service,window,type) anomalies → one incident
```

### 4.8 UI → API → DB mapping (summary; full in §5 & docs/ui-backend-mapping.md)
```
Dashboard cards → GET /api/stats            → features + anomalies/incidents repos
Alert feed      → WS anomaly/alert events   → in-flight (persisted to anomalies)
Anomalies page  → GET /api/anomalies        → anomalies
Incidents page  → GET /api/incidents        → incidents + incident_events
Logs page       → GET /api/logs + WS        → logs
Templates page  → GET /api/templates        → templates
Baseline page   → GET /api/baseline         → baselines
System health   → GET /api/system + /health → observability
Simulator       → POST /api/simulate        → simulator (writes real logs → pipeline)
```

### 4.9 AWS architecture
```
AlertBuilder ─(High/Critical)→ SNS.publish(topic)  → subscribers (email/webhook)
Pipeline events ─────────────→ CloudWatch put_log_events(group/stream)
 endpoint_url = LocalStack (demo) | real AWS (creds via env/IAM, never hardcoded)
 failures: retry+backoff, mark AWS subsystem DEGRADED, never crash pipeline
```

### 4.10 Attack simulation flow
```
UI Simulator button → POST /api/simulate{scenario}
 → orchestrator selects profile → SyntheticLogSource emits realistic lines
 → SAME pipeline (ingest→…→incident) → WS pushes → UI updates LIVE
 DEMO mode: deterministic timeline 00:00 normal → 01:00 critical → 01:45 resolved
 Mode badge always visible (DEMO vs LIVE); production mode = real data only
```

---

## 5. EXISTING UI MAP (current → target)

> The only existing screen is the **landing page**. Everything else is **new**, built in the same design language. Per-item fields as requested.

### Landing page — `src/app/page.tsx` (EXISTING)
- CURRENT PURPOSE: marketing hero for Acentra theme (hero, solutions, stats, testimonials, CTA).
- CURRENT DATA SOURCE: none (inline JSX).
- CURRENT MOCK DATA: hero metric cards `1.42M / 3908 / 218K`; stats `30+ / 40M+ / 50 / 99.9%`; testimonials array.
- TARGET REAL DATA SOURCE: **stays marketing** — mock numbers kept but relabeled as illustrative; add "Launch Console" CTA → `/app/dashboard`.
- TARGET API / WS / DB TABLE: none (marketing).
- TARGET UI CHANGES: move to `(marketing)/`, add console CTA. No redesign.

### Dashboard — `(app)/dashboard` (NEW, uses existing StatCard/Card/border-beam)
- CURRENT: n/a. MOCK: n/a.
- TARGET REAL DATA: features engine + repos.
- TARGET API: `GET /api/stats`. TARGET WS: `anomaly_detected, alert_created, incident_created, system_status, baseline_updated`.
- TARGET DB: anomalies, incidents, logs (aggregates).
- UI: 5 stat cards (Events, Error Rate, Anomalies, Open Incidents, Critical), 5 charts, live feed; loading/empty/error/offline states.

### Anomalies — `(app)/anomalies` (NEW)
- TARGET DATA: anomalies repo. API: `GET /api/anomalies?severity&service&status&range`. WS: `anomaly_detected`. DB: anomalies. UI: table (Time/Severity/Service/Type/Score/Confidence/Status/Occurrences) + evidence drawer.

### Incidents — `(app)/incidents` (NEW)
- TARGET DATA: incidents + incident_events. API: `GET /api/incidents`, `GET /api/incidents/{id}`, `PATCH` state. WS: `incident_created/updated`. DB: incidents, incident_events. UI: list + timeline + affected services + lifecycle actions.

### Logs — `(app)/logs` (NEW)
- TARGET DATA: logs. API: `GET /api/logs` (server-side filter+paginate). WS: `log_event`. DB: logs. UI: **virtualized** stream, search/filter/pause/resume/time-range/severity/service/endpoint/IP, click→structured fields.

### Templates — `(app)/templates` (NEW)
- TARGET DATA: templates. API: `GET /api/templates`. DB: templates. UI: table (ID/Template/Frequency/First/Last/Anomaly) + drill-down.

### Baseline — `(app)/baseline` (NEW)
- TARGET DATA: baselines. API: `GET /api/baseline`. WS: `baseline_updated`. DB: baselines. UI: feature/baseline/current/expected-range/confidence/status/drift + actual-vs-expected chart; header "BASELINE LEARNING 73%".

### System Health — `(app)/system` (NEW)
- TARGET DATA: observability. API: `GET /api/system` + `/health`. WS: `system_status`. UI: HEALTHY/DEGRADED/DOWN grid (Backend, Redis/Bus, DB, WebSocket, AWS, Detector, Ingestion).

### Attack Simulator — `(app)/simulator` (NEW, first-class demo)
- TARGET DATA: simulator. API: `POST /api/simulate`, `POST /api/demo/start`. WS: all (drives live). UI: scenario buttons + demo timeline + DEMO/LIVE mode badge.

*(Detailed version persisted in `docs/ui-backend-mapping.md`.)*

---

## 6. API + WS CONTRACT (summary)
- `GET /api/stats` → `{events, error_rate, anomalies, open_incidents, critical_alerts, updated_at}`
- `GET /api/anomalies`, `/api/anomalies/{id}` (evidence)
- `GET /api/incidents`, `/api/incidents/{id}`, `PATCH /api/incidents/{id}` (state)
- `GET /api/logs`, `GET /api/templates`, `GET /api/baseline`, `GET /api/system`, `GET /health`
- `POST /api/simulate {scenario}`, `POST /api/demo/start`
- `WS /ws/events` (see §4.4). All responses include typed error schema `{error, detail}`.

---

## 7. DEVELOPMENT PHASES (maps to spec)
0 Discovery ✅ · 1 Contracts · 2 Backend foundation (config/db/health) · 3 Ingestion · 4 Log intelligence (Drain3/features/windows) · 5 Detection (baseline/detectors/security/fusion) · 6 Incidents · 7 Real-time (WS/bus) · 8 Connect UI · 9 AWS · 10 Simulator · 11 Testing · 12 Performance · 13 Polish + 5 audits.

## 8. RISKS
- **Infra at venue** → mitigated by SQLite + in-process bus + LocalStack (no external services required).
- **Node/Python coexistence** → backend in `backend/`, frontend stays root; `concurrently` dev script.
- **Perf under burst** → incremental windows, bounded WS queues, virtualized log list, server-side filtering.
- **Baseline contamination / false positives** → contamination guard, warm-up, robust MAD, configurable thresholds.
- **Scope** → phase-gated; demo-critical path (ingest→detect→WS→dashboard→simulator) first.

## 9. PRESERVE / IMPROVE / NOT CHANGE
- **PRESERVE:** brand tokens, typography, component library, dark-green identity, landing page, motion/orb aesthetic.
- **IMPROVE:** add AppShell, real data wiring, live indicators, states, virtualization, a11y.
- **NOT CHANGE:** visual identity, color system, existing component internals (reuse, don't rewrite), the marketing page design.

---

*Awaiting `START BUILD`. On approval, implementation proceeds in logical commits per phase, demo-critical path first.*

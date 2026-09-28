export interface Stats {
  events: number;
  error_rate: number;
  event_rate: number;
  anomalies: number;
  open_incidents: number;
  critical_alerts: number;
  baseline_state: string;
  baseline_confidence: number;
  latency_p95: number;
}

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Anomaly {
  id: number;
  ts: string;
  service: string;
  type: string;
  score: number;
  confidence: number;
  severity: Severity;
  status: string;
  occurrences: number;
  title: string;
  reason: string;
  evidence: Record<string, unknown>;
  incident_id: number | null;
}

export interface Incident {
  id: number;
  title: string;
  severity: Severity;
  status: string;
  first_seen: string;
  last_seen: string;
  affected_services: string[];
  occurrences: number;
  fingerprint: string;
  events?: IncidentEvent[];
}

export interface IncidentEvent {
  id: number;
  incident_id: number;
  ts: string;
  from_state: string | null;
  to_state: string;
  note: string;
}

export interface LogRow {
  id: number;
  ts: string;
  service: string;
  level: string;
  message: string;
  template_id: string | null;
  ip: string | null;
  endpoint: string | null;
  status_code: number | null;
  latency_ms: number | null;
}

export interface TemplateRow {
  id: string;
  pattern: string;
  frequency: number;
  first_seen: string;
  last_seen: string;
  is_novel: boolean;
}

export interface BaselineStat {
  feature: string;
  mean: number;
  median: number;
  std: number;
  mad: number;
  ewma_fast: number;
  ewma_slow: number;
  confidence: number;
  state: string;
  n: number;
}

export interface SystemHealth {
  backend: string;
  redis: string;
  postgres: string;
  websocket: string;
  aws: string;
  detector: string;
  ingestion: string;
  events_processed: number;
}

export interface WsEvent {
  type:
    | "log_event"
    | "anomaly_detected"
    | "alert_created"
    | "incident_created"
    | "incident_updated"
    | "baseline_updated"
    | "system_status"
    | "heartbeat";
  ts?: string;
  data: Record<string, unknown>;
}

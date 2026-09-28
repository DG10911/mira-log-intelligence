"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiGet, apiPatch, apiPost } from "./client";
import type {
  Anomaly,
  BaselineStat,
  DatasetList,
  Incident,
  LogRow,
  QualityMetrics,
  Stats,
  SystemHealth,
  TemplateRow,
} from "./types";

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => apiGet<Stats>("/api/stats"),
    refetchInterval: 4000,
  });
}

export function useAnomalies(params: { severity?: string; status?: string } = {}) {
  const q = new URLSearchParams();
  if (params.severity) q.set("severity", params.severity);
  if (params.status) q.set("status", params.status);
  const qs = q.toString();
  return useQuery({
    queryKey: ["anomalies", params],
    queryFn: () => apiGet<Anomaly[]>(`/api/anomalies${qs ? `?${qs}` : ""}`),
    refetchInterval: 5000,
  });
}

export function useIncidents(status?: string) {
  return useQuery({
    queryKey: ["incidents", status],
    queryFn: () => apiGet<Incident[]>(`/api/incidents${status ? `?status=${status}` : ""}`),
    refetchInterval: 5000,
  });
}

export function useIncident(id: number | null) {
  return useQuery({
    queryKey: ["incident", id],
    queryFn: () => apiGet<Incident>(`/api/incidents/${id}`),
    enabled: id != null,
  });
}

export function useTransitionIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; to_state: string; note?: string }) =>
      apiPatch<Incident>(`/api/incidents/${v.id}`, { to_state: v.to_state, note: v.note ?? "" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["incident"] });
    },
  });
}

export function useLogs(params: { service?: string; level?: string } = {}) {
  const q = new URLSearchParams();
  if (params.service) q.set("service", params.service);
  if (params.level) q.set("level", params.level);
  const qs = q.toString();
  return useQuery({
    queryKey: ["logs", params],
    queryFn: () => apiGet<LogRow[]>(`/api/logs${qs ? `?${qs}` : ""}`),
    refetchInterval: 3000,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => apiGet<TemplateRow[]>("/api/templates"),
    refetchInterval: 6000,
  });
}

export function useBaselines() {
  return useQuery({
    queryKey: ["baseline"],
    queryFn: () => apiGet<BaselineStat[]>("/api/baseline"),
    refetchInterval: 4000,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ["system"],
    queryFn: () => apiGet<SystemHealth>("/api/system"),
    refetchInterval: 4000,
  });
}

export function useScenarios() {
  return useQuery({ queryKey: ["scenarios"], queryFn: () => apiGet<string[]>("/api/scenarios") });
}

export function useSimulate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { scenario: string; count: number }) =>
      apiPost<{ scenario: string; injected: number }>("/api/simulate", v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["anomalies"] });
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useDatasets() {
  return useQuery({
    queryKey: ["datasets"],
    queryFn: () => apiGet<DatasetList>("/api/datasets"),
    staleTime: 30_000,
  });
}

export function useReplay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { path: string; rate_hz?: number; max_lines?: number }) =>
      apiPost<{ replaying: string; rate_hz: number; max_lines: number }>("/api/replay", v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useQualityMetrics() {
  return useQuery({
    queryKey: ["quality"],
    queryFn: () => apiGet<QualityMetrics>("/api/metrics/quality"),
    refetchInterval: 2000,
  });
}

export function useStartDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<{ demo: string; duration_s: number }>("/api/demo/start", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

"use client";

import { create } from "zustand";

import type { WsEvent } from "@/lib/api/types";

export type ConnStatus = "connecting" | "connected" | "disconnected";

export interface FeedItem {
  id: string;
  type: WsEvent["type"];
  ts: string;
  data: Record<string, unknown>;
}

interface LiveState {
  status: ConnStatus;
  lastUpdated: number | null;
  logBuffer: FeedItem[];
  alertBuffer: FeedItem[];
  ratePoints: { t: number; error_rate: number; events: number }[];
  paused: boolean;
  baseline: { state: string; confidence: number };
  setStatus: (s: ConnStatus) => void;
  setPaused: (p: boolean) => void;
  push: (e: WsEvent) => void;
}

const MAX = 200;
const MAX_POINTS = 60;

export const useLiveStore = create<LiveState>((set, get) => ({
  status: "connecting",
  lastUpdated: null,
  logBuffer: [],
  alertBuffer: [],
  ratePoints: [],
  paused: false,
  baseline: { state: "BOOTSTRAPPING", confidence: 0 },
  setStatus: (s) => set({ status: s }),
  setPaused: (p) => set({ paused: p }),
  push: (e) => {
    if (e.type === "heartbeat") {
      set({ lastUpdated: Date.now() });
      return;
    }
    const state = get();
    const item: FeedItem = {
      id: `${e.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: e.type,
      ts: e.ts ?? new Date().toISOString(),
      data: e.data,
    };
    const patch: Partial<LiveState> = { lastUpdated: Date.now() };

    if (e.type === "baseline_updated") {
      patch.baseline = {
        state: String(e.data.state ?? state.baseline.state),
        confidence: Number(e.data.confidence ?? state.baseline.confidence),
      };
    }
    if (e.type === "system_status") {
      const er = Number(e.data.error_rate ?? 0);
      const ev = Number(e.data.events ?? 0);
      patch.ratePoints = [...state.ratePoints, { t: Date.now(), error_rate: er, events: ev }].slice(-MAX_POINTS);
    }
    if (state.paused) {
      set(patch);
      return;
    }
    if (e.type === "log_event") {
      patch.logBuffer = [item, ...state.logBuffer].slice(0, MAX);
    }
    if (e.type === "anomaly_detected" || e.type === "alert_created" || e.type === "incident_created") {
      patch.alertBuffer = [item, ...state.alertBuffer].slice(0, MAX);
    }
    set(patch);
  },
}));

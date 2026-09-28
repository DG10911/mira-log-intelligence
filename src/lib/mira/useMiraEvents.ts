"use client";

/**
 * useMiraEvents — the ONLY bridge between real application events and MIRA.
 *
 * It subscribes to the live WebSocket store (the same events the rest of the
 * product consumes) and translates them into MiraController intents. There are
 * NO invented timers, random reactions, or fake events here — MIRA reacts only
 * to what the backend actually emitted.
 *
 * Mount once, high in the tree (AppShell). Safe to run alongside the console.
 */
import { useEffect } from "react";

import {
  SEVERITY_BUBBLE,
  SEVERITY_TO_REACTION,
  TONE_COLOR,
} from "@/components/mira/MiraState";
import { dispatchMira } from "@/components/mira/MiraController";
import type { Severity } from "@/lib/api/types";
import { useLiveStore } from "@/lib/store/liveStore";

function isSeverity(v: unknown): v is Severity {
  return v === "LOW" || v === "MEDIUM" || v === "HIGH" || v === "CRITICAL";
}

export function useMiraEvents() {
  useEffect(() => {
    let lastAlertId: string | null = null;
    let lastBaselineState = "";

    const handle = (state: ReturnType<typeof useLiveStore.getState>) => {
      // --- alerts / anomalies / incidents (real WS payloads) ---
      const top = state.alertBuffer[0];
      if (top && top.id !== lastAlertId) {
        lastAlertId = top.id;
        const d = top.data as Record<string, unknown>;
        const severity: Severity = isSeverity(d.severity) ? d.severity : "LOW";
        const isIncident = top.type === "incident_created";
        const reaction = SEVERITY_TO_REACTION[severity];
        const service = typeof d.service === "string" ? d.service : undefined;
        const title = typeof d.title === "string" ? d.title : SEVERITY_BUBBLE[severity];

        // Dedup key: an incident groups many anomalies — key on the incident id
        // when present so a storm collapses into one MIRA reaction.
        const key = `${severity}:${d.incident_id ?? d.id ?? title}`;

        dispatchMira({
          reaction,
          key,
          bubble: {
            text: isIncident ? "Incident opened" : SEVERITY_BUBBLE[severity],
            detail: service ? `${severity} · ${title} · ${service}` : `${severity} · ${title}`,
            tone: reaction === "CRITICAL_ALERT" ? "red" : severity === "HIGH" || severity === "MEDIUM" ? "amber" : "brand",
          },
        });
      }

      // --- baseline coming online = a calm, positive beat (no bubble spam) ---
      const bs = state.baseline.state;
      if (bs && bs !== lastBaselineState) {
        if (lastBaselineState && lastBaselineState !== "ACTIVE" && bs === "ACTIVE") {
          dispatchMira({ reaction: "HAPPY", key: "baseline-active" });
        }
        lastBaselineState = bs;
      }
    };

    // Prime with current state, then subscribe to future changes.
    handle(useLiveStore.getState());
    const unsub = useLiveStore.subscribe(handle);
    return unsub;
  }, []);
}

/** Colour helper re-exported for views that render the alert ring/glow. */
export { TONE_COLOR };

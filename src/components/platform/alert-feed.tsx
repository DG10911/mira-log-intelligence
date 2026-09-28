"use client";

import { Pause, Play } from "lucide-react";

import { useLiveStore } from "@/lib/store/liveStore";
import { SeverityBadge, EmptyState } from "@/components/platform/shared";
import type { Severity } from "@/lib/api/types";

export function AlertFeed() {
  const alerts = useLiveStore((s) => s.alertBuffer);
  const paused = useLiveStore((s) => s.paused);
  const setPaused = useLiveStore((s) => s.setPaused);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <h3 className="text-sm font-semibold">Live Alert Feed</h3>
        <button
          onClick={() => setPaused(!paused)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:bg-white/5"
        >
          {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
          {paused ? "Resume" : "Pause"}
        </button>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-3">
        {alerts.length === 0 ? (
          <EmptyState label="No alerts yet — run the Attack Simulator." />
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => {
              const d = a.data as Record<string, unknown>;
              return (
                <li key={a.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{String(d.title ?? a.type)}</span>
                    <SeverityBadge severity={(d.severity as Severity) ?? "LOW"} />
                  </div>
                  <div className="mt-1 text-xs text-white/50">{String(d.assessment ?? d.reason ?? "")}</div>
                  <div className="mt-1 text-[11px] text-white/30">
                    {String(d.service ?? "platform")} · {new Date(a.ts).toLocaleTimeString()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

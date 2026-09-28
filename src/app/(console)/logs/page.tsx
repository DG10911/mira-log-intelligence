"use client";

import { Pause, Play } from "lucide-react";

import { useLiveStore } from "@/lib/store/liveStore";
import { PageHeader, EmptyState } from "@/components/platform/shared";

const LEVEL_COLOR: Record<string, string> = {
  ERROR: "text-red-400",
  CRITICAL: "text-red-400",
  WARN: "text-amber-300",
  INFO: "text-white/70",
  DEBUG: "text-white/40",
};

export default function LogsPage() {
  const logs = useLiveStore((s) => s.logBuffer);
  const paused = useLiveStore((s) => s.paused);
  const setPaused = useLiveStore((s) => s.setPaused);

  return (
    <div>
      <PageHeader title="Live Logs" subtitle="Real-time stream (bounded buffer, newest first)" />
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setPaused(!paused)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
        >
          {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
          {paused ? "Resume stream" : "Pause stream"}
        </button>
        <span className="text-xs text-white/40">{logs.length} buffered</span>
      </div>

      {logs.length === 0 ? (
        <EmptyState label="Waiting for log events — run the simulator." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30 font-mono text-xs">
          <div className="max-h-[70vh] overflow-y-auto">
            {logs.map((l) => {
              const d = l.data as Record<string, unknown>;
              const level = String(d.level ?? "INFO");
              return (
                <div key={l.id} className="flex gap-3 border-b border-white/5 px-4 py-1.5 hover:bg-white/[0.03]">
                  <span className="shrink-0 text-white/30">{new Date(l.ts).toLocaleTimeString()}</span>
                  <span className={`w-14 shrink-0 font-semibold ${LEVEL_COLOR[level] ?? "text-white/60"}`}>{level}</span>
                  <span className="w-28 shrink-0 truncate text-brand-accent/70">{String(d.service ?? "")}</span>
                  <span className="w-12 shrink-0 text-white/50">{d.status_code != null ? String(d.status_code) : ""}</span>
                  <span className="flex-1 truncate text-white/80">
                    {String(d.message ?? "")}
                    {d.novel ? <span className="ml-2 rounded bg-amber-500/20 px-1 text-amber-300">NOVEL</span> : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

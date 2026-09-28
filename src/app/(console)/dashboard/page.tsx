"use client";

import { useStats } from "@/lib/api/hooks";
import { AlertFeed } from "@/components/platform/alert-feed";
import { ErrorRateChart, EventVolumeChart } from "@/components/platform/charts";
import { PageHeader, StatCard, StateBadge } from "@/components/platform/shared";

export default function DashboardPage() {
  const { data, isLoading, isError } = useStats();

  return (
    <div>
      <PageHeader title="Command Center" subtitle="Real-time log intelligence & security observability" />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Events" value={isLoading ? "—" : (data?.events ?? 0).toLocaleString()} hint="ingested" />
        <StatCard
          label="Error Rate"
          value={isLoading ? "—" : `${((data?.error_rate ?? 0) * 100).toFixed(2)}%`}
          tone={(data?.error_rate ?? 0) > 0.1 ? "critical" : "good"}
          hint="30s window"
        />
        <StatCard label="Anomalies" value={isLoading ? "—" : data?.anomalies ?? 0} tone="warn" />
        <StatCard label="Open Incidents" value={isLoading ? "—" : data?.open_incidents ?? 0} />
        <StatCard
          label="Critical Alerts"
          value={isLoading ? "—" : data?.critical_alerts ?? 0}
          tone={(data?.critical_alerts ?? 0) > 0 ? "critical" : "default"}
        />
      </div>

      {isError && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          Backend unavailable. Start it: <code>cd backend &amp;&amp; uv run uvicorn app.main:app --port 8000</code>
        </div>
      )}

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3">
        <span className="text-xs uppercase tracking-wider text-white/40">Baseline</span>
        <StateBadge state={data?.baseline_state ?? "BOOTSTRAPPING"} />
        <div className="ml-auto flex items-center gap-2 text-xs text-white/50">
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-lime transition-all"
              style={{ width: `${Math.round((data?.baseline_confidence ?? 0) * 100)}%` }}
            />
          </div>
          {Math.round((data?.baseline_confidence ?? 0) * 100)}%
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ErrorRateChart />
          <EventVolumeChart />
        </div>
        <AlertFeed />
      </div>
    </div>
  );
}

"use client";

import { useSystemHealth } from "@/lib/api/hooks";
import { ErrorState, LoadingState, PageHeader, StateBadge } from "@/components/platform/shared";

const LABELS: Record<string, string> = {
  backend: "Backend (FastAPI)",
  redis: "Redis (event bus)",
  postgres: "PostgreSQL",
  websocket: "WebSocket",
  aws: "AWS (CloudWatch/SNS)",
  detector: "Detection Engine",
  ingestion: "Ingestion",
};

export default function SystemPage() {
  const { data, isLoading, isError } = useSystemHealth();

  return (
    <div>
      <PageHeader title="System Health" subtitle="Subsystem status across the platform" />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Object.entries(LABELS).map(([key, label]) => {
              const status = String((data as unknown as Record<string, unknown>)?.[key] ?? "UNKNOWN");
              return (
                <div key={key} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-sm font-medium text-white">{label}</div>
                  <div className="mt-3"><StateBadge state={status} /></div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
            Events processed: <span className="font-semibold text-white">{data?.events_processed?.toLocaleString() ?? 0}</span>
          </div>
        </>
      )}
    </div>
  );
}

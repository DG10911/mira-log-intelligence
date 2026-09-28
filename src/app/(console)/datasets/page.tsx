"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Database, HardDrive, Play, Tag } from "lucide-react";

import { useDatasets, useReplay } from "@/lib/api/hooks";
import { PageHeader, ErrorState, LoadingState, EmptyState } from "@/components/platform/shared";

export default function DatasetsPage() {
  const { data, isLoading, error } = useDatasets();
  const replay = useReplay();
  const [rate, setRate] = useState(2000);
  const [maxLines, setMaxLines] = useState(20000);

  const fire = (path: string, key: string) => {
    replay.mutate(
      { path, rate_hz: rate, max_lines: maxLines },
      {
        onSuccess: () =>
          toast.success(`Replaying ${key} — up to ${maxLines.toLocaleString()} lines @ ${rate}/s`),
        onError: () => toast.error("Replay failed — is the backend running?"),
      },
    );
  };

  if (error) return <ErrorState message="Failed to load datasets. Is the backend running on :8000?" />;

  return (
    <div>
      <PageHeader
        title="Real Datasets"
        subtitle="Replay real production logs (LogHub) from the KIOXIA SSD through the live detection pipeline"
      />

      {data && (
        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm">
          <span className="flex items-center gap-2 text-white/70">
            <HardDrive className="size-4 text-brand-accent" />
            <code className="text-brand-accent">{data.data_root}</code>
          </span>
          <span className="text-white/50">
            <span className="font-semibold text-white">{data.count}</span> log files discovered
          </span>
          <div className="ml-auto flex items-center gap-4">
            <label className="flex items-center gap-2 text-white/60">
              Rate
              <input
                type="range" min={200} max={8000} step={200} value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="accent-brand"
              />
              <span className="w-16 tabular-nums text-brand-accent">{rate}/s</span>
            </label>
            <label className="flex items-center gap-2 text-white/60">
              Max lines
              <select
                value={maxLines}
                onChange={(e) => setMaxLines(Number(e.target.value))}
                className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-white"
              >
                {[5000, 20000, 50000, 200000].map((n) => (
                  <option key={n} value={n}>{n.toLocaleString()}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {isLoading && <LoadingState label="Scanning KIOXIA SSD…" />}

      {!isLoading && data && data.datasets.length === 0 && (
        <EmptyState label="No datasets found on the SSD. Run scripts/download_datasets.py." />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.datasets ?? []).map((d) => (
          <div
            key={d.path}
            className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-all hover:-translate-y-0.5 hover:border-brand/40"
          >
            <div className="flex items-start justify-between">
              <div className="grid size-11 place-items-center rounded-lg bg-brand-mint/10 text-brand-accent">
                <Database className="size-5" />
              </div>
              {d.has_labels && (
                <span className="flex items-center gap-1 rounded-full bg-lime/15 px-2 py-0.5 text-[11px] font-semibold text-lime">
                  <Tag className="size-3" /> LABELED
                </span>
              )}
            </div>
            <div>
              <div className="font-semibold">{d.key}</div>
              <div className="mt-0.5 text-xs text-white/50">
                {d.size_mb.toLocaleString()} MB · ~{d.lines_estimate.toLocaleString()} lines
              </div>
              <div className="mt-1 truncate text-[11px] text-white/30" title={d.path}>
                {d.path}
              </div>
            </div>
            <button
              onClick={() => fire(d.path, d.key)}
              disabled={replay.isPending}
              className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-brand/30 bg-brand/10 py-2 text-sm font-semibold text-brand-accent transition-colors hover:bg-brand/20 disabled:opacity-50"
            >
              <Play className="size-4" /> Replay through pipeline
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

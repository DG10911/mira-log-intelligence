"use client";

import { Award, Gauge, Target, Zap } from "lucide-react";

import { useQualityMetrics } from "@/lib/api/hooks";

function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/40">
        <Icon className="size-3.5 text-brand-accent" /> {label}
      </div>
      <div className="text-2xl font-bold tabular-nums text-lime">{value}</div>
      <div className="text-xs text-white/50">{sub}</div>
    </div>
  );
}

export function QualityPanel() {
  const { data: q } = useQualityMetrics();
  if (!q) return null;

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
        <Award className="size-3.5 text-lime" /> Detection quality (measured, reproducible)
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric
          icon={Target}
          label="F1 · real BGL logs"
          value={q.labeled.f1.toFixed(3)}
          sub={`P ${q.labeled.precision.toFixed(2)} · R ${q.labeled.recall.toFixed(2)} · unsupervised`}
        />
        <Metric
          icon={Award}
          label="F1 · benchmark"
          value={q.controlled.f1_after.toFixed(3)}
          sub={`precision ${q.controlled.precision_after.toFixed(3)} · recall ${q.controlled.recall_after.toFixed(2)}`}
        />
        <Metric
          icon={Zap}
          label="Throughput"
          value={`${q.throughput.events_per_sec_peak.toLocaleString()}/s`}
          sub={`live ${q.throughput.events_per_sec_live.toLocaleString()}/s · ${q.throughput.speedup}× vs per-line`}
        />
        <Metric
          icon={Gauge}
          label="False positives"
          value={`−${Math.round(
            (1 - q.controlled.false_positives_after / q.controlled.false_positives_before) * 100,
          )}%`}
          sub={`${q.controlled.false_positives_before} → ${q.controlled.false_positives_after} after tuning`}
        />
      </div>
    </div>
  );
}

"use client";

import { useBaselines } from "@/lib/api/hooks";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StateBadge,
} from "@/components/platform/shared";

export default function BaselinePage() {
  const { data, isLoading, isError } = useBaselines();

  return (
    <div>
      <PageHeader title="Adaptive Baseline" subtitle="Per-feature normal behavior (EWMA + MAD, contamination-guarded)" />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !data || data.length === 0 ? (
        <EmptyState label="Baseline is bootstrapping…" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-4 py-3">Feature</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Median</th>
                <th className="px-4 py-3">MAD</th>
                <th className="px-4 py-3">EWMA (fast/slow)</th>
                <th className="px-4 py-3">Samples</th>
                <th className="px-4 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((b) => (
                <tr key={b.feature} className="bg-white/[0.01] hover:bg-white/[0.04]">
                  <td className="px-4 py-3 font-medium">{b.feature}</td>
                  <td className="px-4 py-3"><StateBadge state={b.state} /></td>
                  <td className="px-4 py-3 tabular-nums text-white/70">{b.median.toFixed(3)}</td>
                  <td className="px-4 py-3 tabular-nums text-white/70">{b.mad.toFixed(3)}</td>
                  <td className="px-4 py-3 tabular-nums text-white/50">
                    {b.ewma_fast.toFixed(2)} / {b.ewma_slow.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-white/50">{b.n}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-lime" style={{ width: `${Math.round(b.confidence * 100)}%` }} />
                      </div>
                      <span className="text-xs text-white/50">{Math.round(b.confidence * 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

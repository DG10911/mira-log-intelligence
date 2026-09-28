"use client";

import { useState } from "react";

import { useAnomalies } from "@/lib/api/hooks";
import type { Anomaly } from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SeverityBadge,
} from "@/components/platform/shared";

const SEVERITIES = ["", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function AnomaliesPage() {
  const [severity, setSeverity] = useState("");
  const { data, isLoading, isError } = useAnomalies({ severity: severity || undefined });
  const [selected, setSelected] = useState<Anomaly | null>(null);

  return (
    <div>
      <PageHeader title="Anomalies" subtitle="Detected deviations with explainable evidence" />

      <div className="mb-4 flex gap-2">
        {SEVERITIES.map((s) => (
          <button
            key={s || "all"}
            onClick={() => setSeverity(s)}
            className={`rounded-md border px-3 py-1 text-xs font-medium ${
              severity === s ? "border-brand/40 bg-brand/15 text-brand-accent" : "border-white/10 text-white/60 hover:bg-white/5"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !data || data.length === 0 ? (
        <EmptyState label="No anomalies detected yet." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Conf.</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className="cursor-pointer bg-white/[0.01] hover:bg-white/[0.04]"
                >
                  <td className="px-4 py-3 text-white/60">{new Date(a.ts).toLocaleTimeString()}</td>
                  <td className="px-4 py-3"><SeverityBadge severity={a.severity} /></td>
                  <td className="px-4 py-3">{a.title}</td>
                  <td className="px-4 py-3 text-white/60">{a.service}</td>
                  <td className="px-4 py-3 tabular-nums">{a.score.toFixed(2)}</td>
                  <td className="px-4 py-3 tabular-nums text-white/60">{(a.confidence * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-white/60">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#04160e] text-white">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selected.title} <SeverityBadge severity={selected.severity} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="text-white/70">{selected.reason}</p>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <Info label="Score" value={selected.score.toFixed(2)} />
                  <Info label="Confidence" value={`${(selected.confidence * 100).toFixed(0)}%`} />
                  <Info label="Occurrences" value={String(selected.occurrences)} />
                </div>
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wider text-white/40">Evidence</div>
                  <pre className="max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-brand-accent/80">
                    {JSON.stringify(selected.evidence, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="text-white/40">{label}</div>
      <div className="mt-1 text-base font-semibold text-white">{value}</div>
    </div>
  );
}

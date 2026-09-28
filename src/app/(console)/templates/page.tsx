"use client";

import { useTemplates } from "@/lib/api/hooks";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/platform/shared";

export default function TemplatesPage() {
  const { data, isLoading, isError } = useTemplates();

  return (
    <div>
      <PageHeader title="Log Templates" subtitle="Online template mining via Drain3" />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !data || data.length === 0 ? (
        <EmptyState label="No templates mined yet." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Frequency</th>
                <th className="px-4 py-3">Last Seen</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((t) => (
                <tr key={t.id} className="bg-white/[0.01] hover:bg-white/[0.04]">
                  <td className="px-4 py-3 font-mono text-brand-accent/80">{t.id}</td>
                  <td className="px-4 py-3 font-mono text-white/70">{t.pattern}</td>
                  <td className="px-4 py-3 tabular-nums">{t.frequency.toLocaleString()}</td>
                  <td className="px-4 py-3 text-white/50">{new Date(t.last_seen).toLocaleTimeString()}</td>
                  <td className="px-4 py-3">
                    {t.is_novel ? (
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">NOVEL</span>
                    ) : (
                      <span className="text-xs text-white/40">known</span>
                    )}
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

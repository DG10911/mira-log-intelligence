"use client";

import { useState } from "react";

import { useIncident, useIncidents, useTransitionIncident } from "@/lib/api/hooks";
import { dispatchMira } from "@/components/mira/MiraController";
import { Button } from "@/components/ui/button";
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

const NEXT_STATE: Record<string, string> = {
  OPEN: "ACKNOWLEDGED",
  ACKNOWLEDGED: "INVESTIGATING",
  INVESTIGATING: "RESOLVED",
};

export default function IncidentsPage() {
  const { data, isLoading, isError } = useIncidents();
  const [openId, setOpenId] = useState<number | null>(null);
  const detail = useIncident(openId);
  const transition = useTransitionIncident();

  return (
    <div>
      <PageHeader title="Incidents" subtitle="Correlated, deduplicated, with full lifecycle" />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !data || data.length === 0 ? (
        <EmptyState label="No incidents yet." />
      ) : (
        <div className="space-y-3">
          {data.map((inc) => (
            <div
              key={inc.id}
              className="flex cursor-pointer items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
              onClick={() => setOpenId(inc.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpenId(inc.id);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`View incident: ${inc.title}, ${inc.severity}`}
            >
              <SeverityBadge severity={inc.severity} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{inc.title}</div>
                <div className="text-xs text-white/40">
                  #{inc.id} · {inc.affected_services.join(", ")} · {inc.occurrences} occurrence(s)
                </div>
              </div>
              <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/60">{inc.status}</span>
              <span className="text-xs text-white/30">{new Date(inc.last_seen).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}

      <Dialog open={openId != null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#04160e] text-white">
          {detail.data && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {detail.data.title} <SeverityBadge severity={detail.data.severity} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs">{detail.data.status}</span>
                  {NEXT_STATE[detail.data.status] && (
                    <Button
                      size="sm"
                      className="h-7 bg-brand text-white hover:bg-brand/90"
                      disabled={transition.isPending}
                      onClick={() => {
                        const to = NEXT_STATE[detail.data!.status];
                        transition.mutate(
                          { id: detail.data!.id, to_state: to },
                          {
                            onSuccess: () => {
                              // Real user action → MIRA's calm "resolved" beat.
                              if (to === "RESOLVED") {
                                dispatchMira({
                                  reaction: "SUCCESS",
                                  key: `resolved-${detail.data!.id}`,
                                  bubble: { text: "Incident resolved", detail: `#${detail.data!.id} · back to calm`, tone: "brand" },
                                });
                              }
                            },
                          },
                        );
                      }}
                    >
                      → {NEXT_STATE[detail.data.status]}
                    </Button>
                  )}
                </div>
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wider text-white/40">Lifecycle timeline</div>
                  <ol className="relative space-y-3 border-l border-white/10 pl-5">
                    {(detail.data.events ?? []).map((e) => (
                      <li key={e.id} className="relative">
                        <span className="absolute -left-[23px] top-1 size-2.5 rounded-full bg-brand-accent" />
                        <div className="text-sm">
                          {e.from_state ? `${e.from_state} → ` : ""}
                          <span className="font-medium">{e.to_state}</span>
                        </div>
                        <div className="text-xs text-white/40">{new Date(e.ts).toLocaleString()} · {e.note}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

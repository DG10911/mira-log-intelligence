"use client";

import { motion } from "motion/react";
import { AlertTriangle, Loader2, Inbox } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLiveStore } from "@/lib/store/liveStore";
import { BorderBeam } from "@/components/ui/border-beam";
import type { Severity } from "@/lib/api/types";

const SEV_STYLES: Record<Severity, string> = {
  CRITICAL: "bg-red-500/15 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  LOW: "bg-brand/15 text-brand-accent border-brand/30",
};

export function SeverityBadge({ severity }: { severity: Severity | string }) {
  const s = (severity as Severity) in SEV_STYLES ? (severity as Severity) : "LOW";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", SEV_STYLES[s])}>
      {severity}
    </span>
  );
}

const STATE_DOT: Record<string, string> = {
  HEALTHY: "bg-brand-accent",
  ACTIVE: "bg-brand-accent",
  LEARNING: "bg-amber-400",
  BOOTSTRAPPING: "bg-zinc-400",
  DEGRADED: "bg-orange-400",
  DISABLED: "bg-zinc-500",
  DOWN: "bg-red-500",
};

export function StateBadge({ state }: { state: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70">
      <span className={cn("size-2 rounded-full", STATE_DOT[state] ?? "bg-zinc-400")} />
      {state}
    </span>
  );
}

export function LiveIndicator() {
  const status = useLiveStore((s) => s.status);
  const map = {
    connected: { c: "bg-lime shadow-[0_0_10px] shadow-lime/70", t: "LIVE" },
    connecting: { c: "bg-amber-400 animate-pulse", t: "CONNECTING" },
    disconnected: { c: "bg-red-500", t: "OFFLINE" },
  }[status];
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80"
    >
      <span aria-hidden className={cn("size-2 rounded-full", map.c)} />
      {map.t}
    </span>
  );
}

export function LastUpdated() {
  const last = useLiveStore((s) => s.lastUpdated);
  if (!last) return <span className="text-xs text-white/70">—</span>;
  const secs = Math.max(0, Math.round((Date.now() - last) / 1000));
  return <span className="text-xs text-white/70">updated {secs}s ago</span>;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "critical" | "warn" | "good";
}) {
  const toneCls = {
    default: "text-white",
    critical: "text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]",
    warn: "text-amber-300",
    good: "text-lime drop-shadow-[0_0_10px_rgba(34,197,94,0.45)]",
  }[tone];
  const beam =
    tone === "critical"
      ? { from: "#f87171", to: "#fca5a5" }
      : tone === "warn"
        ? { from: "#fbbf24", to: "#fde68a" }
        : { from: "#17a34a", to: "#22c55e" };
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-lime/30"
    >
      <BorderBeam size={90} duration={7} colorFrom={beam.from} colorTo={beam.to} />
      <div className="text-xs font-medium uppercase tracking-wider text-white/70">{label}</div>
      <div className={cn("mt-2 text-3xl font-bold tabular-nums", toneCls)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-white/70">{hint}</div>}
    </motion.div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] py-16 text-white/70">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-16 text-red-300">
      <AlertTriangle className="size-4" /> {message ?? "Failed to load. Is the backend running on :8000?"}
    </div>
  );
}

export function EmptyState({ label = "Nothing here yet." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] py-16 text-white/70">
      <Inbox className="size-5" /> {label}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Bug,
  Flame,
  Gauge,
  KeyRound,
  Radio,
  Repeat,
  ShieldOff,
  TrafficCone,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { useScenarios, useSimulate } from "@/lib/api/hooks";
import { PageHeader } from "@/components/platform/shared";

const META: Record<string, { icon: LucideIcon; desc: string; danger?: boolean }> = {
  NORMAL: { icon: Radio, desc: "Baseline healthy traffic" },
  BRUTE_FORCE: { icon: KeyRound, desc: "Repeated failed logins from one IP", danger: true },
  CREDENTIAL_STUFFING: { icon: Repeat, desc: "Many users, few source IPs", danger: true },
  API_ABUSE: { icon: Bug, desc: "403/429 hammering an endpoint", danger: true },
  TRAFFIC_SPIKE: { icon: TrafficCone, desc: "3x request volume burst" },
  "5XX_STORM": { icon: Flame, desc: "Upstream 5xx failures", danger: true },
  LATENCY_DEGRADATION: { icon: Gauge, desc: "Latency 800–3000ms" },
  NOVEL_TEMPLATE: { icon: Zap, desc: "Never-seen error signatures" },
  COMBINED: { icon: ShieldOff, desc: "Multi-vector combined attack", danger: true },
};

export default function SimulatorPage() {
  const { data: scenarios } = useScenarios();
  const simulate = useSimulate();
  const [count, setCount] = useState(120);

  const fire = (scenario: string) => {
    simulate.mutate(
      { scenario, count },
      {
        onSuccess: (r) => toast.success(`Injected ${r.injected} ${scenario} events`),
        onError: () => toast.error("Simulation failed — is the backend running?"),
      },
    );
  };

  return (
    <div>
      <PageHeader title="Attack Simulator" subtitle="Inject realistic traffic — the whole pipeline reacts live" />

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3">
        <label className="text-sm text-white/60">Events per burst</label>
        <input
          type="range"
          min={20}
          max={500}
          step={20}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="accent-brand"
        />
        <span className="w-12 text-sm font-semibold tabular-nums text-brand-accent">{count}</span>
        <span className="ml-auto text-xs text-white/40">Watch the Dashboard / Live Logs update in real time</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(scenarios ?? Object.keys(META)).map((s) => {
          const m = META[s] ?? { icon: Radio, desc: "" };
          const Icon = m.icon;
          return (
            <button
              key={s}
              onClick={() => fire(s)}
              disabled={simulate.isPending}
              className={`group flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all hover:-translate-y-0.5 disabled:opacity-50 ${
                m.danger
                  ? "border-red-500/20 bg-red-500/5 hover:border-red-500/40"
                  : "border-white/10 bg-white/[0.03] hover:border-brand/40"
              }`}
            >
              <div
                className={`grid size-11 place-items-center rounded-lg ${
                  m.danger ? "bg-red-500/15 text-red-400" : "bg-brand-mint/10 text-brand-accent"
                }`}
              >
                <Icon className="size-5" />
              </div>
              <div>
                <div className="font-semibold">{s.replace(/_/g, " ")}</div>
                <div className="mt-0.5 text-xs text-white/50">{m.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

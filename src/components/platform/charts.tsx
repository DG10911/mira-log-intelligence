"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLiveStore } from "@/lib/store/liveStore";

const AXIS = { stroke: "#ffffff30", fontSize: 11 };

export function ErrorRateChart() {
  const points = useLiveStore((s) => s.ratePoints);
  const data = points.map((p) => ({
    time: new Date(p.t).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }),
    error_rate: +(p.error_rate * 100).toFixed(2),
  }));
  return (
    <ChartFrame title="Error rate %" subtitle="live · 30s window">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="er" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bff23a" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#bff23a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="time" {...AXIS} tickLine={false} axisLine={false} minTickGap={40} />
          <YAxis {...AXIS} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            contentStyle={{ background: "#0b1f16", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#ffffff80" }}
          />
          <Area type="monotone" dataKey="error_rate" stroke="#bff23a" strokeWidth={2} fill="url(#er)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function EventVolumeChart() {
  const points = useLiveStore((s) => s.ratePoints);
  const data = points.map((p) => ({
    time: new Date(p.t).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }),
    events: p.events,
  }));
  return (
    <ChartFrame title="Total events" subtitle="cumulative ingested">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="time" {...AXIS} tickLine={false} axisLine={false} minTickGap={40} />
          <YAxis {...AXIS} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            contentStyle={{ background: "#0b1f16", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#ffffff80" }}
          />
          <Line type="monotone" dataKey="events" stroke="#bff23a" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function ChartFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <span className="text-xs text-white/40">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

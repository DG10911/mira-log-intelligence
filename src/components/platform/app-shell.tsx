"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  FileText,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  Radio,
  ShieldAlert,
  Swords,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useEventStream } from "@/lib/ws/useEventStream";
import { LastUpdated, LiveIndicator } from "@/components/platform/shared";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/anomalies", label: "Anomalies", icon: AlertTriangle },
  { href: "/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/logs", label: "Live Logs", icon: FileText },
  { href: "/templates", label: "Templates", icon: Radio },
  { href: "/baseline", label: "Baseline", icon: Gauge },
  { href: "/system", label: "System Health", icon: Activity },
  { href: "/simulator", label: "Attack Simulator", icon: Swords },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  useEventStream(); // single global WS connection
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#03110b] text-white">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-white/10 bg-[#04160e]">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-white shadow-[0_0_18px] shadow-brand/60">
            <HeartPulse className="size-4" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold">Acentra<span className="text-brand-accent"> LogIntel</span></div>
            <div className="text-[10px] uppercase tracking-widest text-white/30">Security Observability</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand/15 text-brand-accent"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-[11px] text-white/30">
          <Link href="/" className="hover:text-brand-accent">← Marketing site</Link>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-60 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#03110b]/80 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <LiveIndicator />
            <LastUpdated />
          </div>
          <div className="text-xs text-white/40">Connected to <code className="text-brand-accent">:8000</code></div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

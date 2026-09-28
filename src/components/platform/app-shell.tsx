"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  Database,
  FileText,
  Gauge,
  LayoutDashboard,
  Radio,
  ShieldAlert,
  Swords,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useEventStream } from "@/lib/ws/useEventStream";
import { LastUpdated, LiveIndicator } from "@/components/platform/shared";
import { MascotBot } from "@/components/platform/mascot-bot";
import { ConsoleMascot } from "@/components/platform/console-mascot";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/anomalies", label: "Anomalies", icon: AlertTriangle },
  { href: "/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/logs", label: "Live Logs", icon: FileText },
  { href: "/templates", label: "Templates", icon: Radio },
  { href: "/baseline", label: "Baseline", icon: Gauge },
  { href: "/system", label: "System Health", icon: Activity },
  { href: "/datasets", label: "Real Datasets", icon: Database },
  { href: "/simulator", label: "Attack Simulator", icon: Swords },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  useEventStream();
  const pathname = usePathname();

  return (
    <div className="relative flex min-h-screen bg-[#03110b] text-white">
      {/* ambient overlays applied to whole console */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 [background-image:linear-gradient(#ffffff08_1px,transparent_1px),linear-gradient(90deg,#ffffff08_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_70%_0%,black,transparent_70%)]" />
        <div className="absolute right-0 top-0 size-[36rem] rounded-full bg-lime/10 blur-[140px]" />
        <div className="absolute -left-40 bottom-0 size-[30rem] rounded-full bg-brand/10 blur-[130px]" />
      </div>

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-white/10 bg-[#04160e]/90 backdrop-blur-xl">
        <div className="flex h-20 items-center gap-2 border-b border-white/10 px-4">
          <div className="relative -my-2">
            <div className="absolute inset-0 -z-10 rounded-full bg-lime/20 blur-xl" />
            <MascotBot size={56} eyeColor="#22c55e" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold">
              Acentra<span className="text-lime"> LogIntel</span>
            </div>
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
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  active ? "bg-lime/10 text-lime" : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-lime shadow-[0_0_12px] shadow-lime/60"
                  />
                )}
                <Icon className={cn("size-4 transition-transform group-hover:scale-110", active && "drop-shadow-[0_0_6px_#22c55e]")} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-[11px] text-white/30">
          <Link href="/" className="transition-colors hover:text-lime">← Marketing site</Link>
        </div>
      </aside>

      {/* Main */}
      <div className="relative z-10 ml-60 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#03110b]/70 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <LiveIndicator />
            <LastUpdated />
          </div>
          <div className="text-xs text-white/40">
            Connected to <code className="text-lime">:8000</code>
          </div>
        </header>
        <main className="flex-1 p-6">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      <ConsoleMascot />
    </div>
  );
}

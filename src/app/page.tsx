"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Database,
  FlaskConical,
  Grid3x3,
  HeartPulse,
  Play,
  Pill,
  ScanLine,
  Server,
} from "lucide-react";

import { BorderBeam } from "@/components/ui/border-beam";
import { Marquee } from "@/components/ui/marquee";
import { MascotBot } from "@/components/platform/mascot-bot";

const LIME = "#bff23a";

function useMouse() {
  const [m, setM] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setM({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return m;
}

function FloatCard({
  children,
  depth = 10,
  mouse,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  depth?: number;
  mouse: { x: number; y: number };
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`absolute rounded-2xl border border-black/10 bg-white/80 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] backdrop-blur-md ${className}`}
      style={{
        transform: `translate3d(${mouse.x * depth}px, ${mouse.y * depth}px, 0)`,
        transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const USE_CASES = [
  { n: "01", icon: HeartPulse, title: "EMR Systems", body: "Detect anomalies in EMR availability, latency and error patterns.", tag: "Operational" },
  { n: "02", icon: ScanLine, title: "PACS (Radiology)", body: "Monitor image server uptime, DICOM transfer failures and delays.", tag: "Healthy" },
  { n: "03", icon: FlaskConical, title: "LIS (Lab Systems)", body: "Track lab result processing, interface failures and queue backlogs.", tag: "Running" },
  { n: "04", icon: Pill, title: "Pharmacy Systems", body: "Detect failures in dispensing, inventory sync and prescriptions.", tag: "Healthy" },
  { n: "05", icon: Database, title: "Billing & Insurance", body: "Monitor claim processing, payment gateway health and transactions.", tag: "Stable" },
  { n: "06", icon: Server, title: "Network & Infrastructure", body: "Track servers, APIs, databases and critical dependencies.", tag: "Healthy" },
];

const STEPS = [
  { n: "01", title: "Collect Signals", body: "Connect to EMR, PACS, LIS, Pharmacy, Billing, servers & APIs — continuously collecting real-time operational and security data." },
  { n: "02", title: "Detect Anomalies", body: "Statistical + ML models analyse behaviour to catch downtime, error spikes, unusual access, and performance degradation." },
  { n: "03", title: "Correlate & Analyse", body: "Correlate signals across systems to find root cause, filter noise, and understand impact with contextual intelligence." },
  { n: "04", title: "Alert & Prioritise", body: "Relevant teams get instant, actionable alerts with severity scores, likely cause, and recommended actions." },
  { n: "05", title: "Resolve Faster", body: "Clear troubleshooting steps, runbook suggestions and real-time status tracking to resolve issues quickly." },
  { n: "06", title: "Stay Ahead", body: "Learns from patterns, predicts potential failures, and gives long-term insight for resilient infrastructure." },
];

const CHIPS = ["Patient Registration", "EMR", "Radiology", "Labs", "Pharmacy", "Billing", "API Gateways", "Databases", "DICOM Routers", "Cloud Services", "Identity & Access", "Appointments"];

export default function Landing() {
  const mouse = useMouse();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#eef1e8] text-[#101610]">
      {/* background technical grid + glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 [background-image:linear-gradient(#0000000a_1px,transparent_1px),linear-gradient(90deg,#0000000a_1px,transparent_1px)] [background-size:46px_46px] [mask-image:radial-gradient(ellipse_at_60%_20%,black,transparent_75%)]" />
        <div className="absolute right-0 top-0 size-[42rem] rounded-full bg-[#bff23a]/25 blur-[130px]" />
        <div className="absolute -left-40 top-1/3 size-[30rem] rounded-full bg-[#bff23a]/15 blur-[120px]" />
      </div>

      {/* NAV */}
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-[#101610] text-[#bff23a]">
            <HeartPulse className="size-4" />
          </span>
          ACENTRA<span className="text-[#7fae1e]">.</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#101610]/70 md:flex">
          {["Product", "Use Cases", "How It Works", "Docs"].map((n) => (
            <a key={n} href="#" className="transition-colors hover:text-[#101610]">{n}</a>
          ))}
        </nav>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full bg-[#101610] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
        >
          Launch Console <ArrowUpRight className="size-4" />
        </Link>
      </header>

      {/* HERO */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-6 pb-10 pt-6 lg:grid-cols-2">
        {/* left copy */}
        <div>
          <div className="mb-6 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-[#101610]/50">
            <span className="h-px w-8 bg-[#7fae1e]" />
            <span className="size-1.5 rounded-full bg-[#7fae1e]" />
            Real-Time Infrastructure Intelligence
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl font-extrabold leading-[0.98] tracking-tight md:text-7xl"
          >
            See the{" "}
            <span className="relative inline-block">
              <span className="absolute inset-x-[-6px] inset-y-1 -z-0 block bg-[#bff23a]" />
              <span className="relative z-10">signal</span>
            </span>{" "}
            before it becomes an incident<span className="text-[#7fae1e]">.</span>
          </motion.h1>
          <p className="mt-6 max-w-md text-lg text-[#101610]/60">
            Acentra monitors hospital systems, detects abnormal behaviour, correlates
            security and reliability signals, and helps teams resolve issues before
            they impact care.
          </p>
          <div className="mt-9 flex items-center gap-5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-[#101610] px-7 py-4 text-base font-semibold text-white transition-transform hover:scale-[1.03]"
            >
              Explore Acentra <ArrowUpRight className="size-4" />
            </Link>
            <button className="group inline-flex items-center gap-3 text-base font-semibold">
              <span className="grid size-11 place-items-center rounded-full border border-black/20 transition-colors group-hover:bg-[#bff23a]">
                <Play className="size-4 fill-current" />
              </span>
              Watch Demo
            </button>
          </div>

          {/* mini gallery + system list */}
          <div className="mt-12 hidden items-center gap-5 md:flex">
            <div className="flex gap-2 rounded-2xl border border-black/10 bg-white/70 p-2">
              {[Grid3x3, Boxes, Activity].map((I, i) => (
                <div key={i} className="grid size-14 place-items-center rounded-xl bg-[#e7ebdf] text-[#7fae1e]">
                  <I className="size-6" />
                </div>
              ))}
            </div>
            <ul className="font-mono text-[11px] uppercase leading-relaxed tracking-wider text-[#101610]/50">
              {["Patient Registration", "EMR · Radiology · Labs", "Pharmacy · Billing", "and more"].map((t) => (
                <li key={t}>· {t}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* right: mascot + floating cards */}
        <div className="relative h-[520px]">
          {/* mascot */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <MascotBot size={380} />
          </div>

          {/* HOSPITAL SYSTEMS card */}
          <FloatCard mouse={mouse} depth={18} className="left-0 top-2 w-64 p-4" style={{}}>
            <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-[#101610]/50">Hospital Systems</div>
            <ul className="space-y-2 font-mono text-xs">
              {[["EMR", "HEALTHY"], ["PACS", "MONITORING"], ["LIS", "HEALTHY"], ["PHARMACY", "HEALTHY"], ["BILLING", "MONITORING"]].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#7fae1e]" />{k}</span>
                  <span className="text-[#101610]/40">{v}</span>
                </li>
              ))}
            </ul>
          </FloatCard>

          {/* ANOMALY card with border beam */}
          <FloatCard mouse={mouse} depth={28} className="bottom-24 left-2 w-60 overflow-hidden p-4">
            <BorderBeam size={120} duration={6} colorFrom="#7fae1e" colorTo="#bff23a" />
            <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#101610]/50">
              <ArrowUpRight className="size-3 text-[#7fae1e]" /> Anomaly Detected
            </div>
            <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#7fae1e]" /><span className="text-lg font-bold">PACS</span></div>
            <div className="text-sm text-[#101610]/60">Error rate <span className="font-bold text-[#101610]">+742%</span></div>
            <div className="mt-2 flex h-10 items-end gap-0.5">
              {[3, 4, 3, 5, 6, 5, 7, 9, 8, 12, 14, 13, 16, 18].map((h, i) => (
                <span key={i} className="w-1.5 rounded-sm bg-[#bff23a]" style={{ height: `${h * 2}px` }} />
              ))}
            </div>
          </FloatCard>

          {/* ACTIVE INCIDENTS + SYSTEM HEALTH card */}
          <FloatCard mouse={mouse} depth={22} className="bottom-16 right-0 w-56 p-4">
            <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-[#101610]/50">
              <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#7fae1e]" /> Active Incidents</span>
            </div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-3xl font-bold">2</span>
              <ArrowRight className="size-4 text-[#101610]/40" />
            </div>
            <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-[#101610]/50">System Health</div>
            <div className="flex items-center gap-2 text-2xl font-bold text-[#101610]">99.98%</div>
          </FloatCard>

          {/* secure tagline */}
          <FloatCard mouse={mouse} depth={12} className="right-0 top-4 w-44 border-none bg-transparent p-0 shadow-none">
            <div className="font-mono text-[11px] uppercase leading-relaxed tracking-widest text-[#101610]/50">
              <span className="mr-2 inline-block h-px w-6 -translate-y-1 bg-[#7fae1e]" />Secure.<br />Reliable.<br />Observable.<br />For a healthier tomorrow.
            </div>
          </FloatCard>
        </div>
      </section>

      {/* system chips marquee */}
      <div className="relative z-10 border-y border-black/10 bg-white/40 py-4">
        <Marquee pauseOnHover className="[--duration:34s]">
          {CHIPS.map((c) => (
            <div key={c} className="mx-2 flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-sm font-medium text-[#101610]/70">
              <span className="size-1.5 rounded-full bg-[#7fae1e]" /> {c}
            </div>
          ))}
        </Marquee>
      </div>

      {/* USE CASES */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 flex items-end justify-between gap-8">
          <div>
            <div className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-[#101610]/50">— 02 / Use Cases</div>
            <h2 className="max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Built for every part of hospital infrastructure<span className="text-[#7fae1e]">.</span>
            </h2>
          </div>
          <MascotBot size={150} className="hidden lg:block" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map(({ n, icon: Icon, title, body, tag }) => (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white/70 p-6 transition-all hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs text-[#101610]/40">{n} —</span>
                <span className="grid size-8 place-items-center rounded-full border border-black/15 transition-colors group-hover:bg-[#bff23a]">
                  <ArrowRight className="size-4" />
                </span>
              </div>
              <div className="mb-3 grid size-11 place-items-center rounded-xl bg-[#eef3e0] text-[#7fae1e]">
                <Icon className="size-5" />
              </div>
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="mt-2 text-sm text-[#101610]/60">{body}</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium">
                <span className="size-1.5 rounded-full bg-[#7fae1e]" /> {title.split(" ")[0]} · {tag}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-14">
          <div className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-[#101610]/50">— 03 / How It Works</div>
          <h2 className="max-w-3xl text-4xl font-extrabold leading-[1.02] tracking-tight md:text-6xl">
            From signals to solutions<span className="text-[#7fae1e]">.</span>
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(({ n, title, body }) => (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-black/10 bg-white/60 p-6"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="font-mono text-xs text-[#101610]/40">{n}</span>
                <span className="size-1.5 rounded-full bg-[#7fae1e]" />
              </div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-[#101610]/60">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#101610] px-8 py-20 text-center text-white">
          <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-[#bff23a]/30 blur-[110px]" />
          <div className="relative">
            <MascotBot size={130} className="mx-auto mb-4" eyeColor="#bff23a" />
            <h2 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight md:text-6xl">
              Stay ahead of every incident<span className="text-[#bff23a]">.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/60">
              One platform. Complete visibility. From clinical to operational systems.
            </p>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#bff23a] px-8 py-4 text-base font-bold text-[#101610] transition-transform hover:scale-[1.03]"
            >
              Launch Console <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-black/10 bg-white/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-[#101610]/50 md:flex-row">
          <div className="flex items-center gap-2 font-extrabold text-[#101610]">
            <span className="grid size-7 place-items-center rounded-lg bg-[#101610] text-[#bff23a]"><HeartPulse className="size-3.5" /></span>
            ACENTRA<span className="text-[#7fae1e]">.</span>
          </div>
          <p>Prototype landing — brand-themed demo, not affiliated with Acentra Health.</p>
        </div>
      </footer>
    </div>
  );
}

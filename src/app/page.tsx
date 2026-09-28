"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  BrainCircuit,
  Database,
  FlaskConical,
  GitBranch,
  HeartPulse,
  Layers,
  Play,
  Pill,
  Radar,
  ScanLine,
  Server,
  ShieldCheck,
  Siren,
  Sparkles,
  Waypoints,
  Zap,
} from "lucide-react";

import { BorderBeam } from "@/components/ui/border-beam";
import { Marquee } from "@/components/ui/marquee";
import { MascotBot } from "@/components/platform/mascot-bot";

function useMouse() {
  const [m, setM] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) =>
      setM({ x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return m;
}

function Orb({ className = "", size = 260 }: { className?: string; size?: number }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 35% 30%, #d6ff6e 0%, #bff23a 35%, #7fae1e 70%, transparent 72%)",
        filter: "blur(2px)",
        boxShadow: "0 0 90px 10px rgba(191,242,58,0.35)",
      }}
    />
  );
}

function FloatCard({ children, depth = 10, mouse, className = "", style = {} }: {
  children: React.ReactNode; depth?: number; mouse: { x: number; y: number }; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={`absolute rounded-2xl border border-black/10 bg-white/80 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] backdrop-blur-md ${className}`}
      style={{ transform: `translate3d(${mouse.x * depth}px, ${mouse.y * depth}px, 0)`, transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)", ...style }}
    >
      {children}
    </div>
  );
}

const STACK_MARQUEE = ["FastAPI", "PostgreSQL", "Redis", "Drain3", "WebSockets", "NumPy", "AWS CloudWatch", "AWS SNS", "Next.js", "React 19", "Tailwind", "TanStack Query", "Framer Motion", "Recharts", "SQLModel", "Pydantic"];

const PIPELINE = [
  { n: "01", icon: Database, t: "Ingest", d: "Rotation-safe file tailer, synthetic + CloudWatch sources — one interface, no missed or duplicated lines." },
  { n: "02", icon: Layers, t: "Normalize", d: "Untrusted log lines → strongly-typed LogEvent (JSON, access-log, plain text)." },
  { n: "03", icon: GitBranch, t: "Template Mining", d: "Drain3 online clustering assigns template IDs and flags never-seen signatures." },
  { n: "04", icon: Activity, t: "Feature Engine", d: "Multi-scale windows (5s→1h): error/latency rates, p50/p95/p99, entropy, concentration." },
  { n: "05", icon: Radar, t: "Adaptive Baseline", d: "EWMA + MAD, contamination-guarded, fast/slow drift — learns normal, resists poisoning." },
  { n: "06", icon: ShieldCheck, t: "Detect + Secure", d: "Robust-Z, EWMA & rate detectors + a security rule engine of attack signals." },
  { n: "07", icon: BrainCircuit, t: "Anomaly Fusion", d: "Weighted fusion → score, confidence, contributing detectors, explainable evidence." },
  { n: "08", icon: Siren, t: "Incidents", d: "Dedup + correlate + lifecycle, streamed live over WebSocket, mirrored to AWS." },
];

const CAPABILITIES = [
  { icon: Radar, t: "Adaptive baseline", d: "Self-learning normal behaviour with robust MAD statistics that survive spikes." },
  { icon: ShieldCheck, t: "Security signals", d: "Brute-force, credential-stuffing, API abuse, injection & traversal — flagged, never falsely confirmed." },
  { icon: Sparkles, t: "Explainable alerts", d: "Every anomaly answers WHAT · WHY · HOW MUCH · WHERE · evidence." },
  { icon: Waypoints, t: "Incident correlation", d: "Fingerprint dedup + time/service correlation — one incident, not 500 alerts." },
  { icon: Zap, t: "Real-time streaming", d: "Redis event bus → WebSocket fan-out with backpressure, sub-second to the UI." },
  { icon: Siren, t: "Attack simulator", d: "Nine realistic scenarios drive the live pipeline for demos and testing." },
];

const STACK = [
  { group: "Backend", items: ["FastAPI", "Uvicorn", "asyncio", "Pydantic v2"] },
  { group: "Data & State", items: ["PostgreSQL", "Redis", "SQLModel", "Drain3"] },
  { group: "Detection", items: ["EWMA", "Robust Z / MAD", "Rate-of-change", "Template novelty"] },
  { group: "Realtime", items: ["WebSockets", "Redis Pub/Sub", "Event bus", "Backpressure"] },
  { group: "Cloud", items: ["AWS CloudWatch", "AWS SNS", "IAM-safe creds"] },
  { group: "Frontend", items: ["Next.js 16", "React 19", "Tailwind v4", "TanStack Query", "Framer Motion", "Recharts"] },
];

const USE_CASES = [
  { n: "01", icon: HeartPulse, title: "EMR Systems", body: "Detect anomalies in EMR availability, latency and error patterns." },
  { n: "02", icon: ScanLine, title: "PACS (Radiology)", body: "Monitor image server uptime, DICOM transfer failures and delays." },
  { n: "03", icon: FlaskConical, title: "LIS (Lab Systems)", body: "Track lab result processing, interface failures and queue backlogs." },
  { n: "04", icon: Pill, title: "Pharmacy Systems", body: "Detect failures in dispensing, inventory sync and prescriptions." },
  { n: "05", icon: Database, title: "Billing & Insurance", body: "Monitor claim processing, payment gateway health and transactions." },
  { n: "06", icon: Server, title: "Network & Infrastructure", body: "Track servers, APIs, databases and critical dependencies." },
];

const STATS = [
  { v: "6", l: "sliding windows (5s→1h)" },
  { v: "10+", l: "detectors & security signals" },
  { v: "<1s", l: "detection to dashboard" },
  { v: "99.98%", l: "target system health" },
];

const CHIPS = ["Patient Registration", "EMR", "Radiology", "Labs", "Pharmacy", "Billing", "API Gateways", "Databases", "DICOM Routers", "Cloud Services", "Identity & Access", "Appointments"];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-[#101610]/50">
      <span className="h-px w-8 bg-[#7fae1e]" />
      <span className="size-1.5 rounded-full bg-[#7fae1e]" />
      {children}
    </div>
  );
}

export default function Landing() {
  const mouse = useMouse();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#eef1e8] text-[#101610]">
      {/* background grid + orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 [background-image:linear-gradient(#0000000a_1px,transparent_1px),linear-gradient(90deg,#0000000a_1px,transparent_1px)] [background-size:46px_46px] [mask-image:radial-gradient(ellipse_at_60%_10%,black,transparent_78%)]" />
        <div className="absolute right-0 top-0 size-[42rem] rounded-full bg-[#bff23a]/25 blur-[130px]" />
        <div className="absolute -left-40 top-1/3 size-[30rem] rounded-full bg-[#bff23a]/15 blur-[120px]" />
      </div>

      {/* NAV */}
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-[#101610] text-[#bff23a]"><Radar className="size-4" /></span>
          MIRA<span className="text-[#7fae1e]">.</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#101610]/70 md:flex">
          {["Product", "Use Cases", "How It Works", "Tech Stack", "Docs"].map((n) => (
            <a key={n} href={`#${n.toLowerCase().replace(/ /g, "-")}`} className="transition-colors hover:text-[#101610]">{n}</a>
          ))}
        </nav>
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-[#101610] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
          Launch Console <ArrowUpRight className="size-4" />
        </Link>
      </header>

      {/* HERO */}
      <section id="product" className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-6 pb-10 pt-6 lg:grid-cols-2">
        <div>
          <Eyebrow>Real-Time Log Intelligence</Eyebrow>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="text-5xl font-extrabold leading-[0.98] tracking-tight md:text-7xl">
            See the{" "}
            <span className="relative inline-block">
              <span className="absolute inset-x-[-6px] inset-y-1 -z-0 block bg-[#bff23a]" />
              <span className="relative z-10">signal</span>
            </span>{" "}
            before it becomes an incident<span className="text-[#7fae1e]">.</span>
          </motion.h1>
          <p className="mt-6 max-w-md text-lg text-[#101610]/60">
            MIRA monitors your systems, detects abnormal behaviour, correlates security &amp;
            reliability signals, and helps teams resolve issues before they impact care.
          </p>
          <div className="mt-9 flex items-center gap-5">
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-[#101610] px-7 py-4 text-base font-semibold text-white transition-transform hover:scale-[1.03]">
              Launch Console <ArrowUpRight className="size-4" />
            </Link>
            <button className="group inline-flex items-center gap-3 text-base font-semibold">
              <span className="grid size-11 place-items-center rounded-full border border-black/20 transition-colors group-hover:bg-[#bff23a]"><Play className="size-4 fill-current" /></span>
              Watch Demo
            </button>
          </div>
        </div>

        <div className="relative h-[520px]">
          <Orb className="left-10 top-6 opacity-70" size={180} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><MascotBot size={380} /></div>

          <FloatCard mouse={mouse} depth={18} className="left-0 top-2 w-64 p-4">
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

          <FloatCard mouse={mouse} depth={28} className="bottom-24 left-2 w-60 overflow-hidden p-4">
            <BorderBeam size={120} duration={6} colorFrom="#7fae1e" colorTo="#bff23a" />
            <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#101610]/50"><ArrowUpRight className="size-3 text-[#7fae1e]" /> Anomaly Detected</div>
            <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#7fae1e]" /><span className="text-lg font-bold">PACS</span></div>
            <div className="text-sm text-[#101610]/60">Error rate <span className="font-bold text-[#101610]">+742%</span></div>
            <div className="mt-2 flex h-10 items-end gap-0.5">
              {[3, 4, 3, 5, 6, 5, 7, 9, 8, 12, 14, 13, 16, 18].map((h, i) => (<span key={i} className="w-1.5 rounded-sm bg-[#bff23a]" style={{ height: `${h * 2}px` }} />))}
            </div>
          </FloatCard>

          <FloatCard mouse={mouse} depth={22} className="bottom-16 right-0 w-56 p-4">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-[#101610]/50"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-[#7fae1e]" /> Active Incidents</div>
            <div className="mb-3 flex items-center justify-between"><span className="text-3xl font-bold">2</span><ArrowRight className="size-4 text-[#101610]/40" /></div>
            <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-[#101610]/50">System Health</div>
            <div className="text-2xl font-bold">99.98%</div>
          </FloatCard>

          <FloatCard mouse={mouse} depth={12} className="right-0 top-4 w-44 border-none bg-transparent p-0 shadow-none">
            <div className="font-mono text-[11px] uppercase leading-relaxed tracking-widest text-[#101610]/50"><span className="mr-2 inline-block h-px w-6 -translate-y-1 bg-[#7fae1e]" />Secure.<br />Reliable.<br />Observable.</div>
          </FloatCard>
        </div>
      </section>

      {/* TECH MARQUEE */}
      <div className="relative z-10 border-y border-black/10 bg-white/40 py-4">
        <p className="mb-3 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-[#101610]/40">Built on a real, production-grade stack</p>
        <Marquee pauseOnHover className="[--duration:32s]">
          {STACK_MARQUEE.map((c) => (
            <div key={c} className="mx-2 flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-sm font-medium text-[#101610]/70"><span className="size-1.5 rounded-full bg-[#7fae1e]" /> {c}</div>
          ))}
        </Marquee>
      </div>

      {/* WHAT IS MIRA */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>— 01 / Meet MIRA</Eyebrow>
            <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              A real-time log intelligence &amp; security observability platform<span className="text-[#7fae1e]">.</span>
            </h2>
            <p className="mt-6 max-w-lg text-lg text-[#101610]/60">
              MIRA ingests live log streams, mines templates online, learns an adaptive baseline
              of normal behaviour, and fuses statistical, template and security detectors into
              explainable, correlated incidents — streamed to your team in real time.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.l} className="rounded-2xl border border-black/10 bg-white/70 p-4">
                  <div className="text-3xl font-extrabold text-[#101610]">{s.v}</div>
                  <div className="mt-1 text-xs text-[#101610]/50">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative grid min-h-[340px] place-items-center">
            <Orb size={240} className="opacity-80" />
            <div className="relative"><MascotBot size={260} /></div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — real pipeline */}
      <section id="how-it-works" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <Eyebrow>— 02 / How It Works</Eyebrow>
        <h2 className="mb-12 max-w-3xl text-4xl font-extrabold leading-[1.02] tracking-tight md:text-6xl">From signals to solutions<span className="text-[#7fae1e]">.</span></h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map(({ n, icon: Icon, t, d }, i) => (
            <motion.div key={n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.45, delay: (i % 4) * 0.06 }}
              className="relative rounded-2xl border border-black/10 bg-white/70 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-[#eef3e0] text-[#7fae1e]"><Icon className="size-5" /></span>
                <span className="font-mono text-xs text-[#101610]/40">{n}</span>
              </div>
              <h3 className="font-bold">{t}</h3>
              <p className="mt-1.5 text-sm text-[#101610]/55">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <Eyebrow>— 03 / Capabilities</Eyebrow>
        <h2 className="mb-12 max-w-3xl text-4xl font-extrabold leading-[1.02] tracking-tight md:text-6xl">Detection you can actually trust<span className="text-[#7fae1e]">.</span></h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, t, d }) => (
            <motion.div key={t} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.45 }}
              className="group rounded-2xl border border-black/10 bg-white/70 p-6 transition-all hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)]">
              <div className="mb-4 grid size-11 place-items-center rounded-xl bg-[#eef3e0] text-[#7fae1e]"><Icon className="size-5" /></div>
              <h3 className="text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm text-[#101610]/60">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* USE CASES */}
      <section id="use-cases" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-12 flex items-end justify-between gap-8">
          <div>
            <Eyebrow>— 04 / Use Cases</Eyebrow>
            <h2 className="max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">Built for every part of hospital infrastructure<span className="text-[#7fae1e]">.</span></h2>
          </div>
          <MascotBot size={140} className="hidden lg:block" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map(({ n, icon: Icon, title, body }) => (
            <motion.div key={n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.45 }}
              className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white/70 p-6 transition-all hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)]">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs text-[#101610]/40">{n} —</span>
                <span className="grid size-8 place-items-center rounded-full border border-black/15 transition-colors group-hover:bg-[#bff23a]"><ArrowRight className="size-4" /></span>
              </div>
              <div className="mb-3 grid size-11 place-items-center rounded-xl bg-[#eef3e0] text-[#7fae1e]"><Icon className="size-5" /></div>
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="mt-2 text-sm text-[#101610]/60">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TECH STACK */}
      <section id="tech-stack" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <Eyebrow>— 05 / Tech Stack</Eyebrow>
        <h2 className="mb-4 max-w-3xl text-4xl font-extrabold leading-[1.02] tracking-tight md:text-6xl">The real engine under the hood<span className="text-[#7fae1e]">.</span></h2>
        <p className="mb-12 max-w-xl text-[#101610]/55">Not a mockup — a modular monolith running FastAPI, PostgreSQL and Redis with a live detection pipeline and WebSocket streaming.</p>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {STACK.map(({ group, items }) => (
            <div key={group} className="rounded-2xl border border-black/10 bg-white/70 p-6">
              <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#101610]/50"><Boxes className="size-4 text-[#7fae1e]" /> {group}</div>
              <div className="flex flex-wrap gap-2">
                {items.map((it) => (
                  <span key={it} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-medium"><span className="size-1.5 rounded-full bg-[#7fae1e]" /> {it}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Marquee pauseOnHover className="[--duration:30s]">
            {CHIPS.map((c) => (<div key={c} className="mx-2 flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-1.5 text-sm text-[#101610]/60"><span className="size-1.5 rounded-full bg-[#7fae1e]" /> {c}</div>))}
          </Marquee>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#101610] px-8 py-20 text-center text-white">
          <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-[#bff23a]/30 blur-[110px]" />
          <div className="relative">
            <MascotBot size={130} className="mx-auto mb-4" />
            <h2 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight md:text-6xl">Stay ahead of every incident<span className="text-[#bff23a]">.</span></h2>
            <p className="mx-auto mt-4 max-w-xl text-white/60">One platform. Complete visibility. From clinical to operational systems.</p>
            <Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#bff23a] px-8 py-4 text-base font-bold text-[#101610] transition-transform hover:scale-[1.03]">Launch Console <ArrowUpRight className="size-4" /></Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-black/10 bg-white/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-[#101610]/50 md:flex-row">
          <div className="flex items-center gap-2 font-extrabold text-[#101610]"><span className="grid size-7 place-items-center rounded-lg bg-[#101610] text-[#bff23a]"><Radar className="size-3.5" /></span>MIRA<span className="text-[#7fae1e]">.</span></div>
          <p>Prototype landing — MIRA real-time log intelligence. Demo, not affiliated with any named entity.</p>
        </div>
      </footer>
    </div>
  );
}

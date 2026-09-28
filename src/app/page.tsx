"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  HeartPulse,
  Menu,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import { Marquee } from "@/components/ui/marquee";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Spotlight } from "@/components/ui/spotlight";
import { BackgroundBeams } from "@/components/ui/background-beams";
import {
  CardBody,
  CardContainer,
  CardItem,
} from "@/components/ui/3d-card";
import { LiveOrb } from "@/components/ui/live-orb";

/* ---------------- helpers ---------------- */

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Counter({
  value,
  className,
  immediate = false,
}: {
  value: string;
  className?: string;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const viewed = useInView(ref, { once: true, margin: "-80px" });
  const inView = immediate || viewed;
  const [n, setN] = useState(0);
  const m = value.match(/^([\d.]+)(.*)$/);
  const num = m ? parseFloat(m[1]) : 0;
  const suffix = m ? m[2] : value;
  const decimals = m && m[1].includes(".") ? m[1].split(".")[1].length : 0;

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1500;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(num * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, num]);

  return (
    <span ref={ref} className={className}>
      {n.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ---------------- data ---------------- */

const NAV = ["Solutions", "Technologies", "About Us", "Insights", "Careers"];

const CERTS = [
  "CMS-Certified Solutions",
  "CMMI Level 3 Appraisal",
  "URAC Accreditation",
  "HITRUST Certified",
  "SOC 2 Type II",
  "NCQA Recognized",
];

const SOLUTIONS = [
  {
    icon: Activity,
    title: "Advanced Processing",
    body: "Modular MMIS platforms processing claims & encounters at national scale — driving efficiency and measurable savings.",
  },
  {
    icon: Stethoscope,
    title: "Clinical Services",
    body: "Care assessment and patient management models engineered to improve outcomes for priority populations.",
  },
  {
    icon: BrainCircuit,
    title: "Data & AI Analytics",
    body: "Machine learning that turns program data into decisions, forecasts, and real-time fraud prevention.",
  },
  {
    icon: Users,
    title: "Provider Solutions",
    body: "Automated enrollment, screening & credentialing — provider onboarding from weeks to days.",
  },
];

const STATS = [
  { value: "30+", label: "Years public sector health" },
  { value: "40M+", label: "Lives touched" },
  { value: "50", label: "States & federal agencies" },
  { value: "99.9%", label: "Platform uptime SLA" },
];

const TESTIMONIALS = [
  { quote: "Implementation was faster than any vendor we've worked with. They understood Medicaid on day one.", name: "State Medicaid Director", org: "Southeast Region" },
  { quote: "Their analytics surfaced savings we didn't know existed — and made the case for us.", name: "Program Integrity Lead", org: "State Health Agency" },
  { quote: "Care management quality jumped measurably within two quarters of go-live.", name: "Chief Medical Officer", org: "Managed Care Partner" },
  { quote: "A true partner. Governance, security, and clinical rigor without the usual friction.", name: "CIO", org: "Federal Health Program" },
];

/* ---------------- page ---------------- */

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-[#03110b] text-white">
      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#03110b]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="#" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-brand text-white shadow-[0_0_20px] shadow-brand/60">
              <HeartPulse className="size-4" />
            </span>
            <span className="text-lg">
              Acentra<span className="text-brand-accent"> Health</span>
            </span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map((n) => (
              <a key={n} href="#" className="text-sm font-medium text-white/60 transition-colors hover:text-white">
                {n}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="hidden text-white/80 hover:bg-white/10 hover:text-white md:inline-flex">
              Contact
            </Button>
            <Link href="/dashboard">
              <Button className="bg-brand text-white shadow-[0_0_24px] shadow-brand/40 hover:bg-brand/90">
                Launch Console
              </Button>
            </Link>
            <button className="md:hidden" aria-label="Menu">
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden pt-16">
        {/* layered backgrounds */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#03110b] via-[#04160e] to-[#03110b]" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.15] [background-image:linear-gradient(to_right,#ffffff22_1px,transparent_1px),linear-gradient(to_bottom,#ffffff22_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        />
        <BackgroundBeams className="opacity-40" />
        <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="#2fe08a" />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 size-[36rem] -translate-x-1/2 rounded-full bg-brand/25 blur-[130px]"
        />

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-6 gap-1.5 border-brand/30 bg-brand/10 text-brand-accent backdrop-blur hover:bg-brand/10">
                <Sparkles className="size-3.5" /> CNSI + Kepro, reimagined
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-3xl bg-gradient-to-br from-white via-white to-brand-accent bg-clip-text text-5xl font-extrabold leading-[1.02] tracking-tight text-transparent md:text-7xl lg:mx-0"
            >
              Accelerating Better Outcomes
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mx-auto mt-6 max-w-xl text-lg text-white/60 md:text-xl lg:mx-0"
            >
              Technological ingenuity. Clinical expertise. Public sector health
              knowledge — engineered into one platform modernizing care for the
              nation&apos;s agencies.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start"
            >
              <Link href="/dashboard">
                <ShimmerButton background="#17a34a" className="px-8 py-3.5 text-base font-semibold shadow-2xl shadow-brand/40">
                  Launch Console <ArrowRight className="ml-2 size-4" />
                </ShimmerButton>
              </Link>
              <Button variant="outline" className="border-white/20 bg-white/5 px-8 py-6 text-base text-white backdrop-blur hover:bg-white/10 hover:text-white">
                Explore Solutions
              </Button>
            </motion.div>
          </div>

          {/* live orb centerpiece */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto hidden place-items-center lg:grid"
          >
            <div className="absolute size-72 rounded-full bg-brand/30 blur-[90px]" />
            <LiveOrb size={320} variant="custom" color="#17a34a" eyeColor="#eafff2" />
          </motion.div>
        </div>

        {/* floating metric cards */}
        <div className="absolute inset-x-0 bottom-6 z-10 mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <BorderBeam size={200} duration={9} colorFrom="#17a34a" colorTo="#6ee7b7" />
            <div className="grid divide-white/10 sm:grid-cols-3 sm:divide-x">
              {[
                { icon: TrendingUp, k: "Claims processed today", v: "1.42M" },
                { icon: ShieldCheck, k: "Integrity flags caught", v: "3908" },
                { icon: HeartPulse, k: "Active care plans", v: "218K" },
              ].map(({ icon: Icon, k, v }) => (
                <div key={k} className="flex items-center gap-4 p-6">
                  <Icon className="size-6 shrink-0 text-brand-accent" />
                  <div>
                    <Counter value={v} immediate className="text-2xl font-bold" />
                    <div className="text-xs text-white/50">{k}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TRUST MARQUEE */}
      <div className="border-y border-white/5 bg-[#03110b] py-8">
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.25em] text-white/30">
          Certified · Accredited · Trusted
        </p>
        <Marquee pauseOnHover className="[--duration:30s]">
          {CERTS.map((c) => (
            <div key={c} className="mx-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white/80">
              <ShieldCheck className="size-4 text-brand-accent" /> {c}
            </div>
          ))}
        </Marquee>
      </div>

      {/* SOLUTIONS — 3D tilt cards */}
      <section id="solutions" className="relative mx-auto max-w-7xl px-6 py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 border-brand/30 text-brand-accent">Solutions</Badge>
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            One partner, the full{" "}
            <span className="bg-gradient-to-r from-brand-accent to-brand bg-clip-text text-transparent">
              healthcare lifecycle
            </span>
          </h2>
          <p className="mt-4 text-lg text-white/50">
            From claims to clinical care — platforms and people that move programs forward.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SOLUTIONS.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 0.08}>
              <CardContainer className="!py-0">
                <CardBody className="group/card relative h-auto w-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6">
                  <CardItem translateZ={60} className="mb-5 grid size-12 place-items-center rounded-xl bg-brand text-white shadow-[0_0_28px] shadow-brand/50">
                    <Icon className="size-6" />
                  </CardItem>
                  <CardItem as="h3" translateZ={50} className="text-lg font-semibold">
                    {title}
                  </CardItem>
                  <CardItem as="p" translateZ={30} className="mt-2 text-sm text-white/55">
                    {body}
                  </CardItem>
                  <CardItem translateZ={40} className="mt-5 flex items-center gap-1.5 text-sm font-medium text-brand-accent">
                    Learn more <ArrowRight className="size-4" />
                  </CardItem>
                </CardBody>
              </CardContainer>
            </Reveal>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="relative overflow-hidden border-y border-white/5 bg-gradient-to-b from-[#04160e] to-[#03110b] py-24">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 size-[40rem] -translate-x-1/2 rounded-full bg-brand/15 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1} className="text-center">
              <Counter
                value={s.value}
                className="block bg-gradient-to-b from-white to-brand-accent bg-clip-text text-5xl font-extrabold text-transparent md:text-6xl"
              />
              <p className="mx-auto mt-3 max-w-[11rem] text-sm text-white/50">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-7xl px-6 py-28">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <Badge variant="outline" className="mb-4 border-brand/30 text-brand-accent">Why Acentra</Badge>
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              Central to progress.<br />Built for public health.
            </h2>
            <p className="mt-4 text-lg text-white/50">
              Three decades of public sector experience, backed by subject-matter
              experts and a health care advisory board.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Governance, budgets & goal alignment built in",
                "Bring-your-own-model flexibility across providers",
                "Security-first: HITRUST, SOC 2 & CMS-certified",
                "Clinical rigor paired with modern engineering",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-accent" />
                  <span className="text-white/75">{f}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-8 bg-brand text-white shadow-[0_0_24px] shadow-brand/40 hover:bg-brand/90">
              Meet the team <ArrowRight className="ml-2 size-4" />
            </Button>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8">
              <BorderBeam size={180} duration={11} colorFrom="#6ee7b7" colorTo="#17a34a" />
              <div className="space-y-4">
                {SOLUTIONS.map(({ icon: Icon, title }, i) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                    style={{ marginLeft: `${i * 14}px` }}
                  >
                    <div className="grid size-10 place-items-center rounded-lg bg-brand text-white">
                      <Icon className="size-5" />
                    </div>
                    <span className="font-medium">{title}</span>
                    <span className="ml-auto text-xs text-brand-accent">●&nbsp;live</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="overflow-hidden border-y border-white/5 bg-[#04160e] py-28">
        <Reveal className="mx-auto mb-14 max-w-2xl px-6 text-center">
          <Badge variant="outline" className="mb-4 border-brand/30 text-brand-accent">Client outcomes</Badge>
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Trusted by agencies serving millions
          </h2>
        </Reveal>
        <Marquee pauseOnHover className="[--duration:44s]">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="mx-3 w-[23rem] rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <div className="mb-3 flex gap-0.5 text-brand-accent">
                {"★★★★★".split("").map((s, i) => (<span key={i}>{s}</span>))}
              </div>
              <blockquote className="text-white/75">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-4 border-t border-white/10 pt-4">
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-white/45">{t.org}</div>
              </figcaption>
            </figure>
          ))}
        </Marquee>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-brand-deep to-[#03110b] px-8 py-20 text-center">
            <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-brand/40 blur-[110px]" />
            <BorderBeam size={260} duration={10} colorFrom="#17a34a" colorTo="#6ee7b7" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight md:text-6xl">
                Let&apos;s accelerate your{" "}
                <span className="bg-gradient-to-r from-brand-accent to-white bg-clip-text text-transparent">outcomes</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/60">
                Modernize claims, clinical, and provider operations in one integrated partnership.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <ShimmerButton background="#17a34a" className="px-8 py-3.5 text-base font-semibold">
                  Request a Demo <ArrowRight className="ml-2 size-4" />
                </ShimmerButton>
                <Button variant="outline" className="border-white/20 bg-white/5 px-8 py-6 text-base text-white hover:bg-white/10 hover:text-white">
                  Talk to Sales
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#03110b]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-bold">
              <span className="grid size-8 place-items-center rounded-lg bg-brand text-white">
                <HeartPulse className="size-4" />
              </span>
              Acentra<span className="text-brand-accent">Health</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-white/50">
              Accelerating better outcomes for the nation&apos;s healthcare agencies. McLean, VA.
            </p>
          </div>
          {[
            { h: "Solutions", items: ["Processing", "Clinical", "Analytics", "Provider"] },
            { h: "Company", items: ["About Us", "Careers", "Insights", "Contact"] },
            { h: "Legal", items: ["Privacy", "Terms", "Accessibility", "Security"] },
          ].map((col) => (
            <div key={col.h}>
              <div className="text-sm font-semibold">{col.h}</div>
              <ul className="mt-4 space-y-2">
                {col.items.map((i) => (
                  <li key={i}>
                    <a href="#" className="text-sm text-white/50 transition-colors hover:text-brand-accent">{i}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 py-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Acentra Health. Prototype landing page — brand-themed demo, not affiliated with Acentra Health.
        </div>
      </footer>
    </div>
  );
}

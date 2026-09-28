"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { MascotBot } from "@/components/platform/mascot-bot";
import { useLiveStore } from "@/lib/store/liveStore";

/**
 * A persistent AI-agent mascot pinned to the console. Eyes track the mouse
 * (via MascotBot). Surfaces the latest live alert as a speech bubble.
 */
export function ConsoleMascot() {
  const alerts = useLiveStore((s) => s.alertBuffer);
  const status = useLiveStore((s) => s.status);
  const [bubble, setBubble] = useState<string | null>(null);

  useEffect(() => {
    if (alerts.length === 0) return;
    const d = alerts[0].data as Record<string, unknown>;
    const sev = String(d.severity ?? "");
    const title = String(d.title ?? "Anomaly");
    setBubble(`${sev ? sev + " · " : ""}${title}`);
    const t = setTimeout(() => setBubble(null), 5000);
    return () => clearTimeout(t);
  }, [alerts]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end">
      <AnimatePresence>
        {bubble && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            className="mb-1 max-w-[220px] rounded-2xl rounded-br-sm border border-lime/30 bg-[#0b1f16]/90 px-3 py-2 text-xs text-white shadow-[0_0_30px] shadow-lime/10 backdrop-blur"
          >
            <span className="text-lime">⚠ Signal detected</span>
            <div className="mt-0.5 text-white/70">{bubble}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-full bg-lime/20 blur-2xl" />
        <MascotBot size={120} eyeColor="#22c55e" />
        <span
          className={`absolute right-6 top-2 size-2.5 rounded-full ${
            status === "connected" ? "bg-lime" : status === "connecting" ? "bg-amber-400" : "bg-red-500"
          } animate-pulse`}
        />
      </div>
    </div>
  );
}

"use client";

/**
 * MiraBubble — accessible speech bubble driven entirely by the controller.
 *
 * - Never the sole channel for critical info (the console UI/alert list remains
 *   the source of truth); this is a supplementary, ARIA-live announcement.
 * - Auto-dismisses with the reaction (controller nulls `bubble` on settle).
 * - Conveys severity by text + icon, not colour alone.
 */
import { AnimatePresence, motion } from "motion/react";

import { TONE_COLOR } from "@/components/mira/MiraState";
import { useMiraController } from "@/components/mira/MiraController";

export function MiraBubble({ className = "" }: { className?: string }) {
  const bubble = useMiraController((s) => s.bubble);
  const color = bubble ? TONE_COLOR[bubble.tone] : TONE_COLOR.brand;

  return (
    <div className={className} aria-live="polite" role="status">
      <AnimatePresence>
        {bubble && (
          <motion.div
            key={bubble.text + bubble.detail}
            initial={{ opacity: 0, y: 10, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="max-w-[240px] rounded-2xl rounded-br-sm border bg-[#0b1f16]/92 px-3 py-2 text-xs text-white shadow-[0_0_30px] backdrop-blur"
            style={{ borderColor: `${color}55`, boxShadow: `0 0 30px ${color}22` }}
          >
            <span className="font-semibold" style={{ color }}>
              {bubble.text}
            </span>
            {bubble.detail && <div className="mt-0.5 text-white/70">{bubble.detail}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

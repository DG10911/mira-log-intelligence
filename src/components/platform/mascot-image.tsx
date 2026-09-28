"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Realistic raster mascot (generated with Gemini/Nano Banana), sliced to a
 * transparent PNG. The image tilts + parallaxes toward the cursor and floats,
 * with a soft green glow — so it still "follows the mouse" like the SVG bot.
 */
export function MascotImage({
  pose = "hero",
  size = 360,
  className,
  glow = true,
}: {
  pose?: string;
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ x: 0, y: 0 });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return; // reduced motion: no parallax tracking
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      setT({
        x: Math.max(-1, Math.min(1, (e.clientX - cx) / 500)),
        y: Math.max(-1, Math.min(1, (e.clientY - cy) / 500)),
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [reduced]);

  return (
    <motion.div
      ref={ref}
      className={cn("relative select-none", className)}
      style={{ width: size, height: size, perspective: 900 }}
      whileHover={reduced ? undefined : { scale: 1.04 }}
      whileTap={reduced ? undefined : { scale: 0.94 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
    >
      {glow && (
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#22c55e]/25 blur-3xl"
          style={{ width: size * 0.7, height: size * 0.7 }}
        />
      )}
      <div
        className={cn("size-full", !reduced && "animate-[float_6s_ease-in-out_infinite]")}
        style={{
          transform: reduced
            ? undefined
            : `rotateY(${t.x * 10}deg) rotateX(${-t.y * 8}deg) translate3d(${t.x * 10}px, ${t.y * 8}px, 0)`,
          transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/mascot/${pose}.png`}
          alt="MIRA mascot"
          className="size-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
          draggable={false}
        />
      </div>
    </motion.div>
  );
}

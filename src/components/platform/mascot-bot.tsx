"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, type Target } from "motion/react";

import { useMiraController, dispatchMira } from "@/components/mira/MiraController";
import { TONE_COLOR, type MiraReaction } from "@/components/mira/MiraState";
import { cn } from "@/lib/utils";

/**
 * MIRA — a cute hooded robot whose head tilts and emerald eyes track the cursor.
 * Pure SVG (no 3D deps, no external asset). Gaze is rAF-smoothed and written
 * straight to the DOM (no per-pixel React re-render). Eye brightness and the
 * reaction "pop" are driven by the central MiraController, so every instance
 * stays in sync with the product's real state.
 *
 * Backward compatible: <MascotBot size eyeColor /> keeps its original look.
 */
export function MascotBot({
  size = 320,
  className,
  eyeColor = "#22c55e",
  interactive = false,
}: {
  size?: number;
  className?: string;
  eyeColor?: string;
  /** When true, hover/click dispatch real user-interaction reactions. */
  interactive?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const eyeRef = useRef<SVGGElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const cur = useRef({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const reducedMotion = useReducedMotion();

  const reaction = useMiraController((s) => s.reaction);
  const intensity = useMiraController((s) => s.intensity);
  const tone = useMiraController((s) => s.tone);
  const epoch = useMiraController((s) => s.epoch);

  // --- cursor gaze: capture target, lerp in rAF, write transforms to DOM ---
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const damp = reducedMotion ? 640 : 340;
      target.current.x = Math.max(-1, Math.min(1, (e.clientX - cx) / damp));
      target.current.y = Math.max(-1, Math.min(1, (e.clientY - cy) / damp));
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    let raf = 0;
    const tick = () => {
      const k = 0.16; // smoothing
      cur.current.x += (target.current.x - cur.current.x) * k;
      cur.current.y += (target.current.y - cur.current.y) * k;
      const { x, y } = cur.current;
      // body barely moves, head weakly, eyes strongest (per spec §9)
      if (bodyRef.current) bodyRef.current.style.transform = `translate(${x * 2}px, ${y * 1.5}px)`;
      if (headRef.current) headRef.current.style.transform = `translate(${x * 6}px, ${y * 5}px) rotate(${x * 3}deg)`;
      if (eyeRef.current) eyeRef.current.style.transform = `translate(${x * 8}px, ${y * 6}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  // --- occasional blink (skipped under reduced motion) ---
  useEffect(() => {
    if (reducedMotion) return;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        loop();
      }, 2200 + Math.random() * 2600);
    };
    loop();
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  // Eyes stay emerald; alert tone only lifts the glow. Intensity → glow radius.
  const glow = 3 + intensity * 6;
  const glowColor = tone === "brand" ? eyeColor : TONE_COLOR[tone];
  const eyeH = blink ? 4 : Math.round(24 + intensity * 6);
  const eyeY = blink ? 94 : Math.round(86 - intensity * 3);

  // Reaction "pop" on the wrapper — squash/stretch/bounce/wiggle by reaction.
  const pop = useMemo<Target>(() => reactionPop(reaction, reducedMotion ?? false), [reaction, epoch, reducedMotion]);

  return (
    <motion.div
      ref={wrap}
      className={cn("relative select-none", interactive && "pointer-events-auto cursor-pointer", className)}
      style={{ width: size, height: size }}
      animate={pop}
      transition={{ duration: reaction === "CLICK" ? 0.4 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      onPointerEnter={interactive ? () => dispatchMira({ reaction: "HOVER" }) : undefined}
      onPointerDown={interactive ? () => dispatchMira({ reaction: "CLICK" }) : undefined}
      aria-hidden="true"
    >
      <div
        className={reducedMotion ? undefined : "animate-[float_6s_ease-in-out_infinite]"}
        style={{ width: "100%", height: "100%" }}
      >
        {/* alert ring — appears only for amber/red tones, never recolors MIRA */}
        {tone !== "brand" && (
          <span
            className="absolute inset-2 -z-10 rounded-full"
            style={{ boxShadow: `0 0 0 2px ${glowColor}44, 0 0 40px ${glowColor}55` }}
          />
        )}
        <svg viewBox="0 0 240 260" width="100%" height="100%" fill="none">
          <defs>
            <radialGradient id="hood" cx="50%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#eef1ea" />
              <stop offset="100%" stopColor="#c9cfc2" />
            </radialGradient>
            <linearGradient id="visor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#26272b" />
              <stop offset="100%" stopColor="#101013" />
            </linearGradient>
            <filter id="eyeglow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation={glow} result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d7dccf" />
              <stop offset="100%" stopColor="#b4bba8" />
            </linearGradient>
          </defs>

          {/* soft ground shadow */}
          <ellipse cx="120" cy="246" rx="70" ry="10" fill="#000000" opacity="0.10" />

          {/* body / hoodie */}
          <g ref={bodyRef}>
            <path d="M64 180 Q56 250 78 252 L162 252 Q184 250 176 180 Q168 150 120 150 Q72 150 64 180Z" fill="url(#body)" />
            <line x1="106" y1="176" x2="104" y2="212" stroke="#8f9784" strokeWidth="3" strokeLinecap="round" />
            <line x1="134" y1="176" x2="136" y2="212" stroke="#8f9784" strokeWidth="3" strokeLinecap="round" />
            <circle cx="104" cy="214" r="3.4" fill={eyeColor} />
            <circle cx="136" cy="214" r="3.4" fill={eyeColor} />
            <rect x="118" y="176" width="4" height="60" rx="2" fill="#9aa38d" />
          </g>

          {/* hood + head */}
          <g ref={headRef}>
            <path d="M120 24 Q186 24 190 104 Q192 150 120 150 Q48 150 50 104 Q54 24 120 24Z" fill="url(#hood)" />
            <rect x="70" y="58" width="100" height="78" rx="30" fill="url(#visor)" />
            <rect x="70" y="58" width="100" height="78" rx="30" fill="none" stroke="#3a3b40" strokeWidth="1.5" />
            {/* eyes track cursor + brighten with reaction intensity */}
            <g ref={eyeRef} filter="url(#eyeglow)">
              <rect x="92" y={eyeY} width="12" height={eyeH} rx="6" fill={eyeColor} />
              <rect x="136" y={eyeY} width="12" height={eyeH} rx="6" fill={eyeColor} />
            </g>
          </g>
        </svg>
      </div>
    </motion.div>
  );
}

/** Map a reaction to a wrapper keyframe. Emerald identity is never recolored. */
function reactionPop(reaction: MiraReaction, reduced: boolean): Target {
  if (reduced) {
    // Functional but calm: a tiny scale nudge, no bounce/shake.
    return reaction === "IDLE" ? { scale: 1, y: 0, rotate: 0 } : { scale: 1.03, y: 0, rotate: 0 };
  }
  switch (reaction) {
    case "CLICK":
      return { scale: [1, 0.9, 1.06, 1], y: 0, rotate: 0 };
    case "HOVER":
      return { scale: 1.05, y: -2, rotate: 0 };
    case "WAVE":
    case "HAPPY":
    case "THUMBS_UP":
      return { scale: 1, y: [0, -8, 0], rotate: 0 };
    case "CHEER":
    case "SUCCESS":
      return { scale: [1, 1.06, 1], y: [0, -12, 0], rotate: 0 };
    case "LOW_ALERT":
      return { scale: 1, y: [0, -3, 0], rotate: 0 };
    case "MEDIUM_ALERT":
      return { scale: 1.03, y: [0, -8, 0], rotate: 0 };
    case "HIGH_ALERT":
      return { scale: 1.05, y: [0, -6, 0], rotate: [0, -3, 3, -2, 0] };
    case "CRITICAL_ALERT":
      return { scale: 1.08, y: [0, -4, 0], rotate: [0, -5, 5, -4, 0] };
    default:
      return { scale: 1, y: 0, rotate: 0 };
  }
}

"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A cute hooded robot mascot whose head tilts and eyes track the mouse cursor.
 * Pure SVG — no external assets. Multiple instances can live on one page.
 */
export function MascotBot({
  size = 320,
  className,
  eyeColor = "#bff23a",
}: {
  size?: number;
  className?: string;
  eyeColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      setT({
        x: Math.max(-1, Math.min(1, (e.clientX - cx) / 320)),
        y: Math.max(-1, Math.min(1, (e.clientY - cy) / 320)),
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
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
  }, []);

  const headStyle = {
    transform: `translate(${t.x * 6}px, ${t.y * 5}px) rotate(${t.x * 3}deg)`,
    transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1)",
  };
  const eyeShift = { transform: `translate(${t.x * 7}px, ${t.y * 5}px)`, transition: "transform 0.18s ease-out" };

  return (
    <div ref={ref} className={cn("relative select-none", className)} style={{ width: size, height: size }}>
      <div className="animate-[float_6s_ease-in-out_infinite]" style={{ width: "100%", height: "100%" }}>
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
              <feGaussianBlur stdDeviation="4" result="b" />
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
          <g style={headStyle}>
            <path d="M64 180 Q56 250 78 252 L162 252 Q184 250 176 180 Q168 150 120 150 Q72 150 64 180Z" fill="url(#body)" />
            {/* drawstrings */}
            <line x1="106" y1="176" x2="104" y2="212" stroke="#8f9784" strokeWidth="3" strokeLinecap="round" />
            <line x1="134" y1="176" x2="136" y2="212" stroke="#8f9784" strokeWidth="3" strokeLinecap="round" />
            <circle cx="104" cy="214" r="3.4" fill={eyeColor} />
            <circle cx="136" cy="214" r="3.4" fill={eyeColor} />
            {/* zipper accent */}
            <rect x="118" y="176" width="4" height="60" rx="2" fill="#9aa38d" />
          </g>

          {/* hood + head */}
          <g style={headStyle}>
            <path d="M120 24 Q186 24 190 104 Q192 150 120 150 Q48 150 50 104 Q54 24 120 24Z" fill="url(#hood)" />
            {/* visor */}
            <rect x="70" y="58" width="100" height="78" rx="30" fill="url(#visor)" />
            <rect x="70" y="58" width="100" height="78" rx="30" fill="none" stroke="#3a3b40" strokeWidth="1.5" />
            {/* eyes (track cursor) */}
            <g filter="url(#eyeglow)" style={eyeShift}>
              <rect x="92" y={blink ? 94 : 84} width="12" height={blink ? 4 : 26} rx="6" fill={eyeColor} />
              <rect x="136" y={blink ? 94 : 84} width="12" height={blink ? 4 : 26} rx="6" fill={eyeColor} />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

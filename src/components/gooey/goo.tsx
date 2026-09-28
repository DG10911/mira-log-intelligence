"use client";
/**
 * Shared gooey primitives: a per-instance SVG goo filter, the filtered shape layer, and spring presets.
 */
import * as React from "react";
import { useReducedMotion, type Transition } from "motion/react";
import { cn } from "@/lib/utils";

// How the goo works: blur every shape, then push alpha to 0 or 1. Two shapes closer than about
// two blur radii grow a smooth neck between them. Text never goes inside the filtered layer
// (the threshold makes it jagged), and blobs use opaque fills — tint the layer, not the blob.

/** Unique filter id per component instance, safe for a `url(#…)` fragment. */
export function useGooId(prefix = "goo") {
  return `${prefix}-${React.useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
}

/**
 * The filter definition. Kept rendered at size-0: Safari ignores filters defined inside
 * `display: none`. The region is widened past the default 10% so blurred edges never clip.
 */
export function GooFilter({
  id,
  sigma,
  region = 20,
}: {
  id: string;
  /** Blur radius (stdDeviation) in px. ~2px at 14px type; scale it with size. */
  sigma: number;
  /** How far past the box the filter renders, in percent per side. */
  region?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute size-0"
    >
      <defs>
        <filter
          id={id}
          x={`-${region}%`}
          y={`-${region}%`}
          width={`${100 + region * 2}%`}
          height={`${100 + region * 2}%`}
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation={sigma} result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
          />
        </filter>
      </defs>
    </svg>
  );
}

/**
 * The filtered layer. Holds solid shapes only. The filter goes through a CSS variable so the
 * Safari-only `@supports` fallback can switch it off by normal cascade order (Safari repaints
 * SVG filters on HTML unreliably while they animate), leaving the plain shapes.
 */
export function GooLayer({
  id,
  className,
  style,
  children,
}: {
  id: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 [filter:var(--goo)] supports-[-webkit-hyphens:none]:[filter:none]",
        className,
      )}
      style={{ "--goo": `url(#${id})`, ...style } as React.CSSProperties}
    >
      {children}
    </span>
  );
}

/**
 * Spring presets. The leader (the shape the eye follows) springs; the follower eases, so there is
 * a moment where the two are stretched apart and the neck shows.
 */
export const springs = {
  /** Leader growing in place or travelling up to ~2× its own size. Visible overshoot. */
  liquid: { type: "spring", stiffness: 266, damping: 15, mass: 1 },
  /** Leader hopping across a track or nav — overshoot scales with distance, so damp harder. */
  liquidLong: { type: "spring", stiffness: 266, damping: 24, mass: 1 },
  /** Knobs and toggles. One visible settle, no wobble. */
  snappy: { type: "spring", stiffness: 400, damping: 28, mass: 1 },
  /** Panels, loaders, anything bigger than a button. */
  heavy: { type: "spring", stiffness: 170, damping: 22, mass: 1.4 },
} satisfies Record<string, Transition>;

/** Follower that appears behind the leader and catches up (expo-out: fast start, long settle). */
export const easeArrive = [0.19, 1, 0.22, 1] as const;
/** Follower that must stay at the old spot while the leader leaves (slow start). */
export const easeHangBack = [0.65, 0, 0.35, 1] as const;

/** Returns `t`, or an instant transition when the user prefers reduced motion. */
export function useMotionSafe() {
  const reduced = useReducedMotion();
  return React.useCallback(
    (t: Transition): Transition => (reduced ? { duration: 0 } : t),
    [reduced],
  );
}

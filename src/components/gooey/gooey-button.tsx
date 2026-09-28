"use client";
/**
 * Press-to-confirm button: pressing buds an action pill out of the label pill through a neck; it splits free, then melts back when the button resets.
 */
import * as React from "react";
import { animate, motion, useMotionValue, useTransform, type AnimationPlaybackControls } from "motion/react";
import { cn } from "@/lib/utils";
import { GooFilter, GooLayer, easeArrive, easeHangBack, springs, useGooId, useMotionSafe } from "./goo";

// Choreography (press-driven, no hover):
// - Shapes: L, the label pill (always visible, the button's body); A, the action pill, parked as a
//   circle inside L's right end at rest; S, a thinner strand bridging L's right end and A's left end.
// - Press (click, Enter, Space): A is the leader and springs (`springs.liquid`) out of L to its own
//   slot, growing to its label width, while L slides left on `springs.snappy` so the pair ends up
//   centred where L was. S is the follower: 0.7 × pill height at first, thinning to 0 on the
//   slow-start ease over 0.42s, so for the first ~150ms A is still tied to L by a neck; then the
//   neck snaps and A sits free, a gap of 8px (> 2σ) away.
// - Reset (after `resetAfter` ms): A springs back into L and S thickens again (expo-out), so the
//   neck re-forms as the gap closes and L drinks A back in.
// - Mid-frame (≈100ms after the press): L and A joined by a narrow waist. σ = 2.5px at 14px type.

export type GooeyButtonVariant = "solid" | "subtle";
export type GooeyButtonSize = "sm" | "default" | "lg";

export interface GooeyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The button's label: the pill shown at rest. */
  children?: React.ReactNode;
  /** Label of the pill that buds off when the button is pressed (a confirmation such as "Copied"). */
  revealLabel?: React.ReactNode;
  variant?: GooeyButtonVariant;
  size?: GooeyButtonSize;
  /** How long the pressed state holds before the pill melts back in, in ms. */
  resetAfter?: number;
}

const sizePx: Record<GooeyButtonSize, number> = { sm: 13, default: 14, lg: 16 };
const pill =
  "inline-flex h-[2em] flex-none items-center justify-center whitespace-nowrap px-[0.85em]";

const GooeyButton = React.forwardRef<HTMLButtonElement, GooeyButtonProps>(
  (
    {
      children = "Copy link",
      revealLabel = "Copied",
      variant = "solid",
      size = "default",
      resetAfter = 1800,
      className,
      style,
      disabled,
      onClick,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const [done, setDone] = React.useState(false);
    const [widths, setWidths] = React.useState<[number, number] | null>(null);
    const measure = React.useRef<HTMLSpanElement>(null);
    const timer = React.useRef<number | undefined>(undefined);
    const safe = useMotionSafe();
    const gooId = useGooId("gooey-button");

    const solid = variant === "solid";
    const fontSize = sizePx[size];
    const unit = fontSize / 14;
    const sigma = 2.5 * unit;
    const offset = Math.ceil(20 * unit); // ≥ 3σ + A's spring overshoot past its slot
    const gap = 8 * unit; // > 2σ, so A splits free instead of staying bridged
    const h = 2 * fontSize;
    const [wL, wA] = widths ?? [0, 0];

    React.useLayoutEffect(() => {
      const element = measure.current;
      if (!element) return;
      const update = () => {
        const [label, , action] = Array.from(element.children);
        setWidths([label.getBoundingClientRect().width, action.getBoundingClientRect().width]);
      };
      update();
      const observer = new ResizeObserver(update);
      observer.observe(element);
      return () => observer.disconnect();
    }, [children, revealLabel, size]);

    React.useEffect(() => () => window.clearTimeout(timer.current), []);
    React.useEffect(() => {
      if (disabled) setDone(false);
    }, [disabled]);

    // Layout for each state, in the stage's content box (width = wL + gap + wA).
    const restL = (gap + wA) / 2;
    const target = done
      ? { l: 0, a: wL + gap, aw: wA }
      : { l: restL, a: restL + wL - h, aw: h };

    const lx = useMotionValue(target.l);
    const ax = useMotionValue(target.a);
    const aw = useMotionValue(target.aw);
    const neck = useMotionValue(0.7);

    const previous = React.useRef({ done, key: "" });
    const key = `${wL},${wA},${h}`;
    React.useEffect(() => {
      if (!widths) return;
      const prev = previous.current;
      previous.current = { done, key };
      // Same state (size change, StrictMode's second run): place without travelling.
      if (prev.done === done || prev.key === "") {
        lx.set(target.l);
        ax.set(target.a);
        aw.set(target.aw);
        return;
      }
      const running: AnimationPlaybackControls[] = done
        ? [
            animate(lx, target.l, safe(springs.snappy)),
            animate(ax, target.a, safe(springs.liquid)),
            animate(aw, target.aw, safe(springs.liquid)),
            animate(neck, [0.7, 0.55, 0], safe({ duration: 0.42, ease: easeHangBack })),
          ]
        : [
            animate(lx, target.l, safe(springs.snappy)),
            animate(ax, target.a, safe(springs.snappy)),
            animate(aw, target.aw, safe(springs.snappy)),
            animate(neck, 0.7, safe({ duration: 0.3, ease: easeArrive })),
          ];
      return () => running.forEach((c) => c.stop());
      // `target` is derived from done + widths, which `key` and `done` cover.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [done, key, widths, safe, lx, ax, aw, neck]);

    // Strand: from inside L's right end to inside A's left end, `neck` × h thick, vertically centred.
    const strandLeft = useTransform(() => lx.get() + wL - h / 2);
    const strandWidth = useTransform(() => Math.max(0, ax.get() + h / 2 - (lx.get() + wL - h / 2)));
    const strandHeight = useTransform(() => neck.get() * h);
    const strandTop = useTransform(() => (h - neck.get() * h) / 2);

    const textColor = solid ? "text-background" : "text-foreground";

    return (
      <button
        {...props}
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          "group/gooey relative isolate inline-flex cursor-pointer appearance-none border-0 bg-transparent p-0 text-left font-medium leading-none text-foreground outline-none select-none [-webkit-tap-highlight-color:transparent]",
          "disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        style={{ fontSize, ...style }}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || disabled) return;
          setDone(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setDone(false), resetAfter);
        }}
      >
        <GooFilter id={gooId} sigma={sigma} />

        {/* Stage: padded so the blur has room, pulled back with negative margins. */}
        <span className="relative inline-flex" style={{ padding: offset, margin: -offset }}>
          {widths && (
            <GooLayer id={gooId} className={solid ? "opacity-100" : "opacity-10"}>
              <motion.span
                className="absolute rounded-full bg-foreground"
                style={{ top: offset, left: offset, height: h, width: wL, x: lx }}
              />
              <motion.span
                className="absolute rounded-full bg-foreground"
                style={{ top: offset, left: offset, height: h, width: aw, x: ax }}
              />
              <motion.span
                className="absolute rounded-full bg-foreground"
                style={{
                  top: offset,
                  left: offset,
                  x: strandLeft,
                  y: strandTop,
                  width: strandWidth,
                  height: strandHeight,
                }}
              />
            </GooLayer>
          )}

          {/* Labels: never filtered. The label rides on L; the action word fades in over A's slot. */}
          {widths && (
            <span className="pointer-events-none absolute" style={{ top: offset, left: offset }}>
              <motion.span
                className={cn(
                  pill,
                  textColor,
                  "absolute top-0 left-0 rounded-full group-focus-visible/gooey:ring-[3px] group-focus-visible/gooey:ring-ring/50",
                )}
                style={{ width: wL, x: lx }}
              >
                {children}
              </motion.span>
              <motion.span
                aria-hidden="true"
                className={cn(pill, textColor, "absolute top-0 left-0")}
                style={{ width: wA, x: wL + gap }}
                initial={false}
                animate={{ opacity: done ? 1 : 0 }}
                transition={safe(
                  done ? { duration: 0.18, delay: 0.1, ease: easeArrive } : { duration: 0.08 },
                )}
              >
                {revealLabel}
              </motion.span>
            </span>
          )}

          {/* Before the first measure (server HTML): the resting pill, plain, so the button is never blank. */}
          {!widths && (
            <span
              className="pointer-events-none absolute flex justify-center"
              style={{ inset: offset }}
            >
              <span
                className={cn(pill, "rounded-full", solid ? "bg-foreground text-background" : "bg-muted")}
              >
                {children}
              </span>
            </span>
          )}

          {/* Hidden copy: sizes the stage and feeds pill widths to the ResizeObserver. */}
          <span ref={measure} aria-hidden="true" className="pointer-events-none invisible flex">
            <span className={pill}>{children}</span>
            <span style={{ width: gap }} />
            <span className={pill}>{revealLabel}</span>
          </span>
        </span>
        <span className="sr-only" aria-live="polite">
          {done ? revealLabel : null}
        </span>
      </button>
    );
  },
);

GooeyButton.displayName = "GooeyButton";

export default GooeyButton;

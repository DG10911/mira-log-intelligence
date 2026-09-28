"use client";

/**
 * MiraController — the central mascot state machine.
 *
 * A single global zustand store any surface can read (to render) or write (to
 * dispatch an intent). Enforces the spec's rules:
 *   - priority: a lower-priority intent never interrupts a higher active one
 *   - cooldown + dedup: the same event key can't re-fire within a window, so a
 *     burst of 100 related anomalies produces ONE reaction, not 100
 *   - rate limiting: a global minimum gap between alert-tier reactions
 *   - return-to-idle: every transient reaction schedules its own settle
 *
 * It holds NO timers that invent events — it only reacts to intents dispatched
 * from real application events (see useMiraEvents) or genuine user interaction.
 */
import { create } from "zustand";

import { BUBBLE_REACTIONS, REACTIONS, type MiraReaction, type MiraTone } from "./MiraState";

export interface MiraBubbleData {
  text: string;
  detail?: string;
  tone: MiraTone;
}

export interface MiraIntent {
  reaction: MiraReaction;
  /** Dedup key — repeated intents with the same key inside cooldown are merged. */
  key?: string;
  bubble?: MiraBubbleData;
}

interface MiraStore {
  reaction: MiraReaction;
  intensity: number;
  tone: MiraTone;
  bubble: MiraBubbleData | null;
  /** Bumps every time a reaction (re)starts, so views can retrigger animations. */
  epoch: number;
  dispatch: (intent: MiraIntent) => void;
  /** Force settle back to idle (used by the return-to-idle timer). */
  settle: () => void;
}

// Cooldown per dedup key, and a global floor between alert reactions.
const DEDUP_COOLDOWN_MS = 6000;
const ALERT_MIN_GAP_MS = 1100;
const ALERT_REACTIONS: ReadonlySet<MiraReaction> = new Set([
  "LOW_ALERT",
  "MEDIUM_ALERT",
  "HIGH_ALERT",
  "CRITICAL_ALERT",
]);

// Module-scoped scheduling state (not part of the reactive store).
let settleTimer: ReturnType<typeof setTimeout> | null = null;
let activePriority = 0;
let activeUntil = 0;
const recentKeys = new Map<string, number>();
let lastAlertAt = 0;

function isReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const useMiraController = create<MiraStore>((set) => ({
  reaction: "IDLE",
  intensity: REACTIONS.IDLE.intensity,
  tone: "brand",
  bubble: null,
  epoch: 0,

  dispatch: (intent) => {
    const spec = REACTIONS[intent.reaction];
    if (!spec) return;
    const now = Date.now();

    // Dedup: same key seen recently → ignore (prevents burst spam).
    if (intent.key) {
      const seen = recentKeys.get(intent.key);
      if (seen && now - seen < DEDUP_COOLDOWN_MS) return;
      recentKeys.set(intent.key, now);
      // opportunistic GC
      if (recentKeys.size > 200) {
        for (const [k, t] of recentKeys) if (now - t > DEDUP_COOLDOWN_MS) recentKeys.delete(k);
      }
    }

    // Global rate limit on alert-tier reactions.
    if (ALERT_REACTIONS.has(intent.reaction)) {
      if (now - lastAlertAt < ALERT_MIN_GAP_MS && spec.priority <= activePriority) return;
      lastAlertAt = now;
    }

    // Priority gate: don't interrupt a still-active higher-priority reaction.
    if (now < activeUntil && spec.priority < activePriority) return;

    activePriority = spec.priority;
    activeUntil = spec.duration > 0 ? now + spec.duration : Number.MAX_SAFE_INTEGER;

    if (settleTimer) clearTimeout(settleTimer);
    if (spec.duration > 0) {
      settleTimer = setTimeout(() => {
        activePriority = 0;
        activeUntil = 0;
        set((s) => ({
          reaction: "IDLE",
          intensity: REACTIONS.IDLE.intensity,
          tone: "brand",
          bubble: null,
          epoch: s.epoch + 1,
        }));
      }, spec.duration);
    }

    const reduced = isReducedMotion();
    const bubble = intent.bubble && BUBBLE_REACTIONS.has(intent.reaction) ? intent.bubble : null;

    set((s) => ({
      reaction: intent.reaction,
      // Reduced motion: keep functional intensity but calmer.
      intensity: reduced ? Math.min(spec.intensity, 0.5) : spec.intensity,
      tone: spec.tone,
      bubble,
      epoch: s.epoch + 1,
    }));
  },

  settle: () => {
    if (settleTimer) clearTimeout(settleTimer);
    activePriority = 0;
    activeUntil = 0;
    set((s) => ({
      reaction: "IDLE",
      intensity: REACTIONS.IDLE.intensity,
      tone: "brand",
      bubble: null,
      epoch: s.epoch + 1,
    }));
  },
}));

/** Imperative helper for non-hook call sites (e.g. event handlers, mutations). */
export function dispatchMira(intent: MiraIntent) {
  useMiraController.getState().dispatch(intent);
}

/**
 * MIRA state vocabulary — the single source of truth for what the mascot can
 * express, how strongly, in what color tone, and how the states rank against
 * each other. Pure data + types; no React, no side effects (unit-testable).
 */
import type { Severity } from "@/lib/api/types";

export type MiraReaction =
  | "IDLE"
  | "CURIOUS"
  | "THINKING"
  | "HAPPY"
  | "WAVE"
  | "POINT"
  | "THUMBS_UP"
  | "CHEER"
  | "SUCCESS"
  | "HOVER"
  | "CLICK"
  | "LOW_ALERT"
  | "MEDIUM_ALERT"
  | "HIGH_ALERT"
  | "CRITICAL_ALERT";

/** Alert colour tone. MIRA's body stays emerald; tone drives ring/glow only. */
export type MiraTone = "brand" | "amber" | "red";

export interface MiraReactionSpec {
  /** Higher wins. A lower-priority intent never interrupts a higher one. */
  priority: number;
  /** How long the reaction plays before returning to idle (ms). 0 = sticky. */
  duration: number;
  /** 0..1 — drives eye brightness/scale and motion energy. */
  intensity: number;
  tone: MiraTone;
}

export const REACTIONS: Record<MiraReaction, MiraReactionSpec> = {
  IDLE: { priority: 0, duration: 0, intensity: 0.28, tone: "brand" },
  CURIOUS: { priority: 15, duration: 1600, intensity: 0.45, tone: "brand" },
  THINKING: { priority: 15, duration: 2200, intensity: 0.4, tone: "brand" },
  HOVER: { priority: 20, duration: 900, intensity: 0.5, tone: "brand" },
  WAVE: { priority: 25, duration: 1800, intensity: 0.6, tone: "brand" },
  POINT: { priority: 25, duration: 1800, intensity: 0.6, tone: "brand" },
  THUMBS_UP: { priority: 25, duration: 1600, intensity: 0.65, tone: "brand" },
  CLICK: { priority: 30, duration: 550, intensity: 0.7, tone: "brand" },
  HAPPY: { priority: 32, duration: 1600, intensity: 0.6, tone: "brand" },
  CHEER: { priority: 35, duration: 2200, intensity: 0.85, tone: "brand" },
  SUCCESS: { priority: 36, duration: 2400, intensity: 0.8, tone: "brand" },
  LOW_ALERT: { priority: 40, duration: 2600, intensity: 0.55, tone: "brand" },
  MEDIUM_ALERT: { priority: 60, duration: 3200, intensity: 0.7, tone: "amber" },
  HIGH_ALERT: { priority: 80, duration: 4200, intensity: 0.88, tone: "amber" },
  CRITICAL_ALERT: { priority: 100, duration: 5200, intensity: 1, tone: "red" },
};

export const SEVERITY_TO_REACTION: Record<Severity, MiraReaction> = {
  LOW: "LOW_ALERT",
  MEDIUM: "MEDIUM_ALERT",
  HIGH: "HIGH_ALERT",
  CRITICAL: "CRITICAL_ALERT",
};

/** Default accessible bubble copy per severity (overridden by real context). */
export const SEVERITY_BUBBLE: Record<Severity, string> = {
  LOW: "Signal detected",
  MEDIUM: "Unusual activity",
  HIGH: "⚠ Anomaly detected",
  CRITICAL: "CRITICAL · anomaly",
};

export const TONE_COLOR: Record<MiraTone, string> = {
  brand: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
};

/** Reactions that should surface a speech bubble. */
export const BUBBLE_REACTIONS: ReadonlySet<MiraReaction> = new Set([
  "LOW_ALERT",
  "MEDIUM_ALERT",
  "HIGH_ALERT",
  "CRITICAL_ALERT",
  "SUCCESS",
]);

"use client";

import dynamic from "next/dynamic";

import { MascotBot } from "@/components/platform/mascot-bot";
import { MiraBubble } from "@/components/mira/MiraBubble";
import { useMiraController } from "@/components/mira/MiraController";
import { TONE_COLOR } from "@/components/mira/MiraState";
import { useLiveStore } from "@/lib/store/liveStore";

// 3D MIRA loads client-only (three.js touches window); the SVG bot is shown
// while the GLB streams and as the fallback if WebGL/GLB is unavailable.
const MiraCanvas = dynamic(() => import("@/components/mira/MiraCanvas"), {
  ssr: false,
  loading: () => <MascotBot size={120} eyeColor="#22c55e" interactive />,
});

/**
 * The persistent MIRA assistant pinned to the console (bottom-right). Eyes track
 * the cursor; hover/click give playful micro-reactions; severity-graded alert
 * reactions + an accessible bubble are driven by the central MiraController,
 * which itself only reacts to real backend events (see useMiraEvents).
 *
 * Positioned so it never covers navigation, charts, tables or primary actions.
 */
export function ConsoleMascot() {
  const status = useLiveStore((s) => s.status);
  const tone = useMiraController((s) => s.tone);
  const glow = TONE_COLOR[tone];

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 hidden flex-col items-end md:flex">
      <MiraBubble className="mb-1" />
      <div className="relative">
        <div
          className="absolute inset-0 -z-10 rounded-full blur-2xl transition-colors"
          style={{ background: `${glow}33` }}
        />
        <MiraCanvas size={120} />
        <span
          aria-hidden
          title={`connection: ${status}`}
          className={`pointer-events-none absolute right-6 top-2 size-2.5 rounded-full ${
            status === "connected" ? "bg-lime" : status === "connecting" ? "bg-amber-400" : "bg-red-500"
          } animate-pulse`}
        />
      </div>
    </div>
  );
}

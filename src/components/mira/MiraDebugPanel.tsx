"use client";

/**
 * MiraDebugPanel — development-only controls to preview MIRA reactions.
 *
 * Renders NOTHING in production builds (guarded by NODE_ENV). It only dispatches
 * controller intents to preview animations — it never injects fake alert data
 * into the live store, and is never required for production behavior.
 */
import { useState } from "react";

import { dispatchMira } from "@/components/mira/MiraController";
import { SEVERITY_BUBBLE } from "@/components/mira/MiraState";
import type { MiraReaction } from "@/components/mira/MiraState";

const GESTURES: MiraReaction[] = ["IDLE", "CURIOUS", "WAVE", "POINT", "THUMBS_UP", "CHEER", "SUCCESS"];
const ALERTS: { r: MiraReaction; sev: keyof typeof SEVERITY_BUBBLE }[] = [
  { r: "LOW_ALERT", sev: "LOW" },
  { r: "MEDIUM_ALERT", sev: "MEDIUM" },
  { r: "HIGH_ALERT", sev: "HIGH" },
  { r: "CRITICAL_ALERT", sev: "CRITICAL" },
];

export function MiraDebugPanel() {
  const [open, setOpen] = useState(false);
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 text-[11px]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-lime/40 bg-black/70 px-3 py-1 font-mono text-lime backdrop-blur"
      >
        MIRA DEBUG
      </button>
      {open && (
        <div className="mt-2 w-56 rounded-xl border border-white/15 bg-black/85 p-3 backdrop-blur">
          <div className="mb-1 font-mono uppercase tracking-widest text-white/40">Gestures</div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {GESTURES.map((r) => (
              <button
                key={r}
                onClick={() => dispatchMira({ reaction: r })}
                className="rounded-md border border-white/15 px-2 py-1 text-white/80 hover:bg-white/10"
              >
                {r.toLowerCase()}
              </button>
            ))}
          </div>
          <div className="mb-1 font-mono uppercase tracking-widest text-white/40">Alerts (preview)</div>
          <div className="flex flex-wrap gap-1.5">
            {ALERTS.map(({ r, sev }) => (
              <button
                key={r}
                onClick={() =>
                  dispatchMira({
                    reaction: r,
                    key: `debug-${r}-${Date.now()}`,
                    bubble: {
                      text: SEVERITY_BUBBLE[sev],
                      detail: `${sev} · preview · debug`,
                      tone: r === "CRITICAL_ALERT" ? "red" : sev === "HIGH" || sev === "MEDIUM" ? "amber" : "brand",
                    },
                  })
                }
                className="rounded-md border border-white/15 px-2 py-1 text-white/80 hover:bg-white/10"
              >
                {sev.toLowerCase()}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-white/30">Preview only — no data written to the live store.</p>
        </div>
      )}
    </div>
  );
}

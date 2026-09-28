"use client";

/**
 * MiraCanvas — mounts the 3D MIRA (R3F) with graceful degradation:
 *   - No WebGL  → render the 2D SVG MascotBot (never a blank hole).
 *   - GLB fails → <Suspense> keeps the SVG-less canvas empty; the ErrorBoundary
 *     below swaps in the SVG bot.
 *   - prefers-reduced-motion → 3D renders calm (no float/blink, damped gaze).
 *
 * This component is meant to be dynamically imported with `ssr: false` (three.js
 * touches `window`), so it only ever runs in the browser.
 */
import { Component, Suspense, useMemo, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";

import { MascotBot } from "@/components/platform/mascot-bot";
import { MiraModel } from "@/components/mira/MiraModel";

function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Swaps to the SVG bot if anything in the 3D subtree throws at runtime. */
class GLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function MiraCanvas({ size = 120, eyeColor = "#22c55e" }: { size?: number; eyeColor?: string }) {
  const reduced = useReducedMotion() ?? false;
  const webgl = useMemo(hasWebGL, []);
  const fallback = <MascotBot size={size} eyeColor={eyeColor} interactive />;

  if (!webgl) return fallback;

  return (
    <div style={{ width: size, height: size }} aria-hidden="true">
      <GLBoundary fallback={fallback}>
        <Canvas
          camera={{ position: [0, 0, 3.6], fov: 28 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 5, 4]} intensity={1.4} />
          <pointLight position={[-2, 1, 2]} intensity={8} color="#22c55e" distance={8} />
          <Suspense fallback={null}>
            <MiraModel reducedMotion={reduced} />
          </Suspense>
        </Canvas>
      </GLBoundary>
    </div>
  );
}

# MIRA — Interactive Mascot System

MIRA is a **first-class product component**, not a decorative image. It reads the
platform's real state through the same WebSocket events the rest of the product
consumes and visually communicates that state — without ever becoming the source
of truth. The detection backend remains authoritative; MIRA is supplementary UI.

> Tagline: **"See the signal before it becomes an incident."**

---

## 1. Architecture at a glance

```
Real backend WS events (Redis → /ws/events)
        │
        ▼
useEventStream ──▶ liveStore (zustand)         [existing, unchanged contract]
        │
        ▼
useMiraEvents  ──▶ dispatchMira(intent)         [the ONLY event→mascot bridge]
        │
        ▼
MiraController (zustand state machine)          [priority · cooldown · dedup · settle]
        │
        ├──▶ MascotBot  (SVG, gaze + reaction pop + eye brightness)
        └──▶ MiraBubble (accessible ARIA-live speech bubble)
```

**Key rule:** there are **no fake timers or random reactions**. MIRA only reacts
to intents dispatched from real events (`useMiraEvents`) or genuine user
interaction (hover/click) — plus the dev-only preview panel.

---

## 2. Files

| File | Responsibility |
|---|---|
| `src/components/mira/MiraState.ts` | Reaction vocabulary, priorities, durations, intensities, tone colors, severity→reaction & bubble maps. Pure data (unit-testable). |
| `src/components/mira/MiraController.ts` | Central zustand state machine. `dispatch(intent)` with priority gate, dedup cooldown, alert rate-limit, return-to-idle. `dispatchMira()` imperative helper. |
| `src/lib/mira/useMiraEvents.ts` | Subscribes to `liveStore`, maps real WS events → controller intents. Mount once (in `AppShell`). |
| `src/components/mira/MiraBubble.tsx` | Accessible (`role=status`, `aria-live=polite`) auto-dismissing speech bubble. |
| `src/components/mira/MiraDebugPanel.tsx` | **Dev-only** preview controls (returns `null` in production). Never writes to the live store. |
| `src/components/mira/index.ts` | Barrel exports. |
| `src/components/platform/mascot-bot.tsx` | The SVG MIRA: rAF cursor gaze, blink, controller-driven eye brightness/tone, hover/click reactions. |
| `src/components/platform/mascot-image.tsx` | Raster MIRA (landing) with parallax + hover/tap, reduced-motion aware. |
| `src/components/platform/console-mascot.tsx` | Bottom-right console assistant (bot + bubble + tone glow + connection dot). |

---

## 3. State machine

Reactions and their priority / duration / intensity / tone live in
`MiraState.ts → REACTIONS`. Priority order (higher wins):

```
CRITICAL_ALERT (100) > HIGH_ALERT (80) > MEDIUM_ALERT (60) > LOW_ALERT (40)
> SUCCESS/CHEER (35) > CLICK (30) > WAVE/POINT/THUMBS_UP (25)
> HOVER (20) > CURIOUS/THINKING (15) > IDLE (0)
```

**Interruption rules** (`MiraController.dispatch`):
- A lower-priority intent **cannot** interrupt a still-active higher-priority one.
- Because all reactions are transient (they schedule a return-to-idle), user
  interactions (20–30) always beat idle (0) and any expired alert — so MIRA is
  never permanently locked by a background state.

**Deduplication & rate limiting** (prevents "100 logs → 100 animations"):
- `intent.key` is remembered for `DEDUP_COOLDOWN_MS` (6s). A repeat key inside
  the window is ignored. `useMiraEvents` keys alerts on the **incident id** (or
  anomaly id), so a storm collapses into one reaction.
- Alert-tier reactions honor a global `ALERT_MIN_GAP_MS` (1.1s) floor.

**Return-to-idle:** every reaction with `duration > 0` schedules a settle that
resets reaction/intensity/tone/bubble to IDLE.

---

## 4. Event mapping (`useMiraEvents`)

| Real event (WsEvent.type) | MIRA reaction |
|---|---|
| `anomaly_detected` / `alert_created` (severity) | `LOW/MEDIUM/HIGH/CRITICAL_ALERT` + bubble |
| `incident_created` (severity) | same tier, bubble text = "Incident opened" |
| `incident_updated` | (arrives in `alertBuffer`? no — updates only bump; no new reaction) |
| `baseline_updated` → state becomes `ACTIVE` | `HAPPY` (calm positive beat, no bubble) |
| Incident transitioned to `RESOLVED` (user action, incidents page) | `SUCCESS` "Incident resolved" |

Severity → reaction and default bubble copy are in `MiraState.ts`
(`SEVERITY_TO_REACTION`, `SEVERITY_BUBBLE`).

> **Note on `incident_resolved`:** the backend does **not** currently emit a
> dedicated `incident_resolved` WS event (the lifecycle `PATCH /api/incidents/{id}`
> transition persists but publishes nothing). The "MIRA celebrates" beat is
> therefore wired from the **real user action** in `incidents/page.tsx`
> (`transition.mutate(..., { onSuccess })` when `to_state === "RESOLVED"`). If a
> backend `incident_resolved` broadcast is added later, map it in `useMiraEvents`
> and remove the page-level dispatch.

---

## 5. Alert visuals (brand-safe)

MIRA's body/eyes stay **emerald** at all times. Alert severity is expressed via:
- **eye brightness / glow radius** (intensity-driven),
- a **tone ring** around the bot (`amber` for MEDIUM/HIGH, `red` for CRITICAL),
- the **bubble** border/glow + text,
- surrounding console glow (`console-mascot.tsx`).

Never recolor the whole body red (spec §13). Tone colors: `MiraState.ts → TONE_COLOR`.

---

## 6. Cursor tracking (`MascotBot`)

- Mouse position → a target ref; a `requestAnimationFrame` loop lerps toward it
  (smoothing `k = 0.16`) and writes transforms **directly to the DOM** — no React
  re-render per pixel.
- Response strength per spec §9: **eyes strongest, head weaker, body almost none.**
- Reduced-motion increases damping and disables float/blink.

Tunables (in `mascot-bot.tsx`): the `damp` divisor (gaze sensitivity), the `k`
smoothing constant, and the per-part multipliers (`x*8` eyes, `x*6` head, `x*2` body).

---

## 7. Accessibility

- The bubble is `role="status"` + `aria-live="polite"`; the bot SVG is
  `aria-hidden` (decorative). Critical info is **always** also in the console UI /
  alert list — MIRA is never the sole channel.
- `prefers-reduced-motion` is respected in `MascotBot` and `MascotImage`
  (no float, damped/disabled gaze, calmer reaction pops).
- No keyboard focus trap; interactive bot is a pointer affordance only.

---

## 8. Performance & fallback

- Zero new dependencies — reuses `motion` (Framer Motion) + `zustand` already in
  the app. No 3D bundle cost.
- rAF gaze avoids re-render storms; blink is a cheap infrequent `setState`.
- WS disconnect → store status flips; MIRA simply stays in IDLE (no crash).
- If a raster pose PNG is missing, the `<img>` alt text degrades gracefully.

---

## 9. How to add a new animation / gesture

1. Add the reaction name to `MiraReaction` and a spec row in `REACTIONS`
   (`MiraState.ts`).
2. Add a keyframe branch in `reactionPop()` (`mascot-bot.tsx`).
3. Dispatch it: `dispatchMira({ reaction: "MY_GESTURE" })` (from a real event in
   `useMiraEvents`, a user handler, or the debug panel).

## 10. How to add a new alert state

1. Extend `Severity` (backend + `types.ts`) and `SEVERITY_TO_REACTION` /
   `SEVERITY_BUBBLE`.
2. Pick a priority/tone in `REACTIONS`.
3. `useMiraEvents` maps it automatically via `SEVERITY_TO_REACTION`.

---

## 11. Development controls

`MiraDebugPanel` (bottom-left, dev only) previews gestures and alert reactions.
It dispatches controller intents **only** — it never injects fake events into the
live store, and is compiled out of production (`NODE_ENV === "production"`).

---

## 12. Optional upgrade path — 3D (R3F + GLB)

The current mascot is **2D (SVG + raster poses)** by deliberate choice: it ships
fully, adds no heavy dependencies, and is mobile-friendly. A true 3D MIRA is a
documented, optional future step (see `tools/blender/README.md`):

1. Build/rig/export the model in Blender via `tools/blender/*.py`, producing
   `public/mira/mira.glb`.
2. Add `three` + `@react-three/fiber` + `@react-three/drei`.
3. Create a `MiraCanvas.tsx` that loads the GLB and maps controller state →
   morph targets / bone poses, keeping the **same `MiraController`** as the brain.

> **Status:** Blender 5.2.2 LTS is installed and the pipeline **has been run** —
> `public/mira/mira.glb` (~52 KB, Draco-compressed) exists and is verified: 21
> nodes (all `MIRA_*` meshes + rig bones), armature `MIRA_Rig`, and 4 baked
> animations (`MIRA_IDLE`, `MIRA_BLINK`, `MIRA_WAVE`, `MIRA_NOD`). What is **not**
> yet done: the React Three Fiber render path (`MiraCanvas.tsx`) that loads and
> drives the GLB — the shipping mascot is still the 2D SVG/raster system. Wiring
> R3F adds `three` + `@react-three/fiber` + `@react-three/drei`.

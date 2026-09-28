# MIRA — Blender → GLB pipeline (optional 3D upgrade)

These scripts build a **rigged, animated, web-optimized `mira.glb`** for the
optional React Three Fiber upgrade path. They are **deterministic and idempotent**
(safe to re-run).

> **Status:** run with **Blender 5.2.2 LTS** — `public/mira/mira.glb` (~52 KB,
> Draco) has been generated and verified (21 `MIRA_*`/bone nodes, `MIRA_Rig`
> armature, 4 animations). Re-run these scripts to regenerate. The React render
> path that consumes the GLB (`MiraCanvas.tsx`, R3F) is the remaining step; today
> the shipping mascot is the 2D SVG/raster system — see `docs/mira.md`.

## Prerequisites
- Blender ≥ 4.0 (the glTF exporter with Draco ships built-in).

## Run (one shot)
```bash
blender --background \
  --python tools/blender/build_mira.py \
  --python tools/blender/rig_mira.py \
  --python tools/blender/animate_mira.py \
  --python tools/blender/export_mira.py
```
Output: `public/mira/mira.glb`.

## What each script does
| Script | Step |
|---|---|
| `build_mira.py` | Builds a low-poly MIRA proxy from primitives — big-headed chibi, grey hoodie, dark visor, two emerald vertical pill eyes, stubby hands, white shoes. Colors match the 2D mascot. |
| `rig_mira.py` | Adds the armature: ROOT→SPINE→CHEST→NECK→HEAD, ARM/HAND.L/R, EYE.L/R, and parents mesh parts to bones. |
| `animate_mira.py` | Bakes actions: `MIRA_IDLE`, `MIRA_BLINK`, `MIRA_WAVE`, `MIRA_NOD`. |
| `export_mira.py` | Exports Draco-compressed GLB with animations to `public/mira/mira.glb`. |

## Web integration sketch (after the GLB exists)
1. `npm i three @react-three/fiber @react-three/drei`
2. Create `src/components/mira/MiraCanvas.tsx`:
   - `useGLTF("/mira/mira.glb")` + `useAnimations(...)`
   - Subscribe to the **existing** `useMiraController` store; map
     `reaction`/`intensity`/`tone` → play the matching action + drive HEAD/EYE
     bones toward the cursor (reuse the gaze math from `mascot-bot.tsx`).
   - Wrap in `<Suspense>`, adaptive `dpr`, and pause the frameloop when
     off-screen (`frameloop="demand"` + IntersectionObserver).
3. Swap `MascotBot` for `MiraCanvas` behind a capability check; keep `MascotBot`
   (SVG) as the **WebGL-unavailable fallback**.

The `MiraController` state machine stays the brain in both 2D and 3D — only the
renderer changes.

## Notes
- The proxy is intentionally simple (riggable + light for the web). A polished
  hero look benefits from manual sculpting/shading; treat these scripts as the
  automated, reproducible baseline.
- Re-running clears prior `MIRA*` objects first, so edits never accumulate.

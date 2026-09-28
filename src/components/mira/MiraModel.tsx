"use client";

/**
 * MiraModel — the R3F scene contents: loads the Blender-built GLB, plays baked
 * clips, and drives cursor gaze + eye brightness from the SAME MiraController
 * that powers the 2D mascot. No new event system; the controller is the brain.
 *
 * Design choices for reliability:
 *  - IDLE (root float) + WAVE are the baked clips we play (they touch root/arm
 *    only, so they never fight manual control).
 *  - Gaze, blink and eye emissive are driven MANUALLY on HEAD / EYE.* bones and
 *    the emerald material — avoids glTF PropertyBinding issues with dotted bone
 *    names and keeps eyes emerald (alert tone lives in the surrounding glow).
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { useMiraController } from "@/components/mira/MiraController";

const GLB = "/mira/mira.glb";

export function MiraModel({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(GLB);
  // Clone so multiple mounts don't share one graph.
  const model = useMemo(() => scene.clone(true), [scene]);
  const { actions } = useAnimations(animations, group);

  const reaction = useMiraController((s) => s.reaction);
  const intensity = useMiraController((s) => s.intensity);
  const epoch = useMiraController((s) => s.epoch);

  // Cursor target in normalized [-1,1], updated off the React path.
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Cache bone / material handles once the model is ready.
  const refs = useMemo(() => {
    const head = model.getObjectByName("HEAD") as THREE.Object3D | null;
    const eyeL = model.getObjectByName("EYE.L") as THREE.Object3D | null;
    const eyeR = model.getObjectByName("EYE.R") as THREE.Object3D | null;
    let eyeMat: THREE.MeshStandardMaterial | null = null;
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (mat && mat.name === "MIRA_eye") eyeMat = mat;
    });
    return { head, eyeL, eyeR, eyeMat, headRest: head?.rotation.clone() };
  }, [model]);

  // Base idle loop.
  useEffect(() => {
    const idle = actions["MIRA_IDLE"];
    if (idle && !reducedMotion) idle.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    return () => void idle?.stop();
  }, [actions, reducedMotion]);

  // Play WAVE once on wave-like reactions.
  useEffect(() => {
    const wave = actions["MIRA_WAVE"];
    const waveLike = reaction === "WAVE" || reaction === "HAPPY" || reaction === "CHEER" || reaction === "THUMBS_UP" || reaction === "SUCCESS";
    if (wave && waveLike && !reducedMotion) {
      wave.reset().setLoop(THREE.LoopOnce, 1);
      wave.clampWhenFinished = true;
      wave.fadeIn(0.15).play();
      const t = setTimeout(() => wave.fadeOut(0.4), 1400);
      return () => clearTimeout(t);
    }
  }, [actions, reaction, epoch, reducedMotion]);

  // Manual per-frame: gaze (eyes strongest, head weaker), blink, eye glow, pop.
  const blink = useRef({ next: 2 + Math.random() * 2, closing: 0 });
  const popScale = useRef(1);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const px = THREE.MathUtils.clamp(pointer.current.x, -1, 1);
    const py = THREE.MathUtils.clamp(pointer.current.y, -1, 1);
    const damp = reducedMotion ? 0.06 : 0.12;

    // Head gaze (weak)
    if (refs.head && refs.headRest) {
      refs.head.rotation.y = THREE.MathUtils.lerp(refs.head.rotation.y, refs.headRest.y + px * 0.28, damp);
      refs.head.rotation.x = THREE.MathUtils.lerp(refs.head.rotation.x, refs.headRest.x + py * 0.18, damp);
    }
    // Eye gaze (strong) — small local offset on each eye bone
    for (const eye of [refs.eyeL, refs.eyeR]) {
      if (!eye) continue;
      eye.rotation.y = THREE.MathUtils.lerp(eye.rotation.y, px * 0.4, damp);
      eye.rotation.x = THREE.MathUtils.lerp(eye.rotation.x, py * 0.3, damp);
    }

    // Blink (manual eye squash) — skipped under reduced motion
    if (!reducedMotion && refs.eyeL && refs.eyeR) {
      blink.current.next -= dt;
      let sy = 1;
      if (blink.current.next <= 0) {
        blink.current.closing = 0.13;
        blink.current.next = 2.4 + Math.random() * 2.6;
      }
      if (blink.current.closing > 0) {
        blink.current.closing -= dt;
        sy = 0.15;
      }
      refs.eyeL.scale.y = THREE.MathUtils.lerp(refs.eyeL.scale.y, sy, 0.5);
      refs.eyeR.scale.y = THREE.MathUtils.lerp(refs.eyeR.scale.y, sy, 0.5);
    }

    // Eye emissive brightness from controller intensity (eyes stay emerald)
    if (refs.eyeMat) {
      const target = 1.4 + intensity * 5;
      refs.eyeMat.emissiveIntensity = THREE.MathUtils.lerp(refs.eyeMat.emissiveIntensity ?? 1, target, 0.1);
    }

    // Reaction pop + gentle float on the whole group
    if (group.current) {
      const targetScale = reaction === "IDLE" ? 1 : reaction === "CLICK" ? 0.94 : 1.05;
      popScale.current = THREE.MathUtils.lerp(popScale.current, targetScale, 0.2);
      group.current.scale.setScalar(popScale.current);
      group.current.position.y = reducedMotion ? 0 : Math.sin(t * 1.4) * 0.04;
    }
  });

  return (
    <group ref={group} position={[0, -0.9, 0]}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(GLB);

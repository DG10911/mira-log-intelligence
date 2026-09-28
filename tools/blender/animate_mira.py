"""animate_mira.py — bake baseline actions onto the MIRA rig.

Run inside Blender AFTER build_mira.py + rig_mira.py. Creates NLA-ready actions
that the web runtime (or drei useAnimations) can play by name:

    MIRA_IDLE   — gentle vertical float on ROOT (loopable)
    MIRA_BLINK  — EYE.L/EYE.R scale-Z compress and restore
    MIRA_WAVE   — ARM.R raise + oscillate
    MIRA_NOD    — HEAD pitch (used for LOW/acknowledge)

Keyframe values are deterministic. Extend by adding entries to ACTIONS.
"""
import bpy  # type: ignore
import math


def _action(name):
    a = bpy.data.actions.get(name) or bpy.data.actions.new(name)
    return a


def _pose_bone(rig, bone):
    return rig.pose.bones.get(bone)


def build_actions():
    rig = bpy.data.objects.get("MIRA_Rig")
    if not rig:
        raise RuntimeError("MIRA_Rig missing — run build_mira.py then rig_mira.py first")
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")

    # IDLE — ROOT bobs up/down over 60 frames
    root = _pose_bone(rig, "ROOT")
    idle = _action("MIRA_IDLE")
    rig.animation_data_create()
    rig.animation_data.action = idle
    for f, z in [(1, 0.0), (30, 0.04), (60, 0.0)]:
        root.location = (0, 0, z)
        root.keyframe_insert("location", frame=f)

    # BLINK — eyes compress on Z at frame 3, restore by 6
    blink = _action("MIRA_BLINK")
    rig.animation_data.action = blink
    for eye in ("EYE.L", "EYE.R"):
        pb = _pose_bone(rig, eye)
        for f, s in [(1, 1.0), (3, 0.12), (6, 1.0)]:
            pb.scale = (1, 1, s)
            pb.keyframe_insert("scale", frame=f)

    # WAVE — ARM.R raises and oscillates
    wave = _action("MIRA_WAVE")
    rig.animation_data.action = wave
    arm = _pose_bone(rig, "ARM.R")
    for f, deg in [(1, 0), (10, -70), (20, -55), (30, -70), (45, 0)]:
        arm.rotation_mode = "XYZ"
        arm.rotation_euler = (0, 0, math.radians(deg))
        arm.keyframe_insert("rotation_euler", frame=f)

    # NOD — head pitch acknowledge
    nod = _action("MIRA_NOD")
    rig.animation_data.action = nod
    head = _pose_bone(rig, "HEAD")
    for f, deg in [(1, 0), (8, 12), (16, 0)]:
        head.rotation_mode = "XYZ"
        head.rotation_euler = (math.radians(deg), 0, 0)
        head.keyframe_insert("rotation_euler", frame=f)

    bpy.ops.object.mode_set(mode="OBJECT")
    print("[animate_mira] actions:", [a.name for a in bpy.data.actions if a.name.startswith("MIRA_")])


if __name__ == "__main__":
    build_actions()

"""rig_mira.py — add a minimal animation armature to the MIRA proxy.

Run inside Blender AFTER build_mira.py:
    blender --background --python tools/blender/build_mira.py --python tools/blender/rig_mira.py

Creates bones: ROOT → SPINE → CHEST → NECK → HEAD, plus ARM.L/ARM.R,
HAND.L/HAND.R and EYE.L/EYE.R. Parents mesh parts to the matching bones so the
web runtime can drive idle, blink, head/eye gaze, wave, point and thumbs-up.

Deterministic & idempotent: removes an existing "MIRA_Rig" first.
"""
import bpy  # type: ignore

BONES = [
    ("ROOT", None, (0, 0, 0), (0, 0, 0.2)),
    ("SPINE", "ROOT", (0, 0, 0.2), (0, 0, 0.75)),
    ("CHEST", "SPINE", (0, 0, 0.75), (0, 0, 1.05)),
    ("NECK", "CHEST", (0, 0, 1.05), (0, 0, 1.2)),
    ("HEAD", "NECK", (0, 0, 1.2), (0, 0, 1.9)),
    ("ARM.L", "CHEST", (-0.4, 0, 0.9), (-0.6, 0, 0.7)),
    ("ARM.R", "CHEST", (0.4, 0, 0.9), (0.6, 0, 0.7)),
    ("HAND.L", "ARM.L", (-0.6, 0, 0.7), (-0.62, 0, 0.62)),
    ("HAND.R", "ARM.R", (0.6, 0, 0.7), (0.62, 0, 0.62)),
    ("EYE.L", "HEAD", (-0.17, -0.55, 1.6), (-0.17, -0.7, 1.6)),
    ("EYE.R", "HEAD", (0.17, -0.55, 1.6), (0.17, -0.7, 1.6)),
]

PARENTING = {
    "MIRA_Head": "HEAD", "MIRA_Visor": "HEAD",
    "MIRA_Eye_L": "EYE.L", "MIRA_Eye_R": "EYE.R",
    "MIRA_Body": "CHEST",
    "MIRA_Hand_L": "HAND.L", "MIRA_Hand_R": "HAND.R",
    "MIRA_Shoe_L": "ROOT", "MIRA_Shoe_R": "ROOT",
}


def rig():
    existing = bpy.data.objects.get("MIRA_Rig")
    if existing:
        bpy.data.objects.remove(existing, do_unlink=True)

    arm_data = bpy.data.armatures.new("MIRA_Armature")
    rig_obj = bpy.data.objects.new("MIRA_Rig", arm_data)
    bpy.context.collection.objects.link(rig_obj)
    bpy.context.view_layer.objects.active = rig_obj
    bpy.ops.object.mode_set(mode="EDIT")

    made = {}
    for name, parent, head, tail in BONES:
        b = arm_data.edit_bones.new(name)
        b.head, b.tail = head, tail
        if parent and parent in made:
            b.parent = made[parent]
        made[name] = b
    bpy.ops.object.mode_set(mode="OBJECT")

    # Parent mesh parts to bones via an Armature modifier + vertex-group hack:
    # simplest deterministic approach = object-level bone parenting.
    for mesh_name, bone_name in PARENTING.items():
        obj = bpy.data.objects.get(mesh_name)
        if not obj:
            continue
        obj.parent = rig_obj
        obj.parent_type = "BONE"
        obj.parent_bone = bone_name

    print("[rig_mira] rig created with bones:", [b[0] for b in BONES])


if __name__ == "__main__":
    rig()

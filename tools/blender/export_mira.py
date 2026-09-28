"""export_mira.py — export the rigged, animated MIRA to a web-optimized GLB.

Run inside Blender as the final step:
    blender --background \
      --python tools/blender/build_mira.py \
      --python tools/blender/rig_mira.py \
      --python tools/blender/animate_mira.py \
      --python tools/blender/export_mira.py

Writes public/mira/mira.glb with Draco compression, all MIRA_* actions baked as
glTF animations. The React runtime then loads it via useGLTF / useAnimations.
"""
import bpy  # type: ignore
import os

# Resolve <repo>/public/mira/mira.glb relative to this file (tools/blender/).
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT_DIR = os.path.join(REPO, "public", "mira")
OUT = os.path.join(OUT_DIR, "mira.glb")


def export():
    os.makedirs(OUT_DIR, exist_ok=True)
    # Purge anything that isn't MIRA_* (e.g. Blender's default startup Cube/
    # Icosphere/Camera/Light) so the GLB contains ONLY the mascot.
    for obj in list(bpy.data.objects):
        if not obj.name.startswith("MIRA"):
            bpy.data.objects.remove(obj, do_unlink=True)
    # Select only MIRA_* objects + the rig.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.data.objects:
        if obj.name.startswith("MIRA"):
            obj.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_yup=True,
    )
    size_kb = os.path.getsize(OUT) / 1024 if os.path.exists(OUT) else 0
    print(f"[export_mira] wrote {OUT} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    export()

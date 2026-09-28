"""build_mira.py — construct a stylized low-poly MIRA proxy from primitives.

Run inside Blender:
    blender --background --python tools/blender/build_mira.py

Deterministic & idempotent: it clears any existing "MIRA*" objects first, then
rebuilds. Proportions/colors match the 2D mascot (big-headed chibi, light-grey
hoodie, dark visor, two emerald vertical pill eyes, stubby hands, white shoes).

NOTE: This is a low-poly PROXY suitable for rigging and web delivery. A polished
hero render still benefits from manual sculpting/shading in Blender.
"""
import bpy  # type: ignore  (only resolvable inside Blender)
import math

EMERALD = (0.086, 0.639, 0.290, 1.0)   # #16A34A
CHARCOAL = (0.067, 0.094, 0.153, 1.0)  # #111827
HOODIE = (0.82, 0.84, 0.79, 1.0)       # soft matte grey
WHITE = (0.96, 0.97, 0.95, 1.0)


def _mat(name, rgba, emission=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = 0.55
    if emission and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = rgba
        bsdf.inputs["Emission Strength"].default_value = emission
    return m


def _clear():
    for obj in list(bpy.data.objects):
        if obj.name.startswith("MIRA"):
            bpy.data.objects.remove(obj, do_unlink=True)


def _add(kind, name, loc, scale, mat, **kw):
    if kind == "uv":
        bpy.ops.mesh.primitive_uv_sphere_add(location=loc, **kw)
    elif kind == "cube":
        bpy.ops.mesh.primitive_cube_add(location=loc, **kw)
    elif kind == "cyl":
        bpy.ops.mesh.primitive_cylinder_add(location=loc, **kw)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    if mat:
        o.data.materials.append(mat)
    return o


def build():
    _clear()
    m_hood = _mat("MIRA_hoodie", HOODIE)
    m_visor = _mat("MIRA_visor", CHARCOAL)
    m_eye = _mat("MIRA_eye", EMERALD, emission=4.0)
    m_shoe = _mat("MIRA_shoe", WHITE)

    # Head (hood) — big, rounded
    _add("uv", "MIRA_Head", (0, 0, 1.55), (0.62, 0.55, 0.6), m_hood, segments=32, ring_count=16, radius=1)
    # Visor — rounded flat panel on the face (+Y)
    _add("cube", "MIRA_Visor", (0, -0.5, 1.55), (0.42, 0.06, 0.32), m_visor, size=1)
    # Two vertical pill eyes
    _add("cyl", "MIRA_Eye_L", (-0.17, -0.58, 1.6), (0.05, 0.05, 0.12), m_eye, vertices=16, radius=1, depth=1)
    _add("cyl", "MIRA_Eye_R", (0.17, -0.58, 1.6), (0.05, 0.05, 0.12), m_eye, vertices=16, radius=1, depth=1)
    bpy.data.objects["MIRA_Eye_L"].rotation_euler[0] = math.radians(90)
    bpy.data.objects["MIRA_Eye_R"].rotation_euler[0] = math.radians(90)
    # Body (hoodie)
    _add("uv", "MIRA_Body", (0, 0, 0.75), (0.5, 0.42, 0.5), m_hood, segments=24, ring_count=12, radius=1)
    # Arms/hands (stubby)
    _add("uv", "MIRA_Hand_L", (-0.55, 0, 0.7), (0.16, 0.16, 0.16), m_hood, segments=16, ring_count=8, radius=1)
    _add("uv", "MIRA_Hand_R", (0.55, 0, 0.7), (0.16, 0.16, 0.16), m_hood, segments=16, ring_count=8, radius=1)
    # Shoes
    _add("cube", "MIRA_Shoe_L", (-0.22, -0.05, 0.12), (0.2, 0.28, 0.12), m_shoe, size=1)
    _add("cube", "MIRA_Shoe_R", (0.22, -0.05, 0.12), (0.2, 0.28, 0.12), m_shoe, size=1)

    print("[build_mira] MIRA proxy built:", [o.name for o in bpy.data.objects if o.name.startswith("MIRA")])


if __name__ == "__main__":
    build()

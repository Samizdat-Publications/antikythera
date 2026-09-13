"""Bring the CT-scan surface of Fragment A (Ashkan Pakzad, CC BY 4.0, Sketchfab
d7f48c8999c5406db1a9edba8a350a47) into the scene as a separate object, decimated
for the web, roughly aligned to the main wheel, and export it on its own.

    python tools/bl.py blender/fragment.py 900 --set SRC=C:/path/to/fragment.glb

Accepts .glb/.gltf, .obj, .fbx or a .zip containing one of those. Writes
dist/fragment_a.glb (mm, Z-up, same axes as antikythera.glb). The web viewer
crossfades it over the reconstruction.
"""
import glob
import os
import sys
import zipfile

import bpy

REPO = globals().get("REPO", r"C:\Users\stewa\OneDrive\Documents\Claude\Blender Tests\antikythera")
SRC = globals().get("SRC", "")
TARGET_TRIS = int(globals().get("TARGET_TRIS", "180000"))
OUT = os.path.join(REPO, "dist", "fragment_a.glb")
WORK = os.path.join(REPO, "build", "fragment")
os.makedirs(WORK, exist_ok=True)

if not SRC or not os.path.exists(SRC):
    raise SystemExit(f"SRC not found: {SRC!r}")

path = SRC
if path.lower().endswith(".zip"):
    with zipfile.ZipFile(path) as z:
        z.extractall(WORK)
    cands = [p for ext in ("*.glb", "*.gltf", "*.obj", "*.fbx") for p in glob.glob(os.path.join(WORK, "**", ext), recursive=True)]
    if not cands:
        raise SystemExit("no mesh file found in the zip")
    path = sorted(cands, key=lambda p: (not p.lower().endswith((".glb", ".gltf")), p))[0]

before = set(bpy.data.objects)
ext = os.path.splitext(path)[1].lower()
if ext in (".glb", ".gltf"):
    bpy.ops.import_scene.gltf(filepath=path)
elif ext == ".obj":
    bpy.ops.wm.obj_import(filepath=path)
elif ext == ".fbx":
    bpy.ops.import_scene.fbx(filepath=path)
new = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
if not new:
    raise SystemExit("import produced no mesh")

# join into one object
for o in bpy.data.objects:
    o.select_set(False)
for o in new:
    o.select_set(True)
bpy.context.view_layer.objects.active = new[0]
if len(new) > 1:
    bpy.ops.object.join()
frag = bpy.context.view_layer.objects.active
frag.name = "fragment_a"
for p in list(frag.parent_recursive if hasattr(frag, "parent_recursive") else []):
    pass
frag.parent = None

# normalise: centre, scale to ~180 mm across the largest dimension (Fragment A is ~18 cm)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
dims = frag.dimensions
longest = max(dims)
scale = 180.0 / longest if longest > 0 else 1.0
frag.scale = (scale, scale, scale)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
# centre the bounding box on the origin, then sit it on the main wheel plane
bb = [frag.matrix_world @ v.co for v in [frag.data.vertices[i] for i in range(0, len(frag.data.vertices), max(1, len(frag.data.vertices) // 2000))]]
cx = sum(v.x for v in bb) / len(bb); cy = sum(v.y for v in bb) / len(bb); cz = sum(v.z for v in bb) / len(bb)
frag.location = (-cx, -cy, -cz)
bpy.ops.object.transform_apply(location=True)
frag.location = (0.0, 0.0, 0.0)
frag["am_role"] = "fragment"

# decimate for the web
tris = sum(len(p.vertices) - 2 for p in frag.data.polygons)
if tris > TARGET_TRIS:
    mod = frag.modifiers.new("decimate", "DECIMATE")
    mod.ratio = TARGET_TRIS / tris
    bpy.ops.object.modifier_apply(modifier=mod.name)
tris_after = sum(len(p.vertices) - 2 for p in frag.data.polygons)

# corroded bronze look if the scan brought no material
if not frag.data.materials:
    mat = bpy.data.materials.new("FragmentBronze")
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.42, 0.45, 0.36, 1.0)
    b.inputs["Metallic"].default_value = 0.35
    b.inputs["Roughness"].default_value = 0.85
    frag.data.materials.append(mat)

for o in bpy.data.objects:
    o.select_set(False)
frag.select_set(True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_yup=False,
                          export_apply=True, export_extras=True, export_animations=False,
                          export_texcoords=True, export_normals=True, export_materials="EXPORT")
result = {"source": path, "tris_before": tris, "tris_after": tris_after, "dims_mm": [round(v, 1) for v in frag.dimensions],
          "out": OUT, "bytes": os.path.getsize(OUT), "materials": [m.name for m in frag.data.materials]}
# keep the fragment in a collection of its own, hidden, so the mechanism export never picks it up
c = bpy.data.collections.get("Fragment") or bpy.data.collections.new("Fragment")
if c.name not in bpy.context.scene.collection.children:
    bpy.context.scene.collection.children.link(c)
for cc in frag.users_collection:
    cc.objects.unlink(frag)
c.objects.link(frag)
frag.hide_set(True)
frag.hide_render = True

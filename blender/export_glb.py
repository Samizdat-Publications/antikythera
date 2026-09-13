"""Export the built mechanism as a static glTF plus the gear-graph JSON the web app
needs. Run after build_all.py in the same session:

    python tools/bl.py blender/export_glb.py 600

Writes dist/antikythera.glb (mm, Z-up, custom properties as extras) and dist/gears.json.
No animation is baked: the web app drives every node from the same numbers.
"""
import json
import os

import bpy

REPO = globals().get("REPO", r"C:\Users\stewa\OneDrive\Documents\Claude\Blender Tests\antikythera")
DIST = os.path.join(REPO, "dist")
os.makedirs(DIST, exist_ok=True)

master = bpy.data.objects["MASTER"]
master["years"] = 0.0
master.update_tag()
bpy.context.evaluated_depsgraph_get().update()

# make sure evaluated (driven) rotations are what gets written
for ob in bpy.data.objects:
    ob.select_set(False)
for ob in bpy.data.objects:
    if ob.type in ("MESH", "EMPTY") and ob.name not in ("MASTER",):
        try:
            ob.select_set(True)
        except RuntimeError:
            pass

glb = os.path.join(DIST, "antikythera.glb")
bpy.ops.export_scene.gltf(
    filepath=glb,
    export_format="GLB",
    use_selection=True,
    export_yup=False,                 # keep Blender axes: +Z = front of the mechanism, +Y = up
    export_apply=True,
    export_extras=True,               # custom properties -> node.extras -> three.js userData
    export_animations=False,
    export_skins=False,
    export_morph=False,
    export_cameras=False,
    export_lights=False,
    export_texcoords=True,
    export_normals=True,
    export_materials="EXPORT",
    export_image_format="AUTO",
)

# gear graph for the UI (rates as exact fractions, couplings, pointers)
spec = json.load(open(os.path.join(REPO, "data", "gears.json"), encoding="utf-8"))
dump_path = os.path.join(REPO, "build", "rig_dump.json")
rig = json.load(open(dump_path, encoding="utf-8")) if os.path.exists(dump_path) else {"gears": {}}
nodes = {}
for ob in bpy.data.objects:
    if "am_id" in ob:
        nodes[ob["am_id"]] = {
            "node": ob.name,
            "teeth": ob.get("am_teeth"),
            "kind": ob.get("am_kind", "empty"),
            "rate": ob.get("am_rate"),
            "rateRel": ob.get("am_rate_rel"),
            "rateFrac": ob.get("am_rate_frac"),
            "frame": ob.get("am_frame"),
            "status": ob.get("am_status", ""),
            "coupling": json.loads(ob["am_coupling"]) if "am_coupling" in ob else None,
            "order": ob.get("am_order", 0),
        }
out = {
    "units": "mm",
    "convention": "rate in rotations per year of b1; positive = clockwise seen from the front; "
                  "Blender rotation_euler.z = -2*pi*rateRel*years (crown gears: rotation about local X)",
    "pointers": spec["pointers"],
    "expected_rates": spec["expected_rates"],
    "nodes": nodes,
    "gears": [{k: g.get(k) for k in ("id", "teeth", "arbor", "module", "z", "thick", "status", "note", "carrier", "fixed", "kind")}
              for g in spec["gears"]],
    "couplings": spec["couplings"],
    "meshes": spec["meshes"],
}
with open(os.path.join(DIST, "gears.json"), "w", encoding="utf-8") as fh:
    json.dump(out, fh, indent=1)
result = {"glb": glb, "bytes": os.path.getsize(glb), "nodes": len(nodes)}

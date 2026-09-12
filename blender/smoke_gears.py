"""Smoke test over the MCP socket: build b1 + b2 + c1 + l1 with correct centre
distances and tooth phases, frame them in the viewport, report vertex counts.

    python tools/bl.py blender/smoke_gears.py
"""
import importlib
import math
import sys

import bpy

REPO = r"C:\Users\stewa\OneDrive\Documents\Claude\Blender Tests\antikythera"
for p in (REPO + "\\python", REPO + "\\blender"):
    if p not in sys.path:
        sys.path.insert(0, p)
import mech.gearprofile as gp
import mech.ratios as ratios
import mech.layout as layout
import gear_gen
for m in (gp, ratios, layout, gear_gen):
    importlib.reload(m)

# fresh scene
bpy.ops.wm.read_homefile(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 0.001
scene.unit_settings.length_unit = "MILLIMETERS"

spec = ratios.load(REPO + "\\data\\gears.json")
gears = {g["id"]: g for g in spec["gears"]}
L = layout.solve_layout(spec)
coll = bpy.data.collections.new("smoke")
scene.collection.children.link(coll)

built = {}
def build(gid, phase=0.0, spokes=0, tip_r=None, root_r=None):
    g = gears[gid]
    ob = gear_gen.make_gear(gid, g["teeth"], g.get("module", 0.5), g["thick"], phase=phase,
                            spokes=spokes, tip_r=tip_r, root_r=root_r, collection=coll)
    a = L[g["arbor"]]
    ob.location = (a.x, a.y, g["z"])
    built[gid] = ob
    return ob

b1 = build("b1", spokes=4, tip_r=65.0, root_r=63.8)
b2 = build("b2")
# c1 meshes b2: phase so a tooth of b2 pointing at c meets a gap of c1
bearing = math.atan2(L["c"].y - L["b"].y, L["c"].x - L["b"].x)
c1 = build("c1", phase=gp.mesh_phase(64, 0.0, 38, bearing))
bearing_l = math.atan2(L["l"].y, L["l"].x)
l1 = build("l1", phase=gp.mesh_phase(64, 0.0, 38, bearing_l))

# top-down view framing
win = bpy.context.window_manager.windows[0]
for area in win.screen.areas:
    if area.type == "VIEW_3D":
        for region in area.regions:
            if region.type == "WINDOW":
                with bpy.context.temp_override(window=win, screen=win.screen, area=area, region=region):
                    bpy.ops.view3d.view_axis(type="TOP")
                    bpy.ops.view3d.view_all()
                    area.spaces[0].shading.type = "MATERIAL"
result = {gid: {"verts": len(ob.data.vertices), "faces": len(ob.data.polygons),
                "loc": [round(v, 3) for v in ob.location]} for gid, ob in built.items()}
result["dist_b_c"] = round(math.hypot(L["c"].x, L["c"].y), 4)
result["expected_b2_c1"] = round(gp.centre_distance(64, 0.479, 38, 0.517, 0.10), 4)

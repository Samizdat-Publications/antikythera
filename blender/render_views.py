"""Quick EEVEE renders of the current build for review.

    python tools/bl.py blender/render_views.py 600 [--set VIEWS=front,back,iso]
Writes build/renders/<view>.png
"""
import math
import os

import bpy

REPO = globals().get("REPO", r"C:\Users\stewa\OneDrive\Documents\Claude\Blender Tests\antikythera")
VIEWS = globals().get("VIEWS", "front,back,iso").split(",")
YEARS = float(globals().get("YEARS", "0.0"))
OUT = os.path.join(REPO, "build", "renders")
os.makedirs(OUT, exist_ok=True)

sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"
sc.eevee.taa_render_samples = 32
sc.render.resolution_x, sc.render.resolution_y = 1600, 1100
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = "PNG"
sc.render.film_transparent = False
world = sc.world or bpy.data.worlds.new("World")
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.05, 0.05, 0.06, 1)
    bg.inputs[1].default_value = 1.0

master = bpy.data.objects.get("MASTER")
if master is not None:
    master["years"] = YEARS
    master.update_tag()

cam = sc.camera

# key + fill lights
for name in ("Key", "Fill", "Rim"):
    if name not in bpy.data.objects:
        ld = bpy.data.lights.new(name, "AREA")
        lo = bpy.data.objects.new(name, ld)
        sc.collection.objects.link(lo)
key, fill, rim = (bpy.data.objects[n] for n in ("Key", "Fill", "Rim"))
key.data.energy, key.data.size = 4e6, 200
fill.data.energy, fill.data.size = 1.5e6, 300
rim.data.energy, rim.data.size = 2e6, 150

def aim(ob, target=(0, 0, 0)):
    d = ob.location - bpy.context.scene.cursor.location.__class__(target)
    ob.rotation_euler = d.to_track_quat("Z", "Y").to_euler()

CAMS = {
    "front": ((60, -260, 300), (0, 0, 0)),
    "back":  ((-60, -260, -330), (0, 0, 0)),
    "iso":   ((260, -220, 240), (0, 0, 0)),
    "closeup_pinslot": ((45, -60, 40), (14.8, -10.3, -25.0)),
}
rendered = []
for v in VIEWS:
    loc, tgt = CAMS[v]
    cam.location = loc
    aim(cam, tgt)
    cam.data.lens = 60 if v != "closeup_pinslot" else 85
    z_sign = 1 if loc[2] > 0 else -1
    key.location = (200, -250, 350 * z_sign); aim(key, tgt)
    fill.location = (-300, -100, 250 * z_sign); aim(fill, tgt)
    rim.location = (50, 300, 200 * z_sign); aim(rim, tgt)
    sc.render.filepath = os.path.join(OUT, f"{v}.png")
    bpy.ops.render.render(write_still=True)
    rendered.append(sc.render.filepath)
result = {"rendered": rendered, "years": YEARS}

"""Cycles hero renders of the built mechanism for the README and social images.

    python tools/bl.py blender/hero_render.py 1800 [--set VIEWS=hero,front,back,pinslot,iso]
                                                   [--set SAMPLES=256] [--set SIZE=1920x1200]
Writes docs/renders/<view>.jpg. Uses the textured materials from blender/surface.py, a
three-light gallery rig (warm key from high left, cool fill, warm rim) in a dark room, AgX.
The camera presets mirror web/src/scene/viewer.ts (Blender axes: +Z front, +Y up, mm).
"""
import os
import time

import bpy
from mathutils import Vector

REPO = globals().get("REPO", r"C:\Users\stewa\OneDrive\Documents\Claude\Blender Tests\antikythera")
VIEWS = str(globals().get("VIEWS", "hero,front,back,pinslot,iso")).split(",")
SAMPLES = int(globals().get("SAMPLES", "256"))
SIZE = str(globals().get("SIZE", "1920x1200"))
YEARS = float(globals().get("YEARS", "0.0"))
OUT = os.path.join(REPO, "docs", "renders")
os.makedirs(OUT, exist_ok=True)

sc = bpy.context.scene
t0 = time.time()

# ----------------------------------------------------------------------------- engine
prefs = bpy.context.preferences.addons["cycles"].preferences
for dt in ("OPTIX", "CUDA", "HIP", "METAL", "ONEAPI"):
    try:
        prefs.compute_device_type = dt
        prefs.get_devices()
        if any(d.type == dt for d in prefs.devices):
            for d in prefs.devices:
                d.use = d.type in (dt, "CPU") or d.use
            break
    except Exception:
        continue
engine0 = sc.render.engine
sc.render.engine = "CYCLES"
sc.cycles.device = "GPU"
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
try:
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
except Exception:
    pass
sc.cycles.max_bounces = 8
sc.cycles.glossy_bounces = 6
w, h = (int(x) for x in SIZE.lower().split("x"))
sc.render.resolution_x, sc.render.resolution_y = w, h
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = "JPEG"
sc.render.image_settings.quality = 92
sc.render.film_transparent = False
try:
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
except Exception:
    pass
sc.view_settings.exposure = 0.0

# ----------------------------------------------------------------------------- world: a dark gallery
world = sc.world or bpy.data.worlds.new("World")
sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.012, 0.009, 0.007, 1)
    bg.inputs[1].default_value = 1.0

master = bpy.data.objects.get("MASTER")
if master is not None:
    master["years"] = YEARS
    master.update_tag()
frag = bpy.data.objects.get("fragment_a")
frag_hidden = frag.hide_render if frag else None
if frag:
    frag.hide_render = True

# ----------------------------------------------------------------------------- lights
def light(name, color, energy, size):
    ob = bpy.data.objects.get(name)
    if ob is None or ob.type != "LIGHT":
        ld = bpy.data.lights.new(name, "AREA")
        ob = bpy.data.objects.new(name, ld)
        sc.collection.objects.link(ob)
    ob.data.type = "AREA"
    ob.data.shape = "DISK"
    ob.data.color = color
    ob.data.energy = energy
    ob.data.size = size
    return ob


def aim(ob, target):
    d = Vector(ob.location) - Vector(target)
    ob.rotation_euler = d.to_track_quat("Z", "Y").to_euler()


key = light("Key", (1.0, 0.86, 0.68), 5.5e6, 260)
fill = light("Fill", (0.72, 0.78, 0.90), 1.4e6, 420)
rim = light("Rim", (1.0, 0.78, 0.52), 2.6e6, 160)
back_key = light("BackKey", (1.0, 0.88, 0.72), 4.5e6, 260)
for o in bpy.data.objects:
    if o.type == "LIGHT" and o.name not in ("Key", "Fill", "Rim", "BackKey"):
        o.hide_render = True                         # the old Sun etc.

cam = sc.camera
if cam is None:
    cd = bpy.data.cameras.new("Camera")
    cam = bpy.data.objects.new("Camera", cd)
    sc.collection.objects.link(cam)
    sc.camera = cam

# (position, target, focal length mm, f-stop for depth of field)
CAMS = {
    "hero":    ((330, 150, 430), (0, -15, 0), 55, 5.6),
    "iso":     ((300, -220, 420), (0, 0, 0), 50, 5.6),
    "front":   ((30, -40, 300), (0, 0, 30), 60, 8.0),
    "back":    ((20, 40, -260), (0, 20, -40), 60, 8.0),
    "pinslot": ((75, -70, -150), (28, -32, -25), 85, 4.0),
}
rendered = []
for v in VIEWS:
    v = v.strip()
    if v not in CAMS:
        continue
    pos, tgt, lens, fstop = CAMS[v]
    cam.location = pos
    aim(cam, tgt)
    cam.data.lens = lens
    cam.data.sensor_width = 36
    cam.data.dof.use_dof = True
    cam.data.dof.focus_distance = (Vector(pos) - Vector(tgt)).length
    cam.data.dof.aperture_fstop = fstop
    front = pos[2] > 0
    # the exhibit light comes from high left on the side the camera sees
    key.location = (-300, 360, 520) if front else (-260, 300, -520); aim(key, tgt)
    fill.location = (380, -40, 260) if front else (380, -40, -260); aim(fill, tgt)
    rim.location = (60, 240, -420) if front else (60, 240, 420); aim(rim, tgt)
    back_key.location = (-220, 160, -460); aim(back_key, tgt)
    back_key.hide_render = front
    sc.render.filepath = os.path.join(OUT, f"{v}.jpg")
    bpy.ops.render.render(write_still=True)
    rendered.append((v, round(time.time() - t0)))

if frag is not None:
    frag.hide_render = frag_hidden
sc.render.engine = engine0
result = {"rendered": rendered, "seconds": round(time.time() - t0), "samples": SAMPLES, "size": SIZE}

"""Cycles hero renders of the built mechanism for the README and social images.

    python tools/bl.py blender/hero_render.py 1800 [--set VIEWS=hero,front,back,pinslot,iso]
                                                   [--set SAMPLES=256] [--set SIZE=1920x1200]
                                                   [--set HDRI=0] [--set HDRI_STRENGTH=1.0]
Writes docs/renders/<view>.jpg. Uses the textured materials from blender/surface.py, a
three-light gallery rig (warm key from high left, cool fill, warm rim) and, since lighting
phase d, the same Poly Haven studio HDRI the web vitrine is lit by (assets/raw/hdri, 2k, or
the 1k copy in web/public/hdri) as the world, hidden from the camera behind a dark room. AgX.
The camera presets mirror web/src/scene/viewer.ts (Blender axes: +Z front, +Y up, mm).
"""
import os
import time

import math

import bpy
from mathutils import Vector

REPO = globals().get("REPO", r"C:\Users\stewa\OneDrive\Documents\Claude\Blender Tests\antikythera")
VIEWS = str(globals().get("VIEWS", "hero,front,back,pinslot,iso")).split(",")
SAMPLES = int(globals().get("SAMPLES", "256"))
SIZE = str(globals().get("SIZE", "1920x1200"))
YEARS = float(globals().get("YEARS", "0.0"))
USE_HDRI = str(globals().get("HDRI", "1")) not in ("0", "false", "False")
HDRI_STRENGTH = float(globals().get("HDRI_STRENGTH", "1.0"))
HDRI_FILES = [os.path.join(REPO, "assets", "raw", "hdri", "studio_small_09_2k.hdr"),
              os.path.join(REPO, "web", "public", "hdri", "studio_small_09_1k.hdr")]
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
nt = world.node_tree
nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputWorld")
dark = nt.nodes.new("ShaderNodeBackground")
dark.inputs[0].default_value = (0.035, 0.026, 0.02, 1)       # what the camera sees: a faintly lit warm room
dark.inputs[1].default_value = 1.0
hdri_path = next((f for f in HDRI_FILES if os.path.exists(f)), None) if USE_HDRI else None
hdri_info = None
if hdri_path:
    # the studio HDRI lights the bronze (the reflections the web vitrine has) but stays out of the frame:
    # camera rays see the dark room, every other ray sees the studio
    img = bpy.data.images.get("hero_hdri")
    if img is None or img.filepath != hdri_path:
        img = bpy.data.images.load(hdri_path)
        img.name = "hero_hdri"
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = img
    envbg = nt.nodes.new("ShaderNodeBackground")
    envbg.inputs[1].default_value = HDRI_STRENGTH
    mix = nt.nodes.new("ShaderNodeMixShader")
    lp = nt.nodes.new("ShaderNodeLightPath")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.vector_type = "POINT"
    # this model stands with +Y up inside Blender's Z-up world, so the studio's zenith is turned onto +Y
    # (a quarter turn about X), then turned about the studio's own zenith so its brightest softbox sits
    # where the web puts the key: high, front-left. Blender's equirect: u = 0.5 - atan2(y, x) / 2pi.
    import numpy as np
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    lum = px[..., 0] * 0.2126 + px[..., 1] * 0.7152 + px[..., 2] * 0.0722
    bh, bw = max(1, h // 32), max(1, w // 64)                 # a softbox, not a single hot pixel
    blocks = lum[: (h // bh) * bh, : (w // bw) * bw].reshape(h // bh, bh, w // bw, bw).mean(axis=(1, 3))
    by, bx = np.unravel_index(int(np.argmax(blocks)), blocks.shape)
    u = (bx + 0.5) / blocks.shape[1]
    v = (by + 0.5) / blocks.shape[0]                            # image rows run bottom-up in Blender
    phi_b = (0.5 - u) * 2 * math.pi
    want = Vector((-0.6, 0.7, 0.55)).normalized()               # model frame: left, up, front
    wr = Vector((want.x, -want.z, want.y))                      # after the quarter turn about X
    gamma = phi_b - math.atan2(wr.y, wr.x)
    mp.inputs["Rotation"].default_value = (math.pi / 2, 0.0, gamma)
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], envbg.inputs["Color"])
    nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
    nt.links.new(envbg.outputs["Background"], mix.inputs[1])
    nt.links.new(dark.outputs["Background"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    hdri_info = {"file": os.path.basename(hdri_path), "size": [w, h], "brightest_uv": [round(u, 3), round(v, 3)],
                 "elevation_deg": round((v - 0.5) * 180, 1), "rotation_z_deg": round(math.degrees(gamma), 1), "strength": HDRI_STRENGTH}
else:
    nt.links.new(dark.outputs["Background"], out.inputs["Surface"])

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


def aim(ob, target, up=(0.0, 1.0, 0.0)):
    """Point the object's -Z at the target with its +Y toward `up` (this model is +Y up, not +Z,
    so Vector.to_track_quat would roll the camera 90 degrees)."""
    from mathutils import Matrix
    pos = Vector(ob.location)
    f = (Vector(target) - pos).normalized()
    r = f.cross(Vector(up)).normalized()
    u = r.cross(f).normalized()
    m = Matrix((r, u, -f)).transposed().to_4x4()
    m.translation = pos
    ob.matrix_world = m


# big soft sources: a gallery softbox, not a bare bulb, so the roughness mottling stays subtle
key = light("Key", (1.0, 0.86, 0.68), 6.0e6, 520)
fill = light("Fill", (0.72, 0.78, 0.90), 1.6e6, 700)
rim = light("Rim", (1.0, 0.78, 0.52), 2.4e6, 300)
back_key = light("BackKey", (1.0, 0.88, 0.72), 5.0e6, 520)
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
    # the pin-and-slot sits between the plates: strip plates, dials and case for that view (x-ray)
    xray = v == "pinslot"
    for o in bpy.data.objects:
        if o.get("am_role") in ("plate", "plate_b1", "dial", "frame_b1", "case"):
            o.hide_render = xray
    sc.render.filepath = os.path.join(OUT, f"{v}.jpg")
    bpy.ops.render.render(write_still=True)
    rendered.append((v, round(time.time() - t0)))
for o in bpy.data.objects:
    if o.get("am_role") in ("plate", "plate_b1", "dial", "frame_b1", "case"):
        o.hide_render = False

if frag is not None:
    frag.hide_render = frag_hidden
sc.render.engine = engine0
result = {"rendered": rendered, "seconds": round(time.time() - t0), "samples": SAMPLES, "size": SIZE, "hdri": hdri_info}

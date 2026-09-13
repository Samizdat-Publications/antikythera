"""Surface pass on the built mechanism. Run after dials.py in the same session:

    python tools/bl.py blender/surface.py 1800 [--set BAKE=0] [--set SAMPLES=256]

1. Box-projected UVs (local XY / SPAN_MM + 0.5) on every mesh that has none, so the
   tileable maps from tools/gen_surface_maps.py land at the same texel density on every
   part and the spun map is centred on each gear's axis.
2. Textured bronze: Bronze (gears, pointers, rings) gets the spun normal, PlateBronze and
   DarkBronze the brushed one; all three share the albedo and roughness maps. The dials'
   Bump nodes are replaced by NormalMap nodes reading <dial>_normal.png, which the glTF
   exporter can export (a Bump node it silently turns into a bogus normal texture).
3. Ambient occlusion baked to a vertex colour attribute "AO" (Cycles, GPU). Static parts
   (plates, dials, case, frame, tubes) are baked with everything as occluders. Every moving
   part is baked alone against the static parts, the parts on its own axis and the big wheels,
   so nothing rotation-dependent is frozen into it; the runtime GTAO pass does the rest.
The .blend is saved at the end.
"""
from __future__ import annotations

import os
import time

import bmesh
import bpy
from mathutils import Vector

REPO = globals().get("REPO", r"C:\Users\stewa\OneDrive\Documents\Claude\Blender Tests\antikythera")
TEX = os.path.join(REPO, "assets", "textures")
BAKE = str(globals().get("BAKE", "1")) not in ("0", "false", "False")
SAMPLES = int(globals().get("SAMPLES", "256"))
SPAN_MM = 160.0                    # keep in step with tools/gen_surface_maps.py
AO_DISTANCE_MM = 60.0
STATIC_ROLES = {"plate", "dial", "case", "frame_b1", "tube", "plate_b1"}
BIG_WHEEL_R = 40.0

sc = bpy.context.scene
t0 = time.time()
log: list[str] = []


def meshes():
    return [o for o in bpy.data.objects if o.type == "MESH" and o.name != "fragment_a"]


def is_static(o) -> bool:
    if "am_id" in o:
        return False
    role = o.get("am_role")
    if role == "pointer":
        return False
    if role in STATIC_ROLES:
        return True
    # anything else without a kinematic parent chain is scenery (pillars, crank axle, ...)
    p = o
    while p:
        if "am_id" in p or p.get("am_role") == "pointer":
            return False
        p = p.parent
    return True


# ----------------------------------------------------------------------------- 1. UVs
def box_uvs(o) -> None:
    me = o.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        for lp in f.loops:
            x, y, z = lp.vert.co
            if abs(n.z) >= 0.5:
                lp[uv].uv = (x / SPAN_MM + 0.5, y / SPAN_MM + 0.5)
            elif abs(n.x) >= abs(n.y):
                lp[uv].uv = (y / SPAN_MM + 0.5, z / SPAN_MM + 0.5)
            else:
                lp[uv].uv = (x / SPAN_MM + 0.5, z / SPAN_MM + 0.5)
    bm.to_mesh(me)
    bm.free()
    me.update()


done_uv = 0
seen_mesh = set()
for o in meshes():
    if o.data.name in seen_mesh:
        continue
    seen_mesh.add(o.data.name)
    if not o.data.uv_layers:
        box_uvs(o)
        done_uv += 1
log.append(f"uv projected on {done_uv} meshes")


# ----------------------------------------------------------------------------- 2. materials
def load_img(name: str, noncolor: bool):
    path = os.path.join(TEX, name)
    existed = bpy.data.images.get(name) is not None
    img = bpy.data.images.load(path, check_existing=True)
    if existed:
        img.reload()                       # the PNG on disk may have been regenerated
    if noncolor:
        img.colorspace_settings.name = "Non-Color"
    return img


def clear_surface_nodes(nt) -> None:
    for n in [n for n in nt.nodes if n.label.startswith("surface:")]:
        nt.nodes.remove(n)


def socket(node, ident: str, out: bool = False):
    col = node.outputs if out else node.inputs
    for s in col:
        if s.identifier == ident:
            return s
    raise KeyError(ident)


def texture_bronze(mat_name: str, normal_png: str, tint=None, normal_strength: float = 1.0) -> None:
    mat = bpy.data.materials.get(mat_name)
    if not mat:
        return
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    clear_surface_nodes(nt)
    # keep the flat base colour on the BSDF as the tint the web viewer also uses
    alb = nt.nodes.new("ShaderNodeTexImage"); alb.image = load_img("bronze_albedo.png", False)
    alb.location = (-720, 320); alb.label = "surface:albedo"
    if tint:
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        mix.location = (-380, 320); mix.label = "surface:tint"
        nt.links.new(alb.outputs["Color"], socket(mix, "A_Color"))
        socket(mix, "B_Color").default_value = (*tint, 1.0)
        nt.links.new(socket(mix, "Result_Color", True), bsdf.inputs["Base Color"])
    else:
        nt.links.new(alb.outputs["Color"], bsdf.inputs["Base Color"])
    rough = nt.nodes.new("ShaderNodeTexImage"); rough.image = load_img("bronze_rough.png", True)
    rough.location = (-720, 20); rough.label = "surface:rough"
    nt.links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])
    nrm = nt.nodes.new("ShaderNodeTexImage"); nrm.image = load_img(normal_png, True)
    nrm.location = (-720, -300); nrm.label = "surface:normal"
    nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = normal_strength
    nm.location = (-380, -300); nm.label = "surface:normalmap"
    nt.links.new(nrm.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])


texture_bronze("Bronze", "bronze_spun_normal.png", normal_strength=1.0)
texture_bronze("PlateBronze", "bronze_brushed_normal.png", tint=(0.70, 0.69, 0.66), normal_strength=1.0)
texture_bronze("DarkBronze", "bronze_brushed_normal.png", tint=(0.34, 0.32, 0.30), normal_strength=0.8)


def dial_normalmap(mat_name: str, png: str, strength: float = 1.0) -> bool:
    mat = bpy.data.materials.get(mat_name)
    if not mat or not os.path.exists(os.path.join(TEX, png)):
        return False
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    for n in [n for n in nt.nodes if n.bl_idname in ("ShaderNodeBump", "ShaderNodeNormalMap")]:
        nt.nodes.remove(n)
    clear_surface_nodes(nt)
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = load_img(png, True)
    tex.location = (-720, -400); tex.label = "surface:dialnormal"
    nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = strength
    nm.location = (-380, -400); nm.label = "surface:normalmap"
    nt.links.new(tex.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    return True


dials_done = [n for n, png in (("FrontDial", "front_dial_normal.png"), ("Back_upper", "back_upper_normal.png"),
                               ("Back_lower", "back_lower_normal.png"), ("Parapegma_upper", "parapegma_upper_normal.png"),
                               ("Parapegma_lower", "parapegma_lower_normal.png")) if dial_normalmap(n, png)]
log.append(f"dial normal maps: {dials_done}")


# ----------------------------------------------------------------------------- 3. AO bake
def ensure_ao_attr(o) -> None:
    me = o.data
    attr = me.color_attributes.get("AO")
    if attr is None:
        attr = me.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    me.color_attributes.active_color = attr
    try:
        me.color_attributes.render_color_index = me.color_attributes.find("AO")
    except Exception:
        pass


def select_only(objs) -> None:
    for o in bpy.data.objects:
        try:
            o.select_set(False)
        except RuntimeError:
            pass
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]


def bake(objs) -> None:
    select_only(objs)
    with bpy.context.temp_override(selected_objects=objs, active_object=objs[0], object=objs[0]):
        bpy.ops.object.bake(type="AO")


baked = 0
if BAKE:
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
    sc.cycles.use_denoising = False
    sc.render.bake.target = "VERTEX_COLORS"
    sc.render.bake.use_selected_to_active = False
    sc.render.bake.use_clear = True
    if sc.world is None:
        sc.world = bpy.data.worlds.new("World")
    try:
        sc.world.light_settings.distance = AO_DISTANCE_MM
    except Exception:
        pass

    all_meshes = meshes()
    for o in all_meshes:
        ensure_ao_attr(o)
    frag = bpy.data.objects.get("fragment_a")
    frag_hidden = frag.hide_render if frag else None
    if frag:
        frag.hide_render = True
    static = [o for o in all_meshes if is_static(o)]
    moving = [o for o in all_meshes if not is_static(o)]
    for o in all_meshes:
        o.hide_render = False

    # static parts: everything occludes
    bake(static)
    baked += len(static)
    log.append(f"static baked: {len(static)} in {time.time() - t0:.0f}s")

    # moving parts: only static parts, same-axis parts and big wheels as occluders
    def axis_xy(o) -> Vector:
        return o.matrix_world.translation.xy

    def radius(o) -> float:
        return max(o.dimensions.x, o.dimensions.y) * 0.5

    big = {o.name for o in moving if radius(o) >= BIG_WHEEL_R}
    for i, tgt in enumerate(moving):
        axy = axis_xy(tgt)
        keep = {tgt.name} | big
        for o in moving:
            if (axis_xy(o) - axy).length < 0.5:
                keep.add(o.name)
        for o in moving:
            o.hide_render = o.name not in keep
        bake([tgt])
        baked += 1
    for o in all_meshes:
        o.hide_render = False
    if frag is not None:
        frag.hide_render = frag_hidden
    sc.render.engine = engine0
    log.append(f"moving baked: {len(moving)} in {time.time() - t0:.0f}s")

    # sanity: mean AO of a few parts
    def mean_ao(o) -> float:
        data = o.data.color_attributes["AO"].data
        n = len(data)
        return sum(d.color[0] for d in data) / n if n else 0.0
    log.append("mean AO " + ", ".join(f"{n}={mean_ao(bpy.data.objects[n]):.2f}" for n in ("b1", "front_plate", "e3", "k1", "case_left") if n in bpy.data.objects))

if bpy.data.filepath:
    bpy.ops.wm.save_mainfile()
result = {"log": log, "baked": baked, "seconds": round(time.time() - t0, 1)}

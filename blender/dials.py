"""Dials, plates, pointers, rings, hub and case for the built mechanism.

Runs AFTER build_all.py in the same session (needs the gear objects and MASTER):
    python tools/bl.py blender/dials.py 600

Every dial face is a flat mesh with planar UVs in mm so the textures from
tools/gen_dial_textures.py land exactly (see assets/textures/dials.json).
Pointer assembly offsets (am_role = pointer) are set by the web app from the
epoch calibration; here they sit at their gear's zero.
"""
from __future__ import annotations

import importlib
import json
import math
import os
import sys

import bmesh
import bpy

REPO = globals().get("REPO", r"C:\Users\stewa\OneDrive\Documents\Claude\Blender Tests\antikythera")
for p in (REPO + "\\python", REPO + "\\blender"):
    if p not in sys.path:
        sys.path.insert(0, p)
import mech.ratios as ratios     # noqa: E402
import mech.layout as layout     # noqa: E402
import gear_gen                  # noqa: E402
for _m in (ratios, layout, gear_gen):
    importlib.reload(_m)

TAU = 2 * math.pi
TEX = os.path.join(REPO, "assets", "textures")
DIALS = json.load(open(os.path.join(TEX, "dials.json"), encoding="utf-8"))
SPEC = ratios.load(os.path.join(REPO, "data", "gears.json"))
GEARS = {g["id"]: g for g in SPEC["gears"]}
L = layout.solve_layout(SPEC)
R = ratios.solve(SPEC)
OBJ = bpy.data.objects
sc = bpy.context.scene

FRONT_PLATE_Z = 30.5          # mid-plane of the 1.5 mm front plate
BACK_PLATE_Z = -38.5
CP_Z = 24.7                   # circular plate (front assembly)
STRAP_Z = 15.0
PLATE_W, PLATE_H = 174.0, 320.0
PLATE_CY = -10.0
CASE_W, CASE_H, CASE_D = 180.0, 340.0, 90.0

# ----------------------------------------------------------------------------- helpers
def coll(name):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name)
        sc.collection.children.link(c)
    return c


def obj_from_bmesh(name, bm, c, material=None, parent=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.validate()
    ob = bpy.data.objects.new(name, me)
    c.objects.link(ob)
    if material:
        ob.data.materials.append(material)
    if parent:
        ob.parent = parent
    return ob


def image_material(name, albedo, bump=None, roughness=0.45, metallic=1.0):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(albedo, check_existing=True)
    tex.location = (-500, 300)
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    if bump:
        bt = nt.nodes.new("ShaderNodeTexImage")
        bt.image = bpy.data.images.load(bump, check_existing=True)
        bt.image.colorspace_settings.name = "Non-Color"
        bt.location = (-700, -100)
        # engraving is rougher than polished bronze
        nt.links.new(bt.outputs["Color"], bsdf.inputs["Roughness"])
        # the engraving relief: a real normal map (tools/gen_surface_maps.py derives it from the
        # bump), which the glTF exporter can export; a Bump node it cannot
        normal_png = bump.replace("_bump.png", "_normal.png")
        if os.path.exists(normal_png):
            nrm = nt.nodes.new("ShaderNodeTexImage")
            nrm.image = bpy.data.images.load(normal_png, check_existing=True)
            nrm.image.colorspace_settings.name = "Non-Color"
            nrm.location = (-700, -400)
            nm = nt.nodes.new("ShaderNodeNormalMap")
            nm.inputs["Strength"].default_value = 1.0
            nm.location = (-300, -400)
            nt.links.new(nrm.outputs["Color"], nm.inputs["Color"])
            nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
        else:
            bn = nt.nodes.new("ShaderNodeBump")
            bn.inputs["Strength"].default_value = 0.35
            bn.inputs["Distance"].default_value = 0.15
            bn.location = (-300, -100)
            nt.links.new(bt.outputs["Color"], bn.inputs["Height"])
            nt.links.new(bn.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def plain_material(name, rgb, metallic=1.0, roughness=0.4, emission=None):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1.0)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    if emission:
        b.inputs["Emission Color"].default_value = (*emission, 1.0)
        b.inputs["Emission Strength"].default_value = 1.0
    return mat


def annulus_bm(r_in, r_out, n=256, thick=0.8, z0=0.0, uv_span=None, uv_centre=(0.0, 0.0)):
    """Flat annulus (or disc if r_in == 0) with planar UVs: u = (x - cx)/span + 0.5."""
    bm = bmesh.new()
    if r_in > 0:
        vo = [bm.verts.new((r_out * math.cos(TAU * i / n), r_out * math.sin(TAU * i / n), z0)) for i in range(n)]
        vi = [bm.verts.new((r_in * math.cos(TAU * i / n), r_in * math.sin(TAU * i / n), z0)) for i in range(n)]
        eo = [bm.edges.new((vo[i], vo[(i + 1) % n])) for i in range(n)]
        ei = [bm.edges.new((vi[i], vi[(i + 1) % n])) for i in range(n)]
        faces = bmesh.ops.bridge_loops(bm, edges=eo + ei)["faces"]
    else:
        vo = [bm.verts.new((r_out * math.cos(TAU * i / n), r_out * math.sin(TAU * i / n), z0)) for i in range(n)]
        faces = [bm.faces.new(vo)]
    res = bmesh.ops.extrude_face_region(bm, geom=faces)
    verts = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=verts, vec=(0, 0, thick))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if uv_span:
        uv = bm.loops.layers.uv.new("UVMap")
        cx, cy = uv_centre
        for f in bm.faces:
            for lp in f.loops:
                x, y, _ = lp.vert.co
                lp[uv].uv = ((x - cx) / uv_span + 0.5, (y - cy) / uv_span + 0.5)
    return bm


def box_bm(w, h, d, cx=0.0, cy=0.0, cz=0.0, uv_span=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(w, h, d), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(cx, cy, cz), verts=bm.verts)
    if uv_span:
        uv = bm.loops.layers.uv.new("UVMap")
        for f in bm.faces:
            for lp in f.loops:
                x, y, z = lp.vert.co
                lp[uv].uv = (x / uv_span + 0.5, (y if abs(f.normal.z) > 0.5 else z) / uv_span + 0.5)
    return bm


def plate_with_hole_bm(w, h, hole_r, thick, cy=0.0, n=128):
    """Rectangular plate with a circular opening, extruded; planar UVs over the plate."""
    bm = bmesh.new()
    # rectangle loop with n vertices (perimeter subdivided)
    per = 2 * (w + h)
    rect = []
    for i in range(n):
        s = per * i / n
        if s < w:
            p = (-w / 2 + s, -h / 2)
        elif s < w + h:
            p = (w / 2, -h / 2 + (s - w))
        elif s < 2 * w + h:
            p = (w / 2 - (s - w - h), h / 2)
        else:
            p = (-w / 2, h / 2 - (s - 2 * w - h))
        rect.append(bm.verts.new((p[0], p[1] + cy, 0.0)))
    hole = [bm.verts.new((hole_r * math.cos(TAU * i / n), hole_r * math.sin(TAU * i / n), 0.0)) for i in range(n)]
    er = [bm.edges.new((rect[i], rect[(i + 1) % n])) for i in range(n)]
    eh = [bm.edges.new((hole[i], hole[(i + 1) % n])) for i in range(n)]
    faces = bmesh.ops.bridge_loops(bm, edges=er + eh)["faces"]
    res = bmesh.ops.extrude_face_region(bm, geom=faces)
    verts = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=verts, vec=(0, 0, thick))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def cylinder_bm(r, z0, z1, n=48, r_in=0.0):
    return annulus_bm(r_in, r, n=n, thick=z1 - z0, z0=z0)


def sphere_bm(r, u=32, v=16):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r)
    return bm


def pointer_bm(length, w0=2.2, w1=0.9, thick=0.8, hub_r=None, hub_z=0.0, z=0.0):
    """Tapered pointer along +X with a round hub; plus an optional counterweight tail."""
    bm = bmesh.new()
    pts = [(-0.18 * length, -w0 * 0.55, z), (0.6 * length, -w0 / 2, z), (length, -w1 / 2, z), (length + 1.2, 0, z),
           (length, w1 / 2, z), (0.6 * length, w0 / 2, z), (-0.18 * length, w0 * 0.55, z)]
    vs = [bm.verts.new(p) for p in pts]
    f = bm.faces.new(vs)
    res = bmesh.ops.extrude_face_region(bm, geom=[f])
    verts = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=verts, vec=(0, 0, thick))
    if hub_r:
        hub = annulus_bm(0.0, hub_r, n=32, thick=thick * 1.6, z0=z - thick * 0.3)
        hub_me = bpy.data.meshes.new("_tmp_hub")
        hub.to_mesh(hub_me); hub.free()
        bm.from_mesh(hub_me)
        bpy.data.meshes.remove(hub_me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def merge(bm, other):
    me = bpy.data.meshes.new("_tmp")
    other.to_mesh(me); other.free()
    bm.from_mesh(me)
    bpy.data.meshes.remove(me)
    return bm


KEEP = {"MASTER", "Camera", "Sun", "Key", "Fill", "Rim"}


def clear_collection(name):
    """Remove decoration meshes from an earlier dials.py / build_all run, never the
    kinematic nodes (anything carrying am_id) or the scene rig."""
    c = bpy.data.collections.get(name)
    if c:
        for ob in list(c.objects):
            if ob.name in KEEP or "am_id" in ob:
                continue
            if ob.name.startswith(("ptr_", "ring_", "spoke_", "stone_", "tube_", "pillar_", "case_", "crank_",
                                   "pin_", "dragon_", "sun_ball", "lunar_disc", "strap", "circular_plate", "sub_plate",
                                   "front_plate", "back_plate", "zodiac_ring", "calendar_ring", "parapegma", "back_upper",
                                   "back_lower")):
                bpy.data.objects.remove(ob, do_unlink=True)


def add_driver_loc_x(ob, expr, master):
    fc = ob.driver_add("location", 0)
    d = fc.driver
    d.type = "SCRIPTED"
    d.expression = expr
    v = d.variables.new()
    v.name = "y"; v.type = "SINGLE_PROP"; v.targets[0].id = master; v.targets[0].data_path = '["years"]'


# ----------------------------------------------------------------------------- build
def build():
    for n in ("Dials", "Pointers", "Frame", "Case"):
        clear_collection(n)
    c_dial, c_ptr, c_frame, c_case = coll("Dials"), coll("Pointers"), coll("Frame"), coll("Case")
    master = OBJ["MASTER"]
    bronze = gear_gen.bronze_material()
    plate_mat = plain_material("PlateBronze", (0.55, 0.38, 0.18), roughness=0.5)
    dark = plain_material("DarkBronze", (0.25, 0.17, 0.08), roughness=0.55)
    gold = plain_material("Gold", (1.0, 0.78, 0.35), roughness=0.25)
    silver = plain_material("MoonSilver", (0.9, 0.9, 0.92), roughness=0.3)
    black = plain_material("MoonBlack", (0.02, 0.02, 0.02), metallic=0.2, roughness=0.6)
    stones = {
        "mercury": plain_material("Turquoise", (0.25, 0.75, 0.72), metallic=0.0, roughness=0.35),
        "venus": plain_material("Lapis", (0.10, 0.20, 0.65), metallic=0.0, roughness=0.3),
        "mars": plain_material("Carnelian", (0.75, 0.15, 0.08), metallic=0.0, roughness=0.3),
        "jupiter": plain_material("Crystal", (0.92, 0.92, 0.95), metallic=0.1, roughness=0.15),
        "saturn": plain_material("Obsidian", (0.05, 0.05, 0.06), metallic=0.2, roughness=0.2),
    }
    wood_path = os.path.join(TEX, "wood_case.png")
    wood = image_material("Wood", wood_path, roughness=0.6, metallic=0.0) if os.path.exists(wood_path) else plain_material("Wood", (0.30, 0.19, 0.10), metallic=0.0, roughness=0.65)

    dial_meta = {d["name"]: d for d in DIALS["dials"]}

    # ---- front plate with the dial opening, parapegma plates ------------------------
    ob = obj_from_bmesh("front_plate", plate_with_hole_bm(PLATE_W, PLATE_H, 80.5, 1.5, cy=PLATE_CY), c_frame, plate_mat)
    ob.location.z = FRONT_PLATE_Z - 0.75
    ob["am_role"] = "plate"
    fd = dial_meta["front_dial"]
    fmat = image_material("FrontDial", os.path.join(TEX, "front_dial.png"), os.path.join(TEX, "front_dial_bump.png"))
    zod = obj_from_bmesh("zodiac_ring", annulus_bm(54.5, 67.0, 360, 1.0, 0.0, fd["span_mm"]), c_dial, fmat)
    zod.location.z = FRONT_PLATE_Z + 0.3
    zod["am_role"] = "dial"
    cal = obj_from_bmesh("calendar_ring", annulus_bm(67.2, 80.0, 360, 1.0, 0.0, fd["span_mm"]), c_dial, fmat)
    cal.location.z = FRONT_PLATE_Z + 0.35
    cal["am_role"] = "dial"
    cal["am_id"] = "calendar_ring"
    cal["am_rate"] = 0.0
    cal["am_rate_rel"] = 0.0
    cal["am_frame"] = "world"
    for name, cy in (("parapegma_upper", 115.0), ("parapegma_lower", -135.0)):
        pm = dial_meta[name]
        m = image_material(name.capitalize(), os.path.join(TEX, name + ".png"), os.path.join(TEX, name + "_bump.png"))
        bm = box_bm(150.0, 44.0, 0.8, 0.0, cy, 0.0, uv_span=pm["span_mm"])
        # planar UV in the plate's own frame (centred on the plate)
        uv = bm.loops.layers.uv.verify()
        for f in bm.faces:
            for lp in f.loops:
                x, y, z = lp.vert.co
                lp[uv].uv = (x / pm["span_mm"] + 0.5, (y - cy) / pm["span_mm"] + 0.5)
        o = obj_from_bmesh(name, bm, c_dial, m)
        o.location.z = FRONT_PLATE_Z + 0.75
        o["am_role"] = "dial"

    # ---- back plate + spiral dials ----------------------------------------------------
    bp = obj_from_bmesh("back_plate", box_bm(PLATE_W, PLATE_H, 1.5, 0.0, PLATE_CY, 0.0), c_frame, plate_mat)
    bp.location.z = BACK_PLATE_Z
    bp["am_role"] = "plate"
    for name, arb, r in (("back_upper", "n", 70.0), ("back_lower", "g", 70.0)):
        md = dial_meta[name]
        m = image_material(name.capitalize(), os.path.join(TEX, name + ".png"), os.path.join(TEX, name + "_bump.png"))
        bm = annulus_bm(0.0, r, 256, 0.6, 0.0, md["span_mm"], (0.0, 0.0))
        o = obj_from_bmesh(name + "_dial", bm, c_dial, m)
        o.location = (L[arb].x, L[arb].y, BACK_PLATE_Z - 0.75 - 0.6)   # on the back face
        o["am_role"] = "dial"

    # ---- front assembly frame: pillars, strap, circular plate, sub-plate ---------------
    for k in range(4):
        a = math.radians(45 + 90 * k)
        for r, z0, z1, rad in ((60.0, 1.4, CP_Z - 0.5, 1.6), (52.0, 1.4, STRAP_Z - 0.5, 1.4)):
            if k % 2 == 1 and r == 52.0:
                continue                                         # short pillars come in opposed pairs
            bm = cylinder_bm(rad, z0, z1, 24)
            o = obj_from_bmesh(f"pillar_{'long' if r == 60 else 'short'}_{k}", bm, c_frame, bronze, parent=OBJ["b1"])
            o.location = (r * math.cos(a), r * math.sin(a), 0.0)
            o["am_role"] = "frame_b1"
    strap = obj_from_bmesh("strap", box_bm(112.0, 16.0, 1.0), c_frame, plate_mat, parent=OBJ["b1"])
    strap.location.z = STRAP_Z
    strap.rotation_euler.z = math.radians(11.0)
    strap["am_role"] = "plate_b1"
    cp = obj_from_bmesh("circular_plate", annulus_bm(12.0, 62.0, 128, 1.0), c_frame, plate_mat, parent=OBJ["b1"])
    cp.location.z = CP_Z
    cp["am_role"] = "plate_b1"
    sub = obj_from_bmesh("sub_plate", annulus_bm(11.0, 30.0, 96, 1.0), c_frame, plate_mat)
    sub.location.z = FRONT_PLATE_Z - 2.6
    sub["am_role"] = "plate"

    # ---- central hub: nested output tubes -----------------------------------------------
    tubes = [("b1", 10.5, 9.6, 26.0, 33.0), ("sa86b", 9.2, 8.4, 18.0, 33.8), ("ju65b", 8.0, 7.2, 20.8, 34.6),
             ("ma80b", 6.8, 6.0, 23.6, 35.4), ("true_sun_ptr", 5.6, 4.9, 30.0, 36.2), ("venus_ptr", 4.5, 3.9, 12.0, 37.0),
             ("mercury_ptr", 3.5, 2.9, 10.5, 37.8), ("nod48", 2.6, 2.0, 4.5, 38.6), ("b3", 1.7, 0.0, -14.0, 40.0)]
    for host, ro, ri, z0, z1 in tubes:
        h = OBJ[host]
        bm = cylinder_bm(ro, 0.0, z1 - z0, 32, r_in=ri)
        t = obj_from_bmesh("tube_" + host, bm, c_ptr, bronze, parent=h)
        t.location.z = z0 - h.location.z if h.parent is None else z0 - (GEARS[host]["z"] if host in GEARS else 0.0)
        t["am_role"] = "tube"

    # ---- front pointers and rings ------------------------------------------------------
    def front_z(host):
        g = GEARS.get(host)
        return g["z"] if g else 0.0

    # date pointer on the outermost tube (b1), reaching the calendar ring
    o = obj_from_bmesh("ptr_date", pointer_bm(80.5, 2.4, 1.0, 0.8, hub_r=11.5), c_ptr, bronze, parent=OBJ["b1"])
    o.location.z = 33.0
    o["am_role"] = "pointer"; o["am_pointer"] = "date"
    # planet rings with marker stones
    for host, r, zt, name in (("sa86b", 42.0, 33.8, "saturn"), ("ju65b", 36.0, 34.6, "jupiter"), ("ma80b", 30.0, 35.4, "mars"),
                              ("venus_ptr", 18.0, 37.0, "venus"), ("mercury_ptr", 12.5, 37.8, "mercury")):
        h = OBJ[host]
        ring = obj_from_bmesh(f"ring_{name}", annulus_bm(r - 1.6, r + 1.6, 160, 0.6), c_ptr, bronze, parent=h)
        ring.location.z = zt - (front_z(host) if h.parent is None else (GEARS[host]["z"] if host in GEARS else 0.0))
        ring["am_role"] = "pointer"; ring["am_pointer"] = name
        # a thin spoke from the hub to the ring so the rotation reads
        spoke = obj_from_bmesh(f"spoke_{name}", box_bm(r, 1.2, 0.5, r / 2, 0.0, 0.0), c_ptr, bronze, parent=ring)
        stone = obj_from_bmesh(f"stone_{name}", sphere_bm(1.8), c_ptr, stones[name], parent=ring)
        stone.location = (r, 0.0, 0.8)
    # true sun: pointer with a golden ball
    ts = OBJ["true_sun_ptr"]
    o = obj_from_bmesh("ptr_true_sun", pointer_bm(60.0, 2.0, 0.8, 0.7, hub_r=5.4), c_ptr, gold, parent=ts)
    o.location.z = 36.2 - 0.0
    o["am_role"] = "pointer"; o["am_pointer"] = "true_sun"
    ball = obj_from_bmesh("sun_ball", sphere_bm(2.6), c_ptr, gold, parent=o)
    ball.location = (52.0, 0.0, 2.8)
    # dragon hand on the nodes tube
    nd = OBJ["nod48"]
    bm = pointer_bm(58.0, 1.8, 0.7, 0.7, hub_r=2.4)
    bm = merge(bm, pointer_bm(58.0, 1.8, 0.7, 0.7))
    # mirror the second pointer to make the tail
    o = obj_from_bmesh("ptr_dragon", bm, c_ptr, dark, parent=nd)
    o.location.z = 38.6 - GEARS["nod48"]["z"]
    o["am_role"] = "pointer"; o["am_pointer"] = "nodes"
    head = obj_from_bmesh("dragon_head", sphere_bm(2.0, 16, 8), c_ptr, dark, parent=o)
    head.location = (56.0, 0.0, 1.2)
    # moon pointer with lunar disc (drum) around the phase ball
    mp = OBJ["b3"]
    o = obj_from_bmesh("ptr_moon", pointer_bm(60.0, 2.2, 0.9, 0.8, hub_r=1.6), c_ptr, silver, parent=mp)
    o.location.z = 40.0 - GEARS["b3"]["z"]
    o["am_role"] = "pointer"; o["am_pointer"] = "moon"
    drum = obj_from_bmesh("lunar_disc", annulus_bm(3.6, 6.2, 48, 5.5), c_ptr, bronze, parent=o)
    drum.location = (OBJ["q1"].location.x, 0.0, -3.0)
    # crank knob outside the case
    a1 = OBJ["a1"]
    knob = obj_from_bmesh("crank_axle", cylinder_bm(1.6, 0.0, 30.0, 20), c_case, bronze, parent=a1)
    knob.rotation_euler.y = math.radians(90)
    knob.location.x = 0.0
    handle = obj_from_bmesh("crank_knob", sphere_bm(6.0, 24, 12), c_case, wood, parent=a1)
    handle.location.x = 36.0

    # ---- back pointers with spiral follower pins -----------------------------------------
    spirals = DIALS["spirals"]
    for pid, host, sp, rate in (("metonic", "n1", spirals["metonic"], R["n1"]), ("saros", "g1", spirals["saros"], R["g1"])):
        h = OBJ[host]
        length = sp["r0"] + sp["pitch"] * sp["turns"] + 4.0
        o = obj_from_bmesh("ptr_" + pid, pointer_bm(length, 2.6, 1.6, 0.9, hub_r=3.2), c_ptr, bronze, parent=h)
        o.location.z = BACK_PLATE_Z - 3.2 - GEARS[host]["z"]
        o["am_role"] = "pointer"; o["am_pointer"] = pid
        pin = obj_from_bmesh("pin_" + pid, cylinder_bm(0.7, -1.6, 0.4, 16), c_ptr, dark, parent=o)
        # follower slides outward along the pointer as the spiral is traversed:
        # x = r0 + pitch * (turns elapsed mod spiral turns); turns elapsed = -rate*y (Blender sense)
        turns = sp["turns"]
        expr = f"{sp['r0']} + {sp['pitch']} * ((({-float(rate)})*y % {turns}) + {turns}) % {turns}"
        expr = f"{sp['r0']} + {sp['pitch']} * (((({float(rate)})*y) % {turns} + {turns}) % {turns})"
        add_driver_loc_x(pin, expr, master)
        pin["am_coupling"] = json.dumps({"type": "spiral", "rate": float(rate), "turns": turns, "r0": sp["r0"], "pitch": sp["pitch"]})
        pin["am_id"] = "pin_" + pid
        pin["am_order"] = 40
        pin["am_frame"] = host
    for pid, host in (("games", "o1"), ("callippic", "cal1"), ("exeligmos", "i1")):
        h = OBJ[host]
        o = obj_from_bmesh("ptr_" + pid, pointer_bm(8.6, 1.6, 0.8, 0.7, hub_r=1.8), c_ptr, bronze, parent=h)
        o.location.z = BACK_PLATE_Z - 2.4 - GEARS[host]["z"]
        o["am_role"] = "pointer"; o["am_pointer"] = pid

    # ---- wooden case ----------------------------------------------------------------------
    t = 9.0
    zc = (FRONT_PLATE_Z + BACK_PLATE_Z) / 2
    parts = [("case_left", t, CASE_H, CASE_D, -CASE_W / 2 + t / 2, PLATE_CY, zc),
             ("case_right", t, CASE_H, CASE_D, CASE_W / 2 - t / 2, PLATE_CY, zc),
             ("case_top", CASE_W, t, CASE_D, 0.0, PLATE_CY + CASE_H / 2 - t / 2, zc),
             ("case_bottom", CASE_W, t, CASE_D, 0.0, PLATE_CY - CASE_H / 2 + t / 2, zc)]
    for name, w, hgt, d, cx, cy, cz in parts:
        o = obj_from_bmesh(name, box_bm(w, hgt, d, cx, cy, cz, uv_span=120.0), c_case, wood)
        o["am_role"] = "case"

    # placeholder pointer bars from build_all are superseded
    for ob in list(bpy.data.objects):
        if ob.name.startswith("ptr_") and "am_role" not in ob:
            bpy.data.objects.remove(ob, do_unlink=True)
    for name in ("moon_ball",):
        if name in OBJ:
            OBJ[name]["am_role"] = "pointer"
    return {"dials": [d["name"] for d in DIALS["dials"]], "objects": len(bpy.data.objects)}


result = build()

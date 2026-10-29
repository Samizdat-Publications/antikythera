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
import mathutils

REPO = globals().get("REPO", r"C:\Users\stewa\Documents\Claude\Blender Tests\antikythera")
for p in (REPO + "\\python", REPO + "\\blender"):
    if p not in sys.path:
        sys.path.insert(0, p)
import mech.ratios as ratios     # noqa: E402
import mech.layout as layout     # noqa: E402
import mech.synodic as synodic   # noqa: E402
import gear_gen                  # noqa: E402
for _m in (ratios, layout, synodic, gear_gen):
    importlib.reload(_m)

TAU = 2 * math.pi
TEX = os.path.join(REPO, "assets", "textures")
DIALS = json.load(open(os.path.join(TEX, "dials.json"), encoding="utf-8"))
SPEC = ratios.load(os.path.join(REPO, "data", "gears.json"))
GEARS = {g["id"]: g for g in SPEC["gears"]}
# the z of every arbor a front output rides on: the gears, and the three pin-follower carriers
# (mercury_ptr, venus_ptr, true_sun_ptr), which are not gears but sit at their own depth on b1.
# Leaving the followers out put the Sun pointer 29.5 mm and Mercury and Venus 10 mm too far forward.
HOST_Z = {**{k: g["z"] for k, g in GEARS.items()}, **{f["id"]: f["z"] for f in SPEC.get("followers", [])}}
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

# Front dial, as measured on Fragment C (Bitsakis and Jones 2016): the plate's opening is about
# 132 mm across; the zodiac is engraved on the plate from there to the edge of a sunk channel
# about 146 mm across; the Egyptian calendar ring sits in that channel, about 162 mm across, flush
# with the plate. Keep in step with front_dial() in tools/gen_dial_textures.py.
PLATE_OPENING_R = 66.0
ZODIAC_R = (66.0, 73.0)
CALENDAR_R = (73.0, 81.0)

# The ring display of Freeth et al. 2021 (Fig. 7): from the centre, rings for Mercury, Venus, the
# true Sun, Mars, Jupiter and Saturn, then a narrow Date ring, all inside the zodiac. Each ring
# sits on its own output tube; the inner rings stand on the longer tubes, nearer the viewer.
# (name, host, z of the ring's underside, width)
RING_FIRST_R, RING_GAP = 11.5, 0.8
FRONT_RINGS = [("mercury", "mercury_ptr", 37.8, 7.5), ("venus", "venus_ptr", 37.0, 7.5),
               ("true_sun", "true_sun_ptr", 36.2, 7.5), ("mars", "ma80b", 35.4, 7.5),
               ("jupiter", "ju65b", 34.6, 7.5), ("saturn", "sa86b", 33.8, 7.5), ("date", "b1", 33.0, 3.0)]


def ring_radii():
    out, r = {}, RING_FIRST_R
    for name, host, z, w in FRONT_RINGS:
        out[name] = (r, r + w)
        r += w + RING_GAP
    return out


RING_R = ring_radii()

# Eclipse limits marked on the true-Sun ring either side of its pointer (Fig. 7: "wider and
# narrower eclipse limits"). The paper gives no figures; these are the usual ancient-style round
# values, about the limits for a lunar and for a solar eclipse.
ECLIPSE_LIMITS_DEG = (12.0, 18.0)
SYNODIC_MONTH_DAYS = 29.530589

# Back dials, as seen from the BACK (angles counter-clockwise from 3 o'clock). Keep in step with
# tools/gen_dial_textures.py and web/src/astro/calibration.ts.
SPIRAL_START_DEG = 90.0          # Metonic and Saros spirals begin at the top (Freeth)
GAMES_START_DEG = 278.0          # Olympiad pointer at the divider that opens year 1, 8 deg past the bottom (Freeth 2008 SI 3.5)
CALLIPPIC_START_DEG = 270.0
EXELIGMOS_START_DEG = 60.0       # the blank sector centred at 3 o'clock, then 8 at 7, 16 at 11 o'clock


def back_to_front_deg(a_back):
    """A direction drawn on the back, seen from behind, as an angle in the front-view frame."""
    return 180.0 - a_back

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
        # a real box unwrap: each face takes the two axes it actually spans, so the grain keeps
        # its scale on all six. Projecting x across a board only 9 mm thick smeared its broad
        # faces into vertical streaks (see NOTES.md, 2026-09-18). Same rule as surface.py's
        # box_uvs, so a mesh that arrives here and one that is projected there agree.
        uv = bm.loops.layers.uv.new("UVMap")
        for f in bm.faces:
            n = f.normal
            for lp in f.loops:
                x, y, z = lp.vert.co
                if abs(n.z) >= 0.5:
                    u, v = x, y
                elif abs(n.x) >= abs(n.y):
                    u, v = y, z
                else:
                    u, v = x, z
                lp[uv].uv = (u / uv_span + 0.5, v / uv_span + 0.5)
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



def radial_pointer(r0, r1, w0, w1, thick):
    """A pointer that starts at radius r0 (on a ring, not at the hub) and ends at r1."""
    L = (r1 - r0) / 1.18
    bm = pointer_bm(L, w0, w1, thick)
    bmesh.ops.translate(bm, vec=(r0 + 0.18 * L, 0.0, 0.0), verts=bm.verts)
    return bm


_UNITS = "ΑΒΓΔΕϚΖΗΘ"


def greek_numeral(n):
    """1..99 as an alphabetic numeral, as the dials write day and year numbers."""
    tens = ["", "Ι", "Κ", "Λ", "Μ", "Ν", "Ξ", "Ο", "Π", "Ϙ"][n // 10]
    return tens + (_UNITS[n % 10 - 1] if n % 10 else "")


def text_bm(s, size):
    """Letters in Blender's built-in font, as flat faces centred on the origin, reading along +X."""
    cu = bpy.data.curves.new("_tmp_txt", "FONT")
    cu.body = s
    cu.size = size
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    ob = bpy.data.objects.new("_tmp_txt", cu)
    sc.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bm = bmesh.new()
    bm.from_mesh(me)
    bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.curves.remove(cu)
    bpy.data.meshes.remove(me)
    return bm


def engrave(name, parent, items, material, z=0.62):
    """Engraved marks on a ring, as one dark inlay just proud of its face. items are
    ("tick", angle_deg, r0, r1, width) and ("text", s, angle_deg, r, size), angles ccw from the
    ring's stone; letters stand with their tops outward."""
    bm = bmesh.new()
    for it in items:
        if it[0] == "tick":
            _, a, r0, r1, w = it
            part = box_bm(r1 - r0, w, 0.02, (r0 + r1) / 2, 0.0, 0.0)
            bmesh.ops.rotate(part, cent=(0, 0, 0), matrix=mathutils.Matrix.Rotation(math.radians(a), 3, "Z"), verts=part.verts)
        elif it[0] == "tri":
            _, a, r_tip, r_base, half_w = it
            part = bmesh.new()
            vs = [part.verts.new((r_tip, 0.0, 0.0)), part.verts.new((r_base, -half_w, 0.0)), part.verts.new((r_base, half_w, 0.0))]
            part.faces.new(vs)
            bmesh.ops.recalc_face_normals(part, faces=part.faces)
            if part.faces[0].normal.z < 0:
                bmesh.ops.reverse_faces(part, faces=part.faces)
            bmesh.ops.rotate(part, cent=(0, 0, 0), matrix=mathutils.Matrix.Rotation(math.radians(a), 3, "Z"), verts=part.verts)
        else:
            _, txt, a, r, size = it
            part = text_bm(txt, size)
            bmesh.ops.rotate(part, cent=(0, 0, 0), matrix=mathutils.Matrix.Rotation(math.radians(a - 90.0), 3, "Z"), verts=part.verts)
            bmesh.ops.translate(part, vec=(r * math.cos(math.radians(a)), r * math.sin(math.radians(a)), 0.0), verts=part.verts)
        merge(bm, part)
    ob = obj_from_bmesh(name, bm, coll("Pointers"), material, parent=parent)
    ob.location.z = z
    ob["am_role"] = "engraving"
    return ob


def planet_ring_items(ri, ro, marks):
    """A scale mark for each synodic event where the Sun pointer stands at it, and its index letter
    just clockwise of the mark (as the parapegma letters sit on the zodiac); two events at one
    place (Mercury's and Venus's two conjunctions, at the stone) take a letter either side."""
    items, seen = [], {}
    w = ro - ri
    for m in marks:
        a = m.eps_deg
        key = round(a, 3)
        first = key not in seen
        seen[key] = True
        if first:
            items.append(("tick", a, ri + 0.25, ri + 0.62 * w, 0.25))
        r_letter = ri + 0.80 * w
        da = math.degrees(1.1 / r_letter)
        items.append(("text", m.letter, a - da if first else a + da, r_letter, 1.4))
    return items


def sun_ring_items(ri, ro):
    """The Age of the Moon, days 1 to 29 from the Sun, read by the Moon pointer (the Moon runs
    ahead of the Sun, clockwise seen from the front), and the eclipse-limit triangles either side
    of the pointer at the ring's outer edge."""
    items = []
    w = ro - ri
    for d in range(1, 30):
        a = -360.0 * d / SYNODIC_MONTH_DAYS
        items.append(("tick", a, ri + 0.25, ri + (0.45 if d % 5 else 0.6) * w, 0.14))
        items.append(("text", greek_numeral(d), a + math.degrees(1.25 / (ri + 0.75 * w)), ri + 0.75 * w, 1.0))
    for lim in ECLIPSE_LIMITS_DEG:
        for sgn in (1, -1):
            items.append(("tri", sgn * lim, ro - 1.6, ro - 0.2, 0.55))
    return items

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
                                   "pin_", "dragon_", "sun_ball", "engr_", "oppmark_", "lunar_disc", "strap", "circular_plate", "sub_plate",
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
    ob = obj_from_bmesh("front_plate", plate_with_hole_bm(PLATE_W, PLATE_H, PLATE_OPENING_R, 1.5, cy=PLATE_CY), c_frame, plate_mat)
    ob.location.z = FRONT_PLATE_Z - 0.75
    ob["am_role"] = "plate"
    fd = dial_meta["front_dial"]
    fmat = image_material("FrontDial", os.path.join(TEX, "front_dial.png"), os.path.join(TEX, "front_dial_bump.png"))
    zod = obj_from_bmesh("zodiac_ring", annulus_bm(ZODIAC_R[0], ZODIAC_R[1], 360, 1.0, 0.0, fd["span_mm"]), c_dial, fmat)
    zod.location.z = FRONT_PLATE_Z + 0.3
    zod["am_role"] = "dial"
    cal = obj_from_bmesh("calendar_ring", annulus_bm(CALENDAR_R[0] + 0.15, CALENDAR_R[1], 360, 1.0, 0.0, fd["span_mm"]), c_dial, fmat)
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
        t.location.z = z0 - h.location.z if h.parent is None else z0 - HOST_Z.get(host, 0.0)
        t["am_role"] = "tube"

    # ---- front pointers and rings ------------------------------------------------------
    def front_z(host):
        return HOST_Z.get(host, 0.0)

    # The ring display (Freeth et al. 2021, Fig. 7). Each ring is the output of its tube; the
    # scale marks and index letters of the planets' synodic events are engraved on it, read by
    # the true-Sun pointer as it passes over (python/mech/synodic.py works out where they fall).
    marks = synodic.all_marks(SPEC)
    inlay = plain_material("Engraving", (0.04, 0.03, 0.02), metallic=0.0, roughness=0.8)
    rings = {}
    for name, host, zt, w in FRONT_RINGS:
        h = OBJ[host]
        ri, ro = RING_R[name]
        rm = (ri + ro) / 2
        if name == "date":
            # a narrow date ring on the outermost tube; the Date pointer on it reaches out over the
            # zodiac to the Egyptian calendar
            o = obj_from_bmesh("ptr_date", radial_pointer(ri, CALENDAR_R[0] + 4.5, 2.4, 1.0, 0.8), c_ptr, bronze, parent=h)
            o.location.z = zt + 0.6 - front_z(host)
            o["am_role"] = "pointer"; o["am_pointer"] = "date"
            ring = obj_from_bmesh("ring_date", annulus_bm(ri, ro, 200, 0.6), c_ptr, bronze, parent=o)
            ring.location.z = -0.6
            spoke = obj_from_bmesh("spoke_date", box_bm(ri - 9.5, 1.4, 0.5, -(ri + 9.5) / 2, 0.0, 0.25), c_ptr, bronze, parent=ring)
            rings[name] = ring
            continue
        if name == "true_sun":
            # the "little golden sphere" with its "pointer" (BCI) on the true-Sun ring. The pointer
            # lies on the ring and runs out over the outer rings to the zodiac, under the dragon hand
            # (38.6 mm) and the Moon pointer (40 mm); inside the ring there is nothing for it to read
            # that the inner rings' edges do not show.
            o = obj_from_bmesh("ptr_true_sun", radial_pointer(ri, ZODIAC_R[0] + 2.0, 2.0, 0.8, 0.7), c_ptr, gold, parent=h)
            o.location.z = zt + 0.6 - front_z(host)
            o["am_role"] = "pointer"; o["am_pointer"] = "true_sun"
            ring = obj_from_bmesh("ring_true_sun", annulus_bm(ri, ro, 200, 0.6), c_ptr, bronze, parent=o)
            ring.location.z = -0.6
            spoke = obj_from_bmesh("spoke_true_sun", box_bm(ri - 5.0, 1.2, 0.5, -(ri + 5.0) / 2, 0.0, 0.25), c_ptr, bronze, parent=ring)
            ball = obj_from_bmesh("sun_ball", sphere_bm(1.9), c_ptr, gold, parent=o)
            ball.location = (rm, 0.0, 0.5)
            ball.scale = (1.0, 1.0, 0.5)                   # clear of the Mars spoke below and the dragon hand above
            engrave("engr_true_sun", ring, sun_ring_items(ri, ro), inlay)
            rings[name] = ring
            continue
        ring = obj_from_bmesh(f"ring_{name}", annulus_bm(ri, ro, 200, 0.6), c_ptr, bronze, parent=h)
        ring.location.z = zt - front_z(host)
        ring["am_role"] = "pointer"; ring["am_pointer"] = name
        # a thin spoke from the hub to the ring so the rotation reads
        spoke = obj_from_bmesh(f"spoke_{name}", box_bm(ri, 1.2, 0.5, ri / 2, 0.0, 0.0), c_ptr, bronze, parent=ring)
        # the "little sphere": an inlaid stone, not a bead, since the rings stand 0.8 mm apart and
        # a round stone 3.6 mm high was swept by every pointer above it
        stone = obj_from_bmesh(f"stone_{name}", sphere_bm(1.8), c_ptr, stones[name], parent=ring)
        stone.location = (rm, 0.0, 0.3)
        stone.scale = (1.0, 1.0, 0.22)
        if name in ("mars", "jupiter", "saturn"):
            # "smaller markers for oppositions", opposite the stone
            opp = obj_from_bmesh(f"oppmark_{name}", sphere_bm(0.9), c_ptr, stones[name], parent=ring)
            opp.location = (-rm, 0.0, 0.3)
            opp.scale = (1.0, 1.0, 0.3)
        engrave(f"engr_{name}", ring, planet_ring_items(ri, ro, marks[name]), inlay)
        rings[name] = ring
    # true sun: the pointer above sits in its own layer (36.2 to 36.9 mm, with Mars below at 35.4 and
    # Venus above at 37.0); the ball stays under the dragon hand at 38.6, so the Moon pointer and the
    # dragon hand pass over it
    # dragon hand on the nodes tube
    nd = OBJ["nod48"]
    bm = pointer_bm(RING_R["date"][1], 1.8, 0.7, 0.7, hub_r=2.4)
    bm = merge(bm, pointer_bm(RING_R["date"][1], 1.8, 0.7, 0.7))
    # mirror the second pointer to make the tail
    o = obj_from_bmesh("ptr_dragon", bm, c_ptr, dark, parent=nd)
    o.location.z = 38.6 - GEARS["nod48"]["z"]
    o["am_role"] = "pointer"; o["am_pointer"] = "nodes"
    head = obj_from_bmesh("dragon_head", sphere_bm(2.0, 16, 8), c_ptr, dark, parent=o)
    head.location = (RING_R["date"][1] - 2.0, 0.0, 0.5)
    head.scale = (1.0, 1.0, 0.35)                                  # clear of the Moon pointer above
    # moon pointer with lunar disc (drum) around the phase ball
    mp = OBJ["b3"]
    o = obj_from_bmesh("ptr_moon", pointer_bm(ZODIAC_R[0] + 2.0, 2.2, 0.9, 0.8, hub_r=1.6), c_ptr, silver, parent=mp)
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
        # at years = 0 the pointer stands at the start of the spiral (the exhibit sets it to the
        # epoch's cell); both spirals start at the top
        o.rotation_euler.z = math.radians(back_to_front_deg(SPIRAL_START_DEG))
        pin = obj_from_bmesh("pin_" + pid, cylinder_bm(0.7, -1.6, 0.4, 16), c_ptr, dark, parent=o)
        # the follower slides outward along the pointer as the spiral is traversed:
        # x = r0 + pitch * (turns elapsed mod spiral turns). Both pointers turn clockwise seen from
        # the back, which is a negative rate here, so the turns elapsed are -rate * years.
        turns = sp["turns"]
        expr = f"{sp['r0']} + {sp['pitch']} * (((({-float(rate)})*y) % {turns} + {turns}) % {turns})"
        add_driver_loc_x(pin, expr, master)
        pin["am_coupling"] = json.dumps({"type": "spiral", "rate": float(rate), "turns": turns, "r0": sp["r0"], "pitch": sp["pitch"],
                                         "turns_elapsed": "-rate*years + phase"})
        pin["am_id"] = "pin_" + pid
        pin["am_order"] = 40
        pin["am_frame"] = host
    for pid, host, start in (("games", "o1", GAMES_START_DEG), ("callippic", "cal1", CALLIPPIC_START_DEG),
                             ("exeligmos", "i1", EXELIGMOS_START_DEG)):
        h = OBJ[host]
        o = obj_from_bmesh("ptr_" + pid, pointer_bm(8.6, 1.6, 0.8, 0.7, hub_r=1.8), c_ptr, bronze, parent=h)
        o.location.z = BACK_PLATE_Z - 2.4 - GEARS[host]["z"]
        o.rotation_euler.z = math.radians(back_to_front_deg(start))
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

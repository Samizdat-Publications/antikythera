"""Build gear meshes in Blender from the pure-Python outlines in mech.gearprofile.

Usage inside Blender (headless or over the MCP socket):
    import sys; sys.path[:0] = [REPO + "/python", REPO + "/blender"]
    import gear_gen
    ob = gear_gen.make_gear("b1", teeth=223, module=0.578, thick=2.7, spokes=4, ...)

Every gear is one mesh object centred on its own axis at the origin of its
parent; +Z is toward the front of the mechanism. Tooth 0 points along local +X.
Scene units are millimetres (unit scale 0.001).
"""
from __future__ import annotations
import math

import bmesh
import bpy

from mech.gearprofile import outline as _outline

TAU = 2 * math.pi


def _ring_verts(bm, r, n, z=0.0, a0=0.0):
    return [bm.verts.new((r * math.cos(a0 + TAU * i / n), r * math.sin(a0 + TAU * i / n), z)) for i in range(n)]


def _loop_edges(bm, verts):
    return [bm.edges.new((verts[i], verts[(i + 1) % len(verts)])) for i in range(len(verts))]


def _extrude_z(bm, faces, dz):
    res = bmesh.ops.extrude_face_region(bm, geom=faces)
    verts = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=verts, vec=(0.0, 0.0, dz))


def _annulus(bm, r_in, r_out, n, thick, z0):
    """Closed annular prism from z0 to z0+thick (separate shell)."""
    vo = _ring_verts(bm, r_out, n, z0)
    vi = _ring_verts(bm, r_in, n, z0)
    eo, ei = _loop_edges(bm, vo), _loop_edges(bm, vi)
    res = bmesh.ops.bridge_loops(bm, edges=eo + ei)
    _extrude_z(bm, res["faces"], thick)


def _box(bm, x0, x1, hw, z0, z1, angle):
    """Axis-aligned box along local X from x0..x1, half-width hw, rotated by angle."""
    c, s = math.cos(angle), math.sin(angle)
    pts = []
    for x, y, z in ((x0, -hw, z0), (x1, -hw, z0), (x1, hw, z0), (x0, hw, z0),
                    (x0, -hw, z1), (x1, -hw, z1), (x1, hw, z1), (x0, hw, z1)):
        pts.append(bm.verts.new((c * x - s * y, s * x + c * y, z)))
    faces = ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7))
    for f in faces:
        bm.faces.new([pts[i] for i in f])


def gear_bmesh(teeth, module, thick, profile="triangular", phase=0.0, bore_r=1.0,
               spokes=0, hub_r=None, rim_w=None, spoke_w=None, tip_r=None, root_r=None,
               spoke_angle0=0.0):
    kw = {}
    if tip_r is not None:
        kw["tip_r"] = tip_r
    if root_r is not None:
        kw["root_r"] = root_r
    pts = _outline(profile, teeth, module, phase, **kw)
    n = len(pts)
    rp = module * teeth / 2
    rf = min(math.hypot(x, y) for x, y in pts)
    bm = bmesh.new()
    z0 = -thick / 2
    # rim / web: outline loop bridged to an inner loop of the same vertex count
    vo = [bm.verts.new((x, y, z0)) for x, y in pts]
    eo = _loop_edges(bm, vo)
    if spokes:
        rim_w = rim_w if rim_w is not None else max(2.0 * module, 0.08 * rp)
        r_in = rf - rim_w
    else:
        r_in = bore_r
    vi = _ring_verts(bm, r_in, n, z0, a0=math.atan2(pts[0][1], pts[0][0]))
    ei = _loop_edges(bm, vi)
    res = bmesh.ops.bridge_loops(bm, edges=eo + ei)
    _extrude_z(bm, res["faces"], thick)
    if spokes:
        hub_r = hub_r if hub_r is not None else max(bore_r + 2.0 * module, 0.12 * rp)
        hub_r = min(hub_r, r_in - 0.5)
        _annulus(bm, bore_r, hub_r, 48, thick, z0)
        spoke_w = spoke_w if spoke_w is not None else max(1.5 * module, 0.16 * rp)
        for k in range(spokes):
            ang = spoke_angle0 + TAU * k / spokes
            _box(bm, hub_r - 0.2, r_in + 0.2, spoke_w / 2, z0 + 0.02 * thick, z0 + 0.98 * thick, ang)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def crown_bmesh(teeth, module, thick, r_mean=None, face_w=None, tooth_h=None, phase=0.0, bore_r=1.0):
    """Contrate (crown) gear: a flat ring with triangular teeth standing on its face,
    pointing +Z. Used for a1 (input) and q1 (phase-ball drive)."""
    r_mean = r_mean if r_mean is not None else module * teeth / 2
    face_w = face_w if face_w is not None else 3.0 * module
    tooth_h = tooth_h if tooth_h is not None else 1.8 * module
    bm = bmesh.new()
    z0 = -thick / 2
    _annulus(bm, bore_r, r_mean + face_w / 2 + 0.6 * module, 64, thick, z0)
    r_in, r_out = r_mean - face_w / 2, r_mean + face_w / 2
    p = TAU / teeth
    for k in range(teeth):
        c = phase + k * p
        half = 0.42 * p                                   # base half-angle
        # triangular prism: base on the ring top, ridge at tooth_h
        base = [(r_in, c - half), (r_out, c - half), (r_out, c + half), (r_in, c + half)]
        vb = [bm.verts.new((r * math.cos(a), r * math.sin(a), z0 + thick)) for r, a in base]
        vt = [bm.verts.new((r * math.cos(c), r * math.sin(c), z0 + thick + tooth_h)) for r in (r_in, r_out)]
        bm.faces.new((vb[0], vb[1], vt[1], vt[0]))
        bm.faces.new((vb[3], vt[0], vt[1], vb[2]))
        bm.faces.new((vb[0], vt[0], vb[3]))
        bm.faces.new((vb[1], vb[2], vt[1]))
        bm.faces.new((vb[0], vb[3], vb[2], vb[1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def bronze_material(name="Bronze"):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.80, 0.55, 0.25, 1.0)
    bsdf.inputs["Metallic"].default_value = 1.0
    bsdf.inputs["Roughness"].default_value = 0.38
    return mat


def make_gear(name, teeth, module, thick, profile="triangular", phase=0.0, bore_r=1.0,
              spokes=0, tip_r=None, root_r=None, kind="spur", collection=None, material=None,
              props=None, axis="Z", **kw):
    """axis: 'Z' (default, spur gears lying in XY), '+X' / '-X' for crown gears whose
    teeth must point along the local X axis (radial arbors such as a1 and q1)."""
    if kind == "contrate":
        bm = crown_bmesh(teeth, module, thick, phase=phase, bore_r=bore_r)
    else:
        bm = gear_bmesh(teeth, module, thick, profile, phase, bore_r, spokes, tip_r=tip_r, root_r=root_r, **kw)
    if axis in ("+X", "-X"):
        import mathutils
        rot = mathutils.Matrix.Rotation(math.radians(90 if axis == "+X" else -90), 4, "Y")
        bmesh.ops.transform(bm, matrix=rot, verts=bm.verts)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.validate()
    for poly in me.polygons:
        poly.use_smooth = False
    ob = bpy.data.objects.new(name, me)
    (collection or bpy.context.scene.collection).objects.link(ob)
    ob.data.materials.append(material or bronze_material())
    ob["am_teeth"] = teeth
    ob["am_module"] = module
    ob["am_profile"] = profile
    ob["am_kind"] = kind
    for k, v in (props or {}).items():
        ob[k] = v
    return ob

"""Build the whole Antikythera mechanism in Blender from data/gears.json.

Live session (Blender open with the MCP add-on):
    python tools/bl.py blender/build_all.py 600
Headless, reproducible:
    blender -b --factory-startup --python-exit-code 1 --python blender/build_all.py -- --out build

Everything animated is a pure Z rotation (crown gears: X) driven by ONE scalar,
MASTER["years"] = turns of the main wheel b1 since the epoch. Plain gears use
    rotation = -2*pi * rate * years            (clockwise from the front = positive rate)
epicyclic children use their rate RELATIVE to the carrier (the parent adds the rest),
slot gears use the exact pin-and-slot atan2, and followers the pin-and-follower atan2.
All expressions stay inside Blender's "simple expression" subset, so they evaluate
natively and never need script auto-run.
"""
from __future__ import annotations

import importlib
import json
import math
import os
import sys

import bpy
import mathutils

REPO = globals().get("REPO", r"C:\Users\stewa\OneDrive\Documents\Claude\Blender Tests\antikythera")
for p in (REPO + "\\python", REPO + "\\blender"):
    if p not in sys.path:
        sys.path.insert(0, p)
import mech.gearprofile as gp        # noqa: E402
import mech.ratios as ratios         # noqa: E402
import mech.layout as layout         # noqa: E402
import gear_gen                      # noqa: E402
for _m in (gp, ratios, layout, gear_gen):
    importlib.reload(_m)

TAU = 2 * math.pi
PROFILE = globals().get("PROFILE", "triangular")
SAVE = globals().get("SAVE", True)
OUT_DIR = globals().get("OUT_DIR", os.path.join(REPO, "build"))
if "--" in sys.argv:
    _a = sys.argv[sys.argv.index("--") + 1:]
    if "--out" in _a:
        OUT_DIR = _a[_a.index("--out") + 1]
    if "--profile" in _a:
        PROFILE = _a[_a.index("--profile") + 1]
os.makedirs(OUT_DIR, exist_ok=True)


# ----------------------------------------------------------------------------- scene
def fresh_scene():
    bpy.ops.wm.read_homefile(use_empty=True)
    sc = bpy.context.scene
    sc.name = "Antikythera"
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 0.001
    sc.unit_settings.length_unit = "MILLIMETERS"
    sc.render.engine = "BLENDER_EEVEE"
    return sc


def collection(name):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c


def empty(name, loc=(0, 0, 0), parent=None, coll=None, size=5.0):
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_type = "PLAIN_AXES"
    ob.empty_display_size = size
    ob.location = loc
    (coll or bpy.context.scene.collection).objects.link(ob)
    if parent:
        ob.parent = parent
    return ob


def add_driver(ob, prop, index, expr, variables):
    """variables: list of (name, kind, target, extra) where kind is 'prop' (id, data_path)
    or 'rot' (object, 'ROT_X'|'ROT_Z')."""
    fc = ob.driver_add(prop, index)
    d = fc.driver
    d.type = "SCRIPTED"
    d.expression = expr
    for name, kind, target, extra in variables:
        v = d.variables.new()
        v.name = name
        if kind == "prop":
            v.type = "SINGLE_PROP"
            v.targets[0].id = target
            v.targets[0].data_path = extra
        else:
            # read the driven rotation property directly: TRANSFORMS/LOCAL_SPACE reads of
            # chain-driven objects came back as 0 in Blender 5.1, SINGLE_PROP is reliable
            v.type = "SINGLE_PROP"
            v.targets[0].id = target
            v.targets[0].data_path = "rotation_euler[%d]" % (0 if extra == "ROT_X" else 2)
    return d


def box(name, x0, x1, hw, hz, parent=None, coll=None, z=0.0, material=None):
    """Thin pointer bar along local +X from x0 to x1."""
    me = bpy.data.meshes.new(name)
    verts = [(x0, -hw, z - hz), (x1, -hw, z - hz), (x1, hw, z - hz), (x0, hw, z - hz),
             (x0, -hw, z + hz), (x1, -hw, z + hz), (x1, hw, z + hz), (x0, hw, z + hz)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    if parent:
        ob.parent = parent
    if material:
        ob.data.materials.append(material)
    return ob


# ----------------------------------------------------------------------------- build
def build():
    sc = fresh_scene()
    spec = ratios.load(os.path.join(REPO, "data", "gears.json"))
    gears = {g["id"]: g for g in spec["gears"]}
    L = layout.solve_layout(spec)
    R = ratios.solve(spec)
    problems = layout.check_meshes(spec, L) + layout.check_clearances(spec, L)
    if problems:
        raise RuntimeError("layout problems: " + "; ".join(problems))

    c_gears, c_ptr, c_frame = collection("Gears"), collection("Pointers"), collection("Frame")
    bronze = gear_gen.bronze_material()
    master = empty("MASTER", size=10.0, coll=c_frame)
    master["years"] = 0.0
    master.id_properties_ui("years").update(min=-100000.0, max=100000.0, soft_min=-100.0, soft_max=100.0, precision=4)
    years_var = ("y", "prop", master, '["years"]')

    couplings = spec.get("couplings", [])
    same_arbor = [c for c in couplings if c["type"] in ("same_arbor", "bar")]
    pin_slots = {c["b"]: c for c in couplings if c["type"] == "pin_slot"}
    followers = {c["b"]: c for c in couplings if c["type"] == "pin_follower"}
    follower_z = {f["id"]: f["z"] for f in spec.get("followers", [])}

    # --- tooth-phase and object-angle bookkeeping ---------------------------------
    P = {"b1": 0.0}                     # vertex phase baked into the mesh
    O = {}                              # object rotation at years = 0 (non-zero only for slot gears)

    def arbor_of(gid):
        return L[gears[gid]["arbor"]]

    def carrier_of(gid):
        return gears[gid].get("carrier")

    def local_xy(gid):
        a = arbor_of(gid)
        return a.lx, a.ly

    def slot_angle0(gid):
        """Slot gear angle at years = 0: the slot points at the pin (pin gear's local +X)."""
        c = pin_slots[gid]
        pin, slot = c["a"], gid
        px, py = local_xy(pin)
        sx, sy = local_xy(slot)
        return math.atan2(py - sy + c["pin_r_mm"] * math.sin(0.0), px - sx + c["pin_r_mm"] * math.cos(0.0))

    for gid in pin_slots:
        O[gid] = slot_angle0(gid)
    # gears downstream of a slot gear inherit its non-linear motion through a short
    # driver chain instead of the linear master driver: (X, how, Y) = X follows Y
    CHAIN = [("e6", "mesh", "k2"), ("e1", "arbor", "e6"), ("b3", "mesh", "e1"),
             ("sa86b", "mesh", "sa86a"), ("ju65b", "mesh", "ju65a"), ("ma80b", "mesh", "ma80a")]
    chain_ids = {x for x, _, _ in CHAIN}
    for x, how, y in CHAIN:
        O[x] = -gears[y]["teeth"] / gears[x]["teeth"] * O[y] if how == "mesh" else O[y]
    for gid in gears:
        O.setdefault(gid, 0.0)

    adj = {}
    for a, b in spec["meshes"]:
        adj.setdefault(a, []).append((b, "mesh"))
        adj.setdefault(b, []).append((a, "mesh"))
    for c in same_arbor:
        adj.setdefault(c["a"], []).append((c["b"], "arbor"))
        adj.setdefault(c["b"], []).append((c["a"], "arbor"))
    for gid, c in pin_slots.items():
        adj.setdefault(c["a"], []).append((gid, "slot"))
        adj.setdefault(gid, []).append((c["a"], "slot"))
    # roots: the main wheel plus every grounded (fixed) gear, whose tooth phase is free
    queue = ["b1"] + [g for g in gears if gears[g].get("fixed")]
    for g in queue:
        P.setdefault(g, 0.0)
    while queue:
        a = queue.pop(0)
        for b, how in adj.get(a, []):
            if b in P:
                continue
            ga, gb = gears[a], gears[b]
            if how == "mesh" and ga.get("kind") != "contrate" and gb.get("kind") != "contrate":
                ax, ay = local_xy(a)
                bx, by = local_xy(b)
                bearing = math.atan2(by - ay, bx - ax)
                P[b] = gp.mesh_phase(ga["teeth"], O[a] + P[a], gb["teeth"], bearing) - O[b]
            else:
                P[b] = 0.0
            queue.append(b)
    unphased = [g for g in gears if g not in P]
    if unphased:
        raise RuntimeError(f"gears not reached by the phase walk: {unphased}")

    # --- gear objects ---------------------------------------------------------------
    objs = {}
    order = sorted(gears, key=lambda g: (carrier_of(g) is not None, g))   # carriers first
    for gid in order:
        g = gears[gid]
        kind = g.get("kind", "spur")
        module = g.get("module", spec["module_default"])
        pitch_r = module * g["teeth"] / 2
        on_axis = g["arbor"] == "b"
        bore = 3.2 if on_axis and gid != "b1" else 1.0
        spokes = 4 if (pitch_r >= 20.0 and kind == "spur") else 0
        axis = "Z"
        if gid == "a1":
            axis = "-X"
        elif gid == "q1":
            axis = "-X"
        tip_r = root_r = None
        if gid == "b1":
            tip_r, root_r = 65.0, 63.8                       # Table S8
        ob = gear_gen.make_gear(gid, g["teeth"], module, g["thick"], PROFILE, P[gid], bore, spokes,
                                tip_r=tip_r, root_r=root_r, kind=kind, collection=c_gears,
                                material=bronze, axis=axis)
        car = carrier_of(gid)
        a = arbor_of(gid)
        if car:
            parent = objs[car]
            gc = gears[car]
            ob.parent = parent
            ob.location = (a.lx, a.ly, g["z"] - gc["z"])
        else:
            ob.location = (a.x, a.y, g["z"])
        if gid == "a1":                                       # crown on the crank, face toward b1's rim
            ob.location = (65.0 + 0.6 + g["thick"] / 2, 0.0, 0.0)
        if gid == "q1":                                       # crown on the lunar disc, teeth toward b0
            r_b0_tip = gears["b0"]["module"] * gears["b0"]["teeth"] / 2 + 0.9 * gears["b0"]["module"]
            ob.location = (r_b0_tip + 0.6 + g["thick"] / 2, 0.0, g["z"] - gears["b3"]["z"])
        ob.rotation_mode = "XYZ"
        rate = R[gid]
        rel = rate - (R[car] if car else 0)
        ob["am_id"] = gid
        ob["am_rate"] = float(rate)
        ob["am_rate_rel"] = float(rel)
        ob["am_rate_frac"] = f"{rate.numerator}/{rate.denominator}"
        ob["am_frame"] = car or "world"
        ob["am_status"] = g.get("status", "")
        ob["am_phase"] = P[gid]
        objs[gid] = ob

    # --- drivers --------------------------------------------------------------------
    for order, (x, how, y) in enumerate(CHAIN):
        objs[x]["am_order"] = 20 + order
    for gid, ob in objs.items():
        g = gears[gid]
        car = carrier_of(gid)
        rate = R[gid]
        rel = float(rate - (R[car] if car else 0))
        if gid in chain_ids:
            x, how, y = next(c for c in CHAIN if c[0] == gid)
            src = objs[y]
            cx, cy = carrier_of(x), carrier_of(y)
            variables = [("s", "rot", src, "ROT_Z")]
            if how == "mesh":
                ratio = -gears[y]["teeth"] / gears[x]["teeth"]
                expr = f"({ratio:.12f})*s"
                # carriers differ: add the source carrier's world angle, remove our own
                if cy and cy != cx:
                    variables.append(("cs", "rot", objs[cy], "ROT_Z")); expr += " + cs"
                if cx and cx != cy:
                    variables.append(("cx", "rot", objs[cx], "ROT_Z")); expr += " - cx"
            else:
                ratio = 1.0
                expr = "s"
            add_driver(ob, "rotation_euler", 2, expr, variables)
            ob["am_coupling"] = json.dumps({"type": "chain", "from": y, "ratio": ratio,
                                            "carrierFrom": cy, "carrierTo": cx, "how": how})
        elif gid == "q1":
            # phase-ball crown gear on the moon pointer: turns with (moon - mean sun)
            add_driver(ob, "rotation_euler", 0, "b - s", [("b", "rot", objs["b3"], "ROT_Z"),
                                                          ("s", "rot", objs["b0"], "ROT_Z")])
            ob["am_coupling"] = json.dumps({"type": "differential", "a": "b3", "b": "b0", "axis": "x"})
            ob["am_order"] = 30
        elif gid in pin_slots:
            c = pin_slots[gid]
            pin = objs[c["a"]]
            px, py = local_xy(c["a"])
            sx, sy = local_xy(gid)
            expr = f"atan2({py - sy:.9f} + {c['pin_r_mm']}*sin(t), {px - sx:.9f} + {c['pin_r_mm']}*cos(t))"
            add_driver(ob, "rotation_euler", 2, expr, [("t", "rot", pin, "ROT_Z")])
            ob["am_coupling"] = json.dumps({"type": "pin_slot", "pin": c["a"], "d": c["offset_mm"], "r": c["pin_r_mm"],
                                            "dx": px - sx, "dy": py - sy})
            ob["am_order"] = 10
        elif g.get("kind") == "contrate":
            # crown gears turn about their own (local X) axis
            add_driver(ob, "rotation_euler", 0, f"({-TAU * rel:.12f})*y", [years_var])
        elif g.get("fixed"):
            pass
        else:
            add_driver(ob, "rotation_euler", 2, f"({-TAU * rel:.12f})*y", [years_var])

    # --- followers (pin-and-follower, pivot on the central axis) ---------------------
    fol_objs = {}
    for fid, c in followers.items():
        epi = objs[c["a"]]
        cx, cy = local_xy(c["a"])
        d = c["pin_r_mm"]
        z = follower_z[fid] - gears["b1"]["z"]
        fol = empty(fid, (0, 0, z), parent=objs["b1"], coll=c_ptr, size=3.0)
        expr = f"atan2({cy:.9f} + {d}*sin(t), {cx:.9f} + {d}*cos(t))"
        add_driver(fol, "rotation_euler", 2, expr, [("t", "rot", epi, "ROT_Z")])
        fol["am_id"] = fid
        fol["am_frame"] = "b1"
        fol["am_coupling"] = json.dumps({"type": "pin_follower", "epicycle": c["a"], "cx": cx, "cy": cy, "d": d})
        fol["am_order"] = 10
        # the pin itself, for the eye
        pin = box(fid + "_pin", d - 0.4, d + 0.4, 0.4, 1.2, parent=epi, coll=c_ptr, z=0.0, material=bronze)
        # the slotted rod
        box(fid + "_rod", 0.0, cx * 0 + math.hypot(cx, cy) + d + 4.0, 0.9, 0.4, parent=fol, coll=c_ptr, material=bronze)
        fol_objs[fid] = fol

    # --- placeholder pointers (real dials and rings come in M3) ----------------------
    FRONT_Z = 32.0
    ptr_specs = {
        "date":      ("b1",    66.0, 80.0, FRONT_Z + 4.0, 1.0),
        "moon":      ("b3",    0.0, 60.0, FRONT_Z + 3.0, 1.0),
        "nodes":     ("nod48", -58.0, 58.0, FRONT_Z + 2.0, 0.7),
        "mars":      ("ma80b", 0.0, 44.0, FRONT_Z + 1.0, 0.8),
        "jupiter":   ("ju65b", 0.0, 48.0, FRONT_Z + 1.5, 0.8),
        "saturn":    ("sa86b", 0.0, 52.0, FRONT_Z + 2.5, 0.8),
        "metonic":   ("n1",    0.0, 55.0, -40.0, 1.2),
        "callippic": ("cal1",  0.0, 9.0, -40.0, 0.6),
        "games":     ("o1",    0.0, 9.0, -40.0, 0.6),
        "saros":     ("g1",    0.0, 55.0, -40.0, 1.2),
        "exeligmos": ("i1",    0.0, 9.0, -40.0, 0.6),
    }
    for pid, (host, x0, x1, zw, hw) in ptr_specs.items():
        h = objs[host]
        zl = zw - gears[host]["z"]
        box("ptr_" + pid, x0, x1, hw, 0.4, parent=h, coll=c_ptr, z=zl, material=bronze)
    for fid, x1 in (("mercury_ptr", 36.0), ("venus_ptr", 40.0), ("true_sun_ptr", 56.0)):
        box("ptr_" + fid.replace("_ptr", ""), 0.0, x1, 0.9, 0.4, parent=fol_objs[fid], coll=c_ptr,
            z=FRONT_Z + 0.5 - follower_z[fid], material=bronze)
    # moon-phase ball on q1's axle (turns with q1 about the radial axis)
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=3.0)
    ball_me = bpy.data.meshes.new("moon_ball")
    bm.to_mesh(ball_me); bm.free()
    ball = bpy.data.objects.new("moon_ball", ball_me)
    c_ptr.objects.link(ball)
    ball.parent = objs["q1"]
    ball.location = (-6.0, 0.0, 0.0)
    silver = bpy.data.materials.new("MoonSilver"); silver.use_nodes = True
    silver.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.9, 0.9, 0.92, 1)
    silver.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 1.0
    black = bpy.data.materials.new("MoonBlack"); black.use_nodes = True
    black.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.02, 0.02, 0.02, 1)
    ball.data.materials.append(silver)
    ball.data.materials.append(black)
    for poly in ball.data.polygons:
        # half the sphere black: split by local Y (perpendicular to the q1 axle)
        poly.material_index = 1 if poly.center.y < 0 else 0

    # --- frame reference (plates) --------------------------------------------------
    plate_mat = bpy.data.materials.new("PlateBronze"); plate_mat.use_nodes = True
    plate_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.55, 0.38, 0.18, 1)
    plate_mat.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 1.0
    plate_mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.5
    for name, z in (("front_plate", 30.5), ("back_plate", -38.5)):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        pl_me = bpy.data.meshes.new(name)
        bm.to_mesh(pl_me); bm.free()
        pl = bpy.data.objects.new(name, pl_me)
        pl.location = (0, -10.0, z)
        pl.scale = (174.0, 320.0, 1.5)
        c_frame.objects.link(pl)
        pl.data.materials.append(plate_mat)
        pl.hide_set(True)                         # keep the gears visible while iterating
        pl.hide_render = True

    # --- camera + light for quick renders --------------------------------------------
    cam_data = bpy.data.cameras.new("Camera")
    cam = bpy.data.objects.new("Camera", cam_data)
    c_frame.objects.link(cam)
    cam.location = (0, -60, 320)
    cam.rotation_euler = (math.radians(12), 0, 0)
    cam_data.lens = 50
    cam_data.clip_end = 5000
    sc.camera = cam
    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 3.0
    sun = bpy.data.objects.new("Sun", sun_data)
    c_frame.objects.link(sun)
    sun.rotation_euler = (math.radians(35), math.radians(20), 0)

    # --- verification ---------------------------------------------------------------
    report = verify_rig(spec, gears, objs, R, master, pin_slots, chain_ids)
    report["gear_count"] = len(objs)
    report["tris"] = sum(sum(len(p.vertices) - 2 for p in ob.data.polygons) for ob in objs.values())
    dump = {gid: {"teeth": gears[gid]["teeth"], "rate": float(R[gid]), "rate_frac": objs[gid]["am_rate_frac"],
                  "rate_rel": float(objs[gid]["am_rate_rel"]), "frame": objs[gid]["am_frame"],
                  "phase": P[gid], "angle0": O[gid],
                  "pos": [round(v, 5) for v in objs[gid].location]} for gid in objs}
    with open(os.path.join(OUT_DIR, "rig_dump.json"), "w", encoding="utf-8") as fh:
        json.dump({"profile": PROFILE, "gears": dump, "report": report}, fh, indent=1)
    frame_viewport()
    if SAVE:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT_DIR, "antikythera.blend"))
    return report


def frame_viewport(view="TOP", shading="MATERIAL"):
    wm = bpy.context.window_manager
    if not wm.windows:
        return
    win = wm.windows[0]
    for area in win.screen.areas:
        if area.type == "VIEW_3D":
            for region in area.regions:
                if region.type == "WINDOW":
                    with bpy.context.temp_override(window=win, screen=win.screen, area=area, region=region):
                        bpy.ops.view3d.view_axis(type=view)
                        bpy.ops.view3d.view_all()
                    area.spaces[0].shading.type = shading
                    area.spaces[0].clip_end = 10000


def verify_rig(spec, gears, objs, R, master, pin_slots, chain_ids=()):
    """Drive the master and check every linear gear against its exact rate."""
    mism = []
    samples = (0.0, 1.0, 7.3, 19.0, 76.0, 223.0 / 12.3684)
    worst = 0.0

    def set_years(y):
        master["years"] = y
        master.update_tag()
        dg = bpy.context.evaluated_depsgraph_get()
        dg.update()
        return dg

    for y in samples:
        dg = set_years(y)
        for gid, ob in objs.items():
            if gid in pin_slots or gid in chain_ids or gid == "q1" or gears[gid].get("fixed"):
                continue
            car = gears[gid].get("carrier")
            rel = float(R[gid] - (R[car] if car else 0))
            want = -TAU * rel * y
            idx = 0 if gears[gid].get("kind") == "contrate" else 2
            got = ob.evaluated_get(dg).rotation_euler[idx]
            err = abs((got - want + math.pi) % TAU - math.pi)
            worst = max(worst, err)
            if err > 1e-6 + 4e-7 * abs(want):            # rotation_euler is float32
                mism.append((gid, y, got, want))
    # pin-and-slot amplitude check
    amp = {}
    for sid, c in pin_slots.items():
        pin = objs[c["a"]]
        slot = objs[sid]
        dev = []
        for k in range(360):
            dg = set_years(1.0 * k / 360.0 / max(abs(float(R[c["a"]] - R[gears[c["a"]]["carrier"]])), 1e-9))
            d = (slot.evaluated_get(dg).rotation_euler.z - pin.evaluated_get(dg).rotation_euler.z + math.pi) % TAU - math.pi
            dev.append(d)
        amp[sid] = {"max_deg": math.degrees(max(dev)), "min_deg": math.degrees(min(dev)),
                    "expected_deg": math.degrees(math.asin(c["offset_mm"] / c["pin_r_mm"]))}
    # the moon pointer must carry the anomaly: deviation from mean motion bounded by asin(d/r)
    moon_dev = []
    for k in range(200):
        y = 27.55 / 365.24219 * k / 200.0
        dg = set_years(y)
        got = objs["b3"].evaluated_get(dg).rotation_euler.z
        want = -TAU * float(R["b3"]) * y
        moon_dev.append(math.degrees((got - want + math.pi) % TAU - math.pi))
    amp["moon_pointer"] = {"max_deg": max(moon_dev), "min_deg": min(moon_dev),
                           "expected_deg": math.degrees(math.asin(1.1 / 9.67))}
    set_years(0.0)
    return {"linear_gears_checked": len(objs) - len(pin_slots), "worst_error_rad": worst,
            "mismatches": mism[:10], "pin_slot_amplitudes": amp}


result = build()

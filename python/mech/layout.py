"""Place every arbor from data/gears.json.

Distances always come from tooth counts and modules (Freeth 2021 SI 4.1.1:
D = (g1 m1 + g2 m2) / 2 + backlash); the layout_hints only supply directions.

Positions are returned in WORLD mm at crank = 0, plus the frame each arbor is
carried by ('world', 'b1' or 'e3') and its LOCAL offset inside that frame, which
is what the Blender parent hierarchy and the glTF node tree use.
"""
from __future__ import annotations
import math
from dataclasses import dataclass

from .gearprofile import centre_distance


@dataclass
class Arbor:
    id: str
    x: float
    y: float
    frame: str            # 'world' | 'b1' | 'e3'
    lx: float
    ly: float


def _gear_index(spec):
    return {g["id"]: g for g in spec["gears"]}


def _module(g, spec):
    return g.get("module", spec.get("module_default", 0.5))


def _dist(spec, gears, pair):
    a, b = gears[pair[0]], gears[pair[1]]
    return centre_distance(a["teeth"], _module(a, spec), b["teeth"], _module(b, spec),
                           spec.get("backlash_mm", 0.0))


def _circle_intersections(ax, ay, ra, bx, by, rb):
    dx, dy = bx - ax, by - ay
    d = math.hypot(dx, dy)
    if d > ra + rb + 1e-9 or d < abs(ra - rb) - 1e-9 or d == 0:
        raise ValueError(f"circles do not intersect: d={d:.3f} ra={ra:.3f} rb={rb:.3f}")
    a = (ra * ra - rb * rb + d * d) / (2 * d)
    h = math.sqrt(max(ra * ra - a * a, 0.0))
    mx, my = ax + a * dx / d, ay + a * dy / d
    return [(mx + h * dy / d, my - h * dx / d), (mx - h * dy / d, my + h * dx / d)]


def solve_layout(spec) -> dict[str, Arbor]:
    gears = _gear_index(spec)
    hints = spec["layout_hints"]
    spokes = spec.get("spokes_deg", {})
    out: dict[str, Arbor] = {}

    def frame_origin(frame):
        if frame == "world":
            return 0.0, 0.0
        carrier_gear = gears[frame]                     # 'b1' or 'e3'
        arb = out[carrier_gear["arbor"]]
        return arb.x, arb.y

    def angle_of(h):
        a = h.get("angle")
        if "angle_key" in h:
            a = spokes[h["angle_key"]]
        return math.radians(a + h.get("angle_offset", 0.0))

    def put(aid, x, y, frame):
        ox, oy = frame_origin(frame)
        out[aid] = Arbor(aid, x, y, frame, x - ox, y - oy)

    pending = {k: v for k, v in hints.items() if not k.startswith('$')}
    guard = 0
    while pending:
        guard += 1
        if guard > 50:
            raise RuntimeError(f"layout did not converge; unresolved: {sorted(pending)}")
        for aid, h in list(pending.items()):
            kind = h["place"]
            frame = h.get("frame", "world")
            deps = [h.get(k) for k in ("from", "a", "b") if h.get(k)]
            if frame != "world" and gears[frame]["arbor"] not in out:
                continue
            if any(d not in out for d in deps):
                continue
            if kind == "origin":
                put(aid, 0.0, 0.0, frame)
            elif kind == "polar":
                f = out[h["from"]]
                D = _dist(spec, gears, h["mesh"])
                a = angle_of(h)
                put(aid, f.x + D * math.cos(a), f.y + D * math.sin(a), frame)
            elif kind == "polar_r":
                f = out[h["from"]]
                a = angle_of(h)
                put(aid, f.x + h["r"] * math.cos(a), f.y + h["r"] * math.sin(a), frame)
            elif kind == "polar_x":
                f = out[h["from"]]
                D = _dist(spec, gears, h["mesh"])
                x = h["x"]
                dy = math.sqrt(D * D - (x - f.x) ** 2)
                y = f.y - dy if h.get("side", "down") == "down" else f.y + dy
                put(aid, x, y, frame)
            elif kind == "offset":
                f = out[h["from"]]
                if "dr" in h:                              # radial, away from the frame origin
                    ox, oy = frame_origin(frame)
                    ang = math.atan2(f.y - oy, f.x - ox)
                    put(aid, f.x + h["dr"] * math.cos(ang), f.y + h["dr"] * math.sin(ang), frame)
                else:
                    put(aid, f.x + h.get("dx", 0.0), f.y + h.get("dy", 0.0), frame)
            elif kind == "intersect":
                A, B = out[h["a"]], out[h["b"]]
                ra = _dist(spec, gears, h["mesh_a"])
                rb = h["rb"] if "rb" in h else _dist(spec, gears, h["mesh_b"])
                cands = _circle_intersections(A.x, A.y, ra, B.x, B.y, rb)
                if "near" in h:
                    nx, ny = h["near"]
                    ox, oy = frame_origin(frame)
                    nx, ny = nx + ox, ny + oy
                    pick = min(cands, key=lambda p: math.hypot(p[0] - nx, p[1] - ny))
                else:
                    ang = h.get("near_angle")
                    if "near_angle_key" in h:
                        ang = spokes[h["near_angle_key"]]
                    ang = math.radians(ang)
                    ox, oy = frame_origin(frame)
                    pick = min(cands, key=lambda p: abs((math.atan2(p[1] - oy, p[0] - ox) - ang + math.pi) % (2 * math.pi) - math.pi))
                put(aid, pick[0], pick[1], frame)
            else:
                raise ValueError(kind)
            del pending[aid]
    return out


def check_meshes(spec, layout, tol=1e-6) -> list[str]:
    """Every declared mesh pair must sit at exactly its computed centre distance."""
    gears = _gear_index(spec)
    problems = []
    for a, b in spec["meshes"]:
        ga, gb = gears[a], gears[b]
        if ga.get("kind") == "contrate" or gb.get("kind") == "contrate":
            continue                                    # crown gears mesh at right angles; checked separately
        pa, pb = layout[ga["arbor"]], layout[gb["arbor"]]
        want = _dist(spec, gears, (a, b))
        got = math.hypot(pa.x - pb.x, pa.y - pb.y)
        if abs(got - want) > tol:
            problems.append(f"{a}~{b}: centre distance {got:.4f} != {want:.4f}")
        if abs(ga["z"] - gb["z"]) > 1e-9:
            problems.append(f"{a}~{b}: not coplanar (z {ga['z']} vs {gb['z']})")
    return problems


def check_clearances(spec, layout) -> list[str]:
    """Non-meshing gears sharing a plane must not overlap (tip circles)."""
    gears = _gear_index(spec)
    meshed = {frozenset(p) for p in spec["meshes"]}
    ids = [g["id"] for g in spec["gears"] if g.get("kind") != "contrate"]
    problems = []
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            ga, gb = gears[a], gears[b]
            if abs(ga["z"] - gb["z"]) >= (ga["thick"] + gb["thick"]) / 2:
                continue
            if frozenset((a, b)) in meshed or ga["arbor"] == gb["arbor"]:
                continue
            pa, pb = layout[ga["arbor"]], layout[gb["arbor"]]
            d = math.hypot(pa.x - pb.x, pa.y - pb.y)
            tips = (ga["teeth"] * _module(ga, spec) + gb["teeth"] * _module(gb, spec)) / 2 + 1.0 * (_module(ga, spec) + _module(gb, spec))
            same_axis = d < 1e-6
            if same_axis:
                continue                                    # nested tubes: concentric by design
            if d < tips:
                problems.append(f"{a} and {b} overlap in plane z={ga['z']}: d={d:.2f} < {tips:.2f}")
    return problems

"""2-D tooth outlines for the gear generator (pure Python, unit-tested; the
Blender side only extrudes what this returns).

Tooth 0 is centred on local +X. `phase` rotates the whole outline so that a
train's teeth interleave; it is baked into the vertices, never into the object.

Profiles
  triangular  the Antikythera form: hand-filed near-triangles. Measured tooth
              height (tip - root) on the surviving gears is 0.6-1.3 mm at module
              ~0.5, i.e. about 1.8 modules; the included angle comes out ~80 deg.
              A small root land and tip land keep the geometry clean.
  involute    modern 20 deg pressure-angle involute, for the "what if they had
              had it" toggle.
"""
from __future__ import annotations
import math

TAU = 2 * math.pi


def pitch_radius(teeth: int, module: float) -> float:
    return module * teeth / 2


def centre_distance(n_a: int, m_a: float, n_b: int, m_b: float, backlash: float = 0.0) -> float:
    """Freeth 2021 SI 4.1.1: (g1 m1 + g2 m2) / 2, plus a loose-mesh allowance."""
    return (n_a * m_a + n_b * m_b) / 2 + backlash


def triangular_outline(teeth: int, module: float, phase: float = 0.0,
                       tooth_height: float | None = None, tip_r: float | None = None,
                       root_r: float | None = None, root_land: float = 0.18,
                       tip_land: float = 0.10) -> list[tuple[float, float]]:
    """Polygon (x, y) counter-clockwise, 4 points per tooth."""
    rp = pitch_radius(teeth, module)
    h = tooth_height if tooth_height is not None else 1.8 * module
    ra = tip_r if tip_r is not None else rp + h / 2
    rf = root_r if root_r is not None else rp - h / 2
    p = TAU / teeth
    pts = []
    for k in range(teeth):
        c = phase + k * p
        pts.append((rf * math.cos(c - p / 2 + root_land * p / 2), rf * math.sin(c - p / 2 + root_land * p / 2)))
        pts.append((ra * math.cos(c - tip_land * p / 2), ra * math.sin(c - tip_land * p / 2)))
        pts.append((ra * math.cos(c + tip_land * p / 2), ra * math.sin(c + tip_land * p / 2)))
        pts.append((rf * math.cos(c + p / 2 - root_land * p / 2), rf * math.sin(c + p / 2 - root_land * p / 2)))
    return pts


def involute_outline(teeth: int, module: float, phase: float = 0.0, pressure_deg: float = 20.0,
                     samples: int = 8) -> list[tuple[float, float]]:
    """Standard involute spur gear outline, counter-clockwise."""
    alpha = math.radians(pressure_deg)
    rp = pitch_radius(teeth, module)
    rb = rp * math.cos(alpha)
    ra = rp + 1.0 * module
    rf = rp - 1.25 * module
    p = TAU / teeth

    def inv(a):
        return math.tan(a) - a

    # half tooth thickness angle at the base circle
    psi_b = p / 4 + inv(alpha)
    r_start = max(rf, rb)
    t0 = math.sqrt(max((r_start / rb) ** 2 - 1, 0.0))
    t1 = math.sqrt((ra / rb) ** 2 - 1)
    flank = []                                   # (r, theta) from root to tip, right flank
    if rf < rb:
        flank.append((rf, psi_b))
    for i in range(samples + 1):
        t = t0 + (t1 - t0) * i / samples
        r = rb * math.sqrt(1 + t * t)
        theta = psi_b - (t - math.atan(t))
        flank.append((r, theta))
    pts = []
    for k in range(teeth):
        c = phase + k * p
        # root land at the leading edge of the tooth space
        pts.append((rf * math.cos(c - p / 2), rf * math.sin(c - p / 2)))
        for r, th in flank:                      # right flank: theta decreasing... mirror first
            pass
        left = [(r, c - th) for r, th in flank]           # root -> tip
        right = [(r, c + th) for r, th in reversed(flank)]  # tip -> root
        for r, th in left + right:
            pts.append((r * math.cos(th), r * math.sin(th)))
    return pts


def outline(profile: str, teeth: int, module: float, phase: float = 0.0, **kw) -> list[tuple[float, float]]:
    if profile == "triangular":
        return triangular_outline(teeth, module, phase, **kw)
    if profile == "involute":
        return involute_outline(teeth, module, phase, **kw)
    raise ValueError(profile)


def mesh_phase(n_a: int, theta_a: float, n_b: int, bearing_ab: float) -> float:
    """Angle for gear B so that a tooth of A pointing at B meets a gap of B.

    theta = angle of tooth 0 (local +X) in the common frame; bearing_ab = direction
    from A's centre to B's centre. Derivation: A's tooth nearest the line of
    centres sits at angular offset (theta_a - bearing) mod pitch_a from the
    line; B's nearest gap must sit at the mirrored offset, scaled by n_a/n_b.
    """
    pa, pb = TAU / n_a, TAU / n_b
    off_a = (theta_a - bearing_ab + pa / 2) % pa - pa / 2      # tooth offset from the line of centres, in (-pa/2, pa/2]
    # B looks back along bearing + pi; a gap (half pitch from a tooth) must be at -off_a * n_a/n_b from that line
    return (bearing_ab + math.pi) + pb / 2 - off_a * n_a / n_b


def tooth_angle_error(n_a: int, theta_a: float, n_b: int, theta_b: float, bearing_ab: float) -> float:
    """How far (radians, in B's tooth pitch) B is from the ideal interleave. 0 = perfect."""
    ideal = mesh_phase(n_a, theta_a, n_b, bearing_ab)
    pb = TAU / n_b
    return (theta_b - ideal + pb / 2) % pb - pb / 2

import math
from mech.gearprofile import (triangular_outline, involute_outline, centre_distance,
                              mesh_phase, tooth_angle_error, pitch_radius)


def radii(pts):
    return [math.hypot(x, y) for x, y in pts]


def test_triangular_counts_and_radii():
    pts = triangular_outline(223, 0.578)
    assert len(pts) == 223 * 4
    r = radii(pts)
    rp = pitch_radius(223, 0.578)
    assert abs(max(r) - (rp + 0.9 * 0.578)) < 1e-9
    assert abs(min(r) - (rp - 0.9 * 0.578)) < 1e-9


def test_triangular_measured_radii_override():
    pts = triangular_outline(223, 0.578, tip_r=65.0, root_r=63.8)     # b1, Table S8
    r = radii(pts)
    assert abs(max(r) - 65.0) < 1e-9 and abs(min(r) - 63.8) < 1e-9


def test_outline_is_ccw_and_simple():
    pts = triangular_outline(15, 0.5)
    area = 0.0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
        area += x0 * y1 - x1 * y0
    assert area > 0                              # counter-clockwise
    angles = [math.atan2(y, x) for x, y in pts]
    unwrapped = [angles[0]]
    for a in angles[1:]:
        while a < unwrapped[-1] - 1e-9:
            a += 2 * math.pi
        unwrapped.append(a)
    assert unwrapped[-1] - unwrapped[0] < 2 * math.pi   # monotone in angle -> star-shaped, no self-crossing


def test_involute_basic():
    pts = involute_outline(38, 0.5)
    r = radii(pts)
    assert abs(max(r) - (pitch_radius(38, 0.5) + 0.5)) < 1e-6
    assert abs(min(r) - (pitch_radius(38, 0.5) - 0.625)) < 1e-6


def test_centre_distance():
    assert centre_distance(64, 0.479, 38, 0.517) == (64 * 0.479 + 38 * 0.517) / 2


def test_mesh_phase_interleaves():
    # A tooth of A pointing straight at B must meet a gap of B
    for na, nb in ((64, 38), (223, 48), (15, 53), (50, 50)):
        bearing = 0.7
        theta_a = bearing                            # tooth 0 of A points at B
        theta_b = mesh_phase(na, theta_a, nb, bearing)
        # B's teeth are at theta_b + k*pb; the direction back to A is bearing + pi.
        pb = 2 * math.pi / nb
        off = (bearing + math.pi - theta_b) % pb
        assert abs(off - pb / 2) < 1e-9              # exactly half a pitch from a tooth: a gap
        assert abs(tooth_angle_error(na, theta_a, nb, theta_b, bearing)) < 1e-12


def test_mesh_phase_tracks_rotation():
    # rotating A by one tooth pitch must rotate the ideal B phase by minus one B pitch
    na, nb, bearing = 64, 38, 0.3
    t0 = mesh_phase(na, 0.0, nb, bearing)
    t1 = mesh_phase(na, 2 * math.pi / na, nb, bearing)
    d = (t1 - t0 + math.pi) % (2 * math.pi) - math.pi
    assert abs(d + 2 * math.pi / nb) < 1e-9 or abs(d) < 1e-9

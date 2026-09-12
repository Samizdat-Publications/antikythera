import math
from mech.ratios import load
from mech.layout import solve_layout, check_meshes, check_clearances

SPEC = load()
L = solve_layout(SPEC)


def test_every_arbor_placed():
    arbors = {g["arbor"] for g in SPEC["gears"]}
    missing = sorted(a for a in arbors if a not in L)
    assert not missing, missing


def test_mesh_distances_exact():
    assert check_meshes(SPEC, L) == []


def test_dial_centres_on_vertical_axis():
    assert abs(L["n"].x) < 1e-9 and L["n"].y > 0        # Metonic dial, upper back
    assert abs(L["g"].x) < 1e-9 and L["g"].y < 0        # Saros dial, lower back


def test_pin_slot_offsets():
    assert abs(math.hypot(L["k2"].x - L["k1"].x, L["k2"].y - L["k1"].y) - 1.1) < 1e-9
    assert abs(math.hypot(L["sa3"].x - L["sa4"].x, L["sa3"].y - L["sa4"].y) - 1.50) < 1e-9
    assert abs(math.hypot(L["ju3"].x - L["ju4"].x, L["ju3"].y - L["ju4"].y) - 1.58) < 1e-9
    assert abs(math.hypot(L["ma3"].x - L["ma4"].x, L["ma3"].y - L["ma4"].y) - 6.58) < 1e-9


def test_epicycle_radii_match_table_s9():
    assert abs(math.hypot(L["me3"].lx, L["me3"].ly) - 36.0) < 1e-9
    assert abs(math.hypot(L["ve3"].lx, L["ve3"].ly) - 27.8) < 1e-9
    assert abs(math.hypot(L["nodes"].lx, L["nodes"].ly) - 26.851) < 1e-9   # (49+62)/2*0.482 + 0.1 backlash; Freeth: 27.0


def test_frames():
    assert L["k1"].frame == "e3" and L["nodes"].frame == "b1" and L["c"].frame == "world"
    assert abs(L["k1"].lx - (L["k1"].x - L["e"].x)) < 1e-12


def test_no_overlaps():
    assert check_clearances(SPEC, L) == []

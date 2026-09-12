"""Every pointer rate the mechanism is supposed to compute, as an exact fraction.
Sources: Freeth 2006 Supp. Notes 3; Freeth & Jones 2012; Freeth 2021 Fig. 3 / S23."""
from fractions import Fraction as F
from mech.ratios import load, solve

SPEC = load()
R = solve(SPEC)


def rel(gear, frame):
    return R[gear] - R[frame]


def test_lunar_and_calendar_trains():
    assert R["b1"] == 1
    assert R["b3"] == F(254, 19)                  # sidereal moon
    assert R["e2"] == -F(254, 19)                 # e-axis turns the other way; e1~b3 restores the sense
    assert R["e3"] == F(-477, 4237)               # lunar apsides, 8.88 yr
    # Back-dial pointers are read from the BACK; "clockwise seen from the front" is
    # therefore anticlockwise on the back dials. Metonic/Saros/Callippic spirals run
    # clockwise on the back plate -> negative here; the Games dial is the only one that
    # runs anticlockwise on the back -> positive here.
    assert R["n1"] == F(-5, 19)                   # Metonic pointer, 5 turns / 19 yr
    assert R["g1"] == F(-940, 4237)               # Saros pointer, 4 turns / 223 months
    assert R["g1"] == -F(4, 223) * F(235, 19)
    assert R["i1"] == R["g1"] / 12                # Exeligmos: 1 turn per 3 Saros
    assert R["o1"] == F(1, 4)                     # Games dial
    assert R["cal1"] == F(-1, 76)                 # Callippic


def test_pin_and_slot_platform():
    # the pin-and-slot pair k1/k2 rides on e3; relative to e3 it turns once per anomalistic month
    assert R["k1"] == R["k2"]
    assert rel("k1", "e3") == F(239, 223) * F(235, 19)   # anomalistic months per year = 56165/4237
    assert R["e6"] == -F(254, 19)                 # mean motion restored on the inner shaft


def test_phase_ball_differential():
    # q1 rides on the moon pointer; relative to it, one turn per synodic month
    assert R["b0"] == 1
    assert rel("q1", "b3") == F(235, 19)


def test_front_cosmos_trains():
    assert R["nod48"] == F(-5, 93)                # Dragon Hand, 18.6 yr regression
    assert rel("me20", "b1") == F(1513, 480)      # Mercury epicycle
    assert rel("r1", "b1") == F(289, 462)         # Venus epicycle (Fragment D gear)
    assert rel("ma71", "b1") == F(133, 284)       # Mars pin gear
    assert rel("ju43", "b1") == F(315, 344)       # Jupiter pin gear
    assert rel("sa68", "b1") == F(427, 442)       # Saturn pin gear
    # outputs: the slot gear turns at the pin gear's mean rate; the equal output gear reverses it
    assert R["ma80b"] == 1 - F(133, 284)
    assert R["ju65b"] == 1 - F(315, 344)
    assert R["sa86b"] == 1 - F(427, 442)
    # true sun epicycle: absolute rotation zero (fixed apogee)
    assert R["su56"] == 0


def test_expected_rates_block_matches_solver():
    exp = SPEC["expected_rates"]
    for gid in ("b1", "b3", "e3", "n1", "g1", "i1", "o1", "cal1", "nod48"):
        assert R[gid] == F(exp[gid])


def test_synodic_periods_against_modern():
    year = 365.24219
    for pin, frac, modern in (("ma71", F(133, 284), 779.94), ("ju43", F(315, 344), 398.88),
                              ("sa68", F(427, 442), 378.09), ("me20", F(1513, 480), 115.88),
                              ("r1", F(289, 462), 583.92)):
        assert abs(year / float(frac) - modern) < 0.06

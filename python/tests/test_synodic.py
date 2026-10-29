"""The synodic events engraved on the planet rings (Freeth 2021 Fig. 7, 8)."""
from mech.ratios import load
from mech.synodic import all_marks, epicycle_ratio, INDEX_LETTERS

SPEC = load()
M = all_marks(SPEC)


def ev(planet, name):
    return next(m for m in M[planet] if m.event == name)


def test_one_alphabet_for_all_24_events():
    assert sum(len(v) for v in M.values()) == 24
    letters = [m.letter for v in M.values() for m in v]
    assert letters == list("ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ")
    assert len(INDEX_LETTERS) == 24


def test_epicycle_ratios_come_from_the_devices():
    assert abs(epicycle_ratio(SPEC, "mars") - 6.58 / 10.0) < 1e-12
    assert abs(epicycle_ratio(SPEC, "venus") - 20.01 / 27.8) < 1e-12


def test_inner_planets_greatest_elongations():
    # max elongation = asin(k)
    assert abs(ev("venus", "greatest_elongation_east").eps_deg - 46.0) < 0.2
    assert abs(ev("mercury", "greatest_elongation_east").eps_deg - 23.0) < 0.2
    for p in ("mercury", "venus"):
        e = ev(p, "greatest_elongation_east").eps_deg
        assert abs(ev(p, "greatest_elongation_west").eps_deg + e) < 1e-9
        # the stations lie between greatest elongation and inferior conjunction
        assert 0 < ev(p, "first_station").eps_deg < e


def test_outer_planets_stations_and_opposition():
    for p, lo, hi in (("mars", 130, 140), ("jupiter", 110, 120), ("saturn", 105, 112)):
        s1, s2 = ev(p, "first_station").eps_deg, ev(p, "second_station").eps_deg
        assert -hi < s1 < -lo and lo < s2 < hi           # morning station west of the Sun, evening east
        assert abs(abs(ev(p, "opposition").eps_deg) - 180.0) < 1e-9
        assert ev(p, "conjunction").eps_deg == 0.0

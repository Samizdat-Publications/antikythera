from mech.jd import (julian_to_jdn, jdn_to_julian, gregorian_to_jdn, jdn_to_gregorian,
                     civil_to_jdn, jdn_to_civil, format_year)


def meeus_julian_jd0h(y, m, d):
    # Meeus, Astronomical Algorithms ch. 7, Julian calendar branch (B = 0)
    import math
    if m <= 2:
        y, m = y - 1, m + 12
    return math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + d - 1524.5


def test_epochs():
    # Carman & Evans 2014: full moon of 12 May 205 BC; Voulgaris 2022: 22 Dec 178 BC
    for y, m, d, jdn in ((-204, 5, 12, 1646679), (-177, 12, 22, 1656764)):
        assert julian_to_jdn(y, m, d) == jdn
        assert meeus_julian_jd0h(y, m, d) + 0.5 == jdn


def test_roundtrip_julian():
    for jdn in range(1_600_000, 2_500_000, 9973):
        y, m, d = jdn_to_julian(jdn)
        assert julian_to_jdn(y, m, d) == jdn


def test_roundtrip_gregorian():
    assert gregorian_to_jdn(2000, 1, 1) == 2451545
    for jdn in range(2_299_161, 2_600_000, 7919):
        y, m, d = jdn_to_gregorian(jdn)
        assert gregorian_to_jdn(y, m, d) == jdn


def test_calendar_switch():
    assert civil_to_jdn(1582, 10, 4) + 1 == civil_to_jdn(1582, 10, 15)
    assert jdn_to_civil(2299160) == (1582, 10, 4, "julian")
    assert jdn_to_civil(2299161) == (1582, 10, 15, "gregorian")


def test_year_labels():
    assert format_year(-204) == "205 BC"
    assert format_year(0) == "1 BC"
    assert format_year(2026) == "2026 AD"

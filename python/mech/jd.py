"""Julian Day Number <-> calendar conversions.

Conventions (astronomical):
  * years are astronomical: 1 BC = 0, 2 BC = -1, 205 BC = -204
  * dates before 1582-10-15 are proleptic JULIAN calendar; after, Gregorian
  * JDN is the integer day number at NOON; JD floats carry the fraction
Only floor division is used, never truncation (which breaks for negative years).
"""
from __future__ import annotations

J2000 = 2451545.0                     # 2000 Jan 1.5 TT
GREGORIAN_START_JDN = 2299161          # 1582 Oct 15 (Gregorian)


def julian_to_jdn(year: int, month: int, day: int) -> int:
    """Proleptic Julian calendar date -> JDN (noon)."""
    a = (14 - month) // 12
    y = year + 4800 - a
    m = month + 12 * a - 3
    return day + (153 * m + 2) // 5 + 365 * y + y // 4 - 32083


def gregorian_to_jdn(year: int, month: int, day: int) -> int:
    a = (14 - month) // 12
    y = year + 4800 - a
    m = month + 12 * a - 3
    return day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045


def jdn_to_julian(jdn: int) -> tuple[int, int, int]:
    c = jdn + 32082
    d = (4 * c + 3) // 1461
    e = c - (1461 * d) // 4
    m = (5 * e + 2) // 153
    day = e - (153 * m + 2) // 5 + 1
    month = m + 3 - 12 * (m // 10)
    year = d - 4800 + m // 10
    return year, month, day


def jdn_to_gregorian(jdn: int) -> tuple[int, int, int]:
    a = jdn + 32044
    b = (4 * a + 3) // 146097
    c = a - (146097 * b) // 4
    d = (4 * c + 3) // 1461
    e = c - (1461 * d) // 4
    m = (5 * e + 2) // 153
    day = e - (153 * m + 2) // 5 + 1
    month = m + 3 - 12 * (m // 10)
    year = 100 * b + d - 4800 + m // 10
    return year, month, day


def civil_to_jdn(year: int, month: int, day: int) -> int:
    """Historical civil calendar: Julian before 1582-10-15, Gregorian after."""
    if (year, month, day) >= (1582, 10, 15):
        return gregorian_to_jdn(year, month, day)
    return julian_to_jdn(year, month, day)


def jdn_to_civil(jdn: int) -> tuple[int, int, int, str]:
    if jdn >= GREGORIAN_START_JDN:
        return (*jdn_to_gregorian(jdn), "gregorian")
    return (*jdn_to_julian(jdn), "julian")


def jd_from_civil(year: int, month: int, day: int, hour: float = 0.0) -> float:
    """Full JD for a civil date and UT hour (0-24). Noon is JDN exactly."""
    return civil_to_jdn(year, month, day) - 0.5 + hour / 24.0


def format_year(year: int) -> str:
    """Astronomical year -> historians' label."""
    return f"{year} AD" if year > 0 else f"{1 - year} BC"


def days_since_j2000(jd: float) -> float:
    return jd - J2000

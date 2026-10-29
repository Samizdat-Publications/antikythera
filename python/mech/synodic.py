"""Where each planet's synodic events fall on its ring, for the scale marks and
index letters of Freeth et al. 2021 (Fig. 7, Fig. 8).

The rings turn with the planets; the true-Sun pointer sweeps over them. At each
synodic event the planet stands at a characteristic angle from the Sun, so the
Sun pointer stands at a fixed place on the planet's ring: that is where the
maker would engrave the scale mark. The place is the elongation
    eps = lambda_planet - lambda_sun
measured from the ring's stone, clockwise seen from the front positive (the
machine's sense, as in ratios.py).

Each planet module of the 2021 model is an epicycle in mechanical form (a
pin-and-slot for the superior planets, a pin-and-follower for Mercury and
Venus), so the events follow from two numbers per planet: the epicycle ratio
k, read off the device's dimensions in data/gears.json, and the mean rates,
read off the gear trains. With a mean Sun (the scale marks are a property of
the ring, not of any one cycle):

    superior:  gamma = lam_sun - lam_mean,   lam = lam_mean + E(gamma)
    inferior:  gamma = lam_helio - lam_sun,  lam = lam_sun  + E(gamma)
    E(gamma) = atan2(k sin gamma, 1 + k cos gamma)

The 24 events (six for each inner planet, four for each outer one) are as many
as the letters of one Greek alphabet, which is how Fig. 8 of the 2021 paper
describes its index-letter scheme ("a single Greek alphabet from A to Omega").
The order of the letters here is provisional: see INDEX_LETTERS.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from fractions import Fraction as F

from .ratios import load, solve

TAU = 2 * math.pi

# planet -> (device kind, the coupling's pin gear, the pointer whose mean rate is the planet's)
DEVICES = {
    "mercury": ("inferior", "me20", "mercury_ptr"),
    "venus": ("inferior", "r1", "venus_ptr"),
    "mars": ("superior", "ma71", "ma80b"),
    "jupiter": ("superior", "ju43", "ju65b"),
    "saturn": ("superior", "sa68", "sa86b"),
}
ORDER = ["mercury", "venus", "mars", "jupiter", "saturn"]

# Events in the order they happen in one synodic cycle, starting at conjunction.
EVENTS = {
    "inferior": ["superior_conjunction", "greatest_elongation_east", "first_station",
                 "inferior_conjunction", "second_station", "greatest_elongation_west"],
    "superior": ["conjunction", "first_station", "opposition", "second_station"],
}

# Provisional index letters: one alphabet, planets from the inside out (the order of the
# Front Cover Inscription as the 2021 paper reads it, Mercury first), each planet's events in
# the order of its synodic cycle from conjunction. Fig. 8 of the paper gives the actual
# assignment; replace this table from it.
_ALPHABET = list("ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ")


def _index_letters() -> dict[tuple[str, str], str]:
    out, i = {}, 0
    for p in ORDER:
        for e in EVENTS[DEVICES[p][0]]:
            out[(p, e)] = _ALPHABET[i]
            i += 1
    return out


INDEX_LETTERS = _index_letters()
INDEX_LETTERS_PROVISIONAL = True


@dataclass(frozen=True)
class Mark:
    planet: str
    event: str
    eps_deg: float          # elongation of the planet from the Sun, clockwise from the front positive
    letter: str


def epicycle_ratio(spec: dict, planet: str) -> float:
    kind, pin, _ = DEVICES[planet]
    c = next(c for c in spec["couplings"] if c.get("a") == pin and c["type"] in ("pin_slot", "pin_follower"))
    if kind == "superior":
        return c["offset_mm"] / c["pin_r_mm"]
    return c["pin_r_mm"] / c["centre_r_mm"]


def mean_rates(spec: dict, planet: str, R: dict | None = None) -> tuple[F, F]:
    """(mean rate of the planet's pointer, rate of the epicycle's driver), rotations per year."""
    R = R or solve(spec)
    kind, pin, ptr = DEVICES[planet]
    return R[ptr], R[pin]


def _E(g: float, k: float) -> float:
    return math.atan2(k * math.sin(g), 1 + k * math.cos(g))


def _dE(g: float, k: float) -> float:
    return k * (k + math.cos(g)) / (1 + 2 * k * math.cos(g) + k * k)


def _wrap(a: float) -> float:
    return (a + math.pi) % TAU - math.pi


def _bisect(f, a: float, b: float, n: int = 80) -> float:
    fa = f(a)
    for _ in range(n):
        m = 0.5 * (a + b)
        fm = f(m)
        if (fm > 0) == (fa > 0):
            a, fa = m, fm
        else:
            b = m
    return 0.5 * (a + b)


def _roots(f, lo: float, hi: float, n: int = 3600) -> list[float]:
    xs = [lo + (hi - lo) * i / n for i in range(n + 1)]
    out = []
    for a, b in zip(xs, xs[1:]):
        if (f(a) > 0) != (f(b) > 0):
            out.append(_bisect(f, a, b))
    return out


def events(planet: str, spec: dict | None = None) -> list[Mark]:
    """The planet's synodic events as places on its ring, in the order they happen."""
    spec = spec or load()
    kind = DEVICES[planet][0]
    k = epicycle_ratio(spec, planet)
    n_ptr, n_pin = mean_rates(spec, planet)
    sun = 1.0                                                      # mean Sun, b1
    if kind == "superior":
        n_mean = float(n_ptr)
        n_g = sun - n_mean                                         # gamma = sun - mean planet

        def eps(g):                                                # elongation planet - sun
            return _wrap(-g + _E(g, k))

        def speed(g):
            return n_mean + _dE(g, k) * n_g
        st = sorted(_roots(speed, 0.0, TAU))                       # retrograde arc is centred on gamma = pi
        gs = {"conjunction": 0.0, "first_station": st[0], "opposition": math.pi, "second_station": st[1]}
    else:
        n_g = float(n_pin) - sun                                   # gamma = helio - sun

        def eps(g):
            return _wrap(_E(g, k))

        def speed(g):
            return sun + _dE(g, k) * n_g
        st = sorted(_roots(speed, 0.0, TAU))
        # E has its extremes where dE = 0, i.e. cos g = -k
        ge = math.acos(-k)
        gs = {"superior_conjunction": 0.0, "greatest_elongation_east": ge, "first_station": st[0],
              "inferior_conjunction": math.pi, "second_station": st[1], "greatest_elongation_west": TAU - ge}
    out = []
    for e in EVENTS[kind]:
        g = gs[e]
        out.append(Mark(planet, e, math.degrees(eps(g)), INDEX_LETTERS[(planet, e)]))
    return out


def all_marks(spec: dict | None = None) -> dict[str, list[Mark]]:
    spec = spec or load()
    return {p: events(p, spec) for p in ORDER}


if __name__ == "__main__":
    for p, ms in all_marks().items():
        print(p, [(m.event, round(m.eps_deg, 1), m.letter) for m in ms])

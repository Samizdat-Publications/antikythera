"""Freeth 2014 "Eclipse Year Model" (PLOS ONE 9(7): e103275, CC-BY).

Integer arithmetic on the Saros dial's 223 months:
  * 1 synodic month = 38 eclipse-year units (EYu); 1 eclipse year = 446 EYu
  * months start at first crescent; Full Moon at +17, New Moon at +36
  * node points at NODE1 and NODE1 + 223 EYu (paper: 66 and 289); the first is
    the descending node
  * lunar glyph (Sigma) if the Full Moon is within LUNAR_WINDOW of a node
  * solar glyph (Eta) if the New Moon is within SOLAR_NORTH north or SOLAR_SOUTH
    south of a node; which side counts as north swaps between the ascending
    and descending node
  * a lunar glyph in the month right after another lunar glyph is dropped
Result must be 51 glyph cells: 38 lunar, 28 solar (Freeth 2014).
"""
from __future__ import annotations
from dataclasses import dataclass

EYU_PER_MONTH = 38
EYU_PER_ECLIPSE_YEAR = 446
NODE_SPACING = 223
FULL_MOON_OFFSET = 17
NEW_MOON_OFFSET = 36
LUNAR_WINDOW = 20
SOLAR_NORTH = 20
SOLAR_SOUTH = 7
NODE1_DEFAULT = 66
MONTHS = 223


@dataclass(frozen=True)
class Glyph:
    month: int            # 1..223, Saros dial cell
    lunar: bool           # Sigma
    solar: bool           # Eta
    fm_dist: int          # signed EYu distance of the Full Moon from its nearest node
    nm_dist: int
    fm_node: str          # A ascending / D descending
    nm_node: str


def _nearest_node(pos: int, node1: int) -> tuple[int, str]:
    """Signed distance (pos - node) to the nearest node point, and which node."""
    best = None
    k0 = pos // EYU_PER_ECLIPSE_YEAR
    for k in (k0 - 1, k0, k0 + 1):
        for node, kind in ((node1 + EYU_PER_ECLIPSE_YEAR * k, "D"),
                           (node1 + NODE_SPACING + EYU_PER_ECLIPSE_YEAR * k, "A")):
            d = pos - node
            if best is None or abs(d) < abs(best[0]):
                best = (d, kind)
    return best


def _solar_hit(dist: int, node: str) -> bool:
    # At the ascending node positive distance is "north"; at the descending node
    # the sense is reversed. (Calibrated so 28 solar glyphs result.)
    north, south = (SOLAR_NORTH, SOLAR_SOUTH) if node == "A" else (SOLAR_SOUTH, SOLAR_NORTH)
    return (0 <= dist <= north) or (-south <= dist < 0)


def glyph_table(node1: int = NODE1_DEFAULT, drop_consecutive_lunar: bool = True) -> list[Glyph]:
    out: list[Glyph] = []
    last_lunar_month = -10
    for m in range(1, MONTHS + 1):
        start = EYU_PER_MONTH * (m - 1)
        fm_d, fm_n = _nearest_node(start + FULL_MOON_OFFSET, node1)
        nm_d, nm_n = _nearest_node(start + NEW_MOON_OFFSET, node1)
        lunar = abs(fm_d) <= LUNAR_WINDOW
        if lunar and drop_consecutive_lunar and m == last_lunar_month + 1:
            lunar = False
        solar = _solar_hit(nm_d, nm_n)
        if lunar:
            last_lunar_month = m
        if lunar or solar:
            out.append(Glyph(m, lunar, solar, fm_d, nm_d, fm_n, nm_n))
    return out


def counts(glyphs: list[Glyph]) -> tuple[int, int, int]:
    return len(glyphs), sum(g.lunar for g in glyphs), sum(g.solar for g in glyphs)

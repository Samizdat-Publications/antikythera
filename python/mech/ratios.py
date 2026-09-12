"""Exact mean-motion solver for a gear graph loaded from data/gears.json.

Every rotating part gets a rate in rotations per year (b1 = +1, clockwise seen
from the front is positive, exactly as the AMRP papers count). Rates are
fractions.Fraction so the results are exact rationals (254/19, 940/4237, ...).

Graph elements (see data/gears.json):
  gears[]      id, teeth, arbor, carrier (id of the rotating part that carries
               the arbor, or null for the frame), fixed (true = riveted to the
               frame: rate 0 in the world)
  meshes[]     [a, b]                 external spur/contrate mesh
  couplings[]  {type: same_arbor|pin_slot|pin_follower|bar, a, b, ...}
               same_arbor  : b turns with a
               pin_slot    : mean rate of b equals a (in their common carrier frame)
               pin_follower: mean rate of the follower equals the carrier rate
               bar         : rigid link, same as same_arbor

A mesh is evaluated in the frame of the carrier that holds the epicyclic gear
(the one whose arbor moves); a grounded gear seen from that frame rotates at
minus the carrier rate. That single rule covers plain trains, e3's lunar
platform and the planetary modules.
"""
from __future__ import annotations
import json
from fractions import Fraction as F
from pathlib import Path

DATA = Path(__file__).resolve().parents[2] / "data" / "gears.json"


def load(path: Path | str = DATA) -> dict:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def solve(spec: dict, root: str = "b1", root_rate: F = F(1)) -> dict[str, F]:
    gears = {g["id"]: g for g in spec["gears"]}
    for f in spec.get("followers", []):
        gears[f["id"]] = {"id": f["id"], "teeth": None, "carrier": f.get("carrier"), "follower": True}
    rates: dict[str, F] = {}
    for g in gears.values():
        if g.get("fixed"):
            rates[g["id"]] = F(0)
    rates[root] = root_rate

    def carrier_rate(gid: str) -> F | None:
        c = gears[gid].get("carrier")
        if c is None:
            return F(0)
        return rates.get(c)

    edges: list[tuple[str, str, dict]] = []
    for a, b in spec["meshes"]:
        edges.append((a, b, {"type": "mesh"}))
    for c in spec.get("couplings", []):
        edges.append((c["a"], c["b"], c))

    progress = True
    while progress:
        progress = False
        for a, b, e in edges:
            for src, dst in ((a, b), (b, a)):
                if src in rates and dst not in rates:
                    r = _propagate(src, dst, e, gears, rates, carrier_rate)
                    if r is not None:
                        rates[dst] = r
                        progress = True
    missing = sorted(set(gears) - set(rates))
    if missing:
        raise ValueError(f"unsolved parts: {missing}")
    return rates


def _propagate(src, dst, e, gears, rates, carrier_rate):
    t = e["type"]
    if t in ("same_arbor", "bar"):
        return rates[src]
    if t == "mesh":
        # frame = carrier of whichever gear is epicyclic (prefer dst's, then src's)
        frame_id = gears[dst].get("carrier") or gears[src].get("carrier")
        fr = F(0) if frame_id is None else rates.get(frame_id)
        if fr is None:
            return None
        rel = rates[src] - fr
        return -rel * F(gears[src]["teeth"], gears[dst]["teeth"]) + fr
    if t == "pin_slot":
        frame_id = gears[dst].get("carrier") or gears[src].get("carrier")
        fr = F(0) if frame_id is None else rates.get(frame_id)
        if fr is None:
            return None
        return rates[src]            # mean 1:1, same carrier
    if t == "pin_follower":
        # the follower pivots on the central axis and tracks a pin on the epicycle;
        # its MEAN rate is the carrier's rate (the epicycle's centre goes round once a year)
        if dst != e["b"]:
            return None                      # never propagate backwards through a follower
        return carrier_rate(e["b"])
    raise ValueError(t)


def pointer_rates(spec: dict, rates: dict[str, F]) -> dict[str, F]:
    return {p["id"]: rates[p["driven_by"]] for p in spec["pointers"]}

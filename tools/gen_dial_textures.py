"""Draw the dial faces as textures, in millimetre coordinates, so that every
inscription lands exactly where the pointers expect it.

    python tools/gen_dial_textures.py

Writes assets/textures/{front_dial,back_upper,back_lower,parapegma_upper,parapegma_lower}.png
plus *_bump.png (white = raised bronze, dark = engraved) and a JSON with the spans used.

Conventions: front textures are drawn as seen from the FRONT (x right, y up).
Back textures are composed as seen from the BACK (so text reads correctly and the
spirals run clockwise, as on the real plate) and then mirrored so the same planar
UV mapping (front-view x, y) applies to every dial.
"""
from __future__ import annotations

import json
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "python"))
from mech.eym import glyph_table  # noqa: E402
from mech.ratios import load  # noqa: E402
from mech.layout import solve_layout  # noqa: E402

OUT = os.path.join(ROOT, "assets", "textures")
os.makedirs(OUT, exist_ok=True)
FONT = "C:/Windows/Fonts/pala.ttf"
FONT_B = "C:/Windows/Fonts/palab.ttf"

BRONZE = (163, 116, 58)
BRONZE_DARK = (118, 82, 38)
INK = (28, 20, 12)              # engraved, wax-filled
RING_EDGE = (78, 54, 26)

ZODIAC = ["ΚΡΙΟΣ", "ΤΑΥΡΟΣ", "ΔΙΔΥΜΟΙ", "ΚΑΡΚΙΝΟΣ", "ΛΕΩΝ", "ΠΑΡΘΕΝΟΣ",
          "ΧΗΛΑΙ", "ΣΚΟΡΠΙΟΣ", "ΤΟΞΟΤΗΣ", "ΑΙΓΟΚΕΡΩΣ", "ΥΔΡΟΧΟΟΣ", "ΙΧΘΥΕΣ"]
EGYPT = ["ΘΩΥΘ", "ΦΑΩΦΙ", "ΑΘΥΡ", "ΧΟΙΑΚ", "ΤΥΒΙ", "ΜΕΧΕΙΡ", "ΦΑΜΕΝΩΘ", "ΦΑΡΜΟΥΘΙ",
         "ΠΑΧΩΝ", "ΠΑΥΝΙ", "ΕΠΕΙΦΙ", "ΜΕΣΟΡΗ"]
CORINTH = ["ΦΟΙΝΙΚΑΙΟΣ", "ΚΡΑΝΕΙΟΣ", "ΛΑΝΟΤΡΟΠΙΟΣ", "ΜΑΧΑΝΕΥΣ", "ΔΩΔΕΚΑΤΕΥΣ", "ΕΥΚΛΕΙΟΣ",
           "ΑΡΤΕΜΙΣΙΟΣ", "ΨΥΔΡΕΥΣ", "ΓΑΜΕΙΛΙΟΣ", "ΑΓΡΙΑΝΙΟΣ", "ΠΑΝΑΜΟΣ", "ΑΠΕΛΛΑΙΟΣ"]
GREEK_LETTERS = list("ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ")
GREEK_NUMERALS = {1: "Α", 2: "Β", 3: "Γ", 4: "Δ", 5: "Ε", 6: "Ϛ", 7: "Ζ", 8: "Η", 9: "Θ", 10: "Ι",
                  11: "ΙΑ", 12: "ΙΒ", 13: "ΙΓ", 14: "ΙΔ", 15: "ΙΕ", 16: "ΙϚ", 17: "ΙΖ", 18: "ΙΗ",
                  19: "ΙΘ", 20: "Κ", 21: "ΚΑ", 22: "ΚΒ", 23: "ΚΓ", 24: "ΚΔ"}
GAMES = [("ΙΣΘΜΙΑ", "ΟΛΥΜΠΙΑ"), ("ΝΕΜΕΑ", "ΝΑΑ"), ("ΙΣΘΜΙΑ", "ΠΥΘΙΑ"), ("ΝΕΜΕΑ", "ΑΛΙΕΙΑ")]

# parapegma: attested lines (Bitsakis & Jones 2016, fragment C) with reconstructed Greek;
# degree positions are schematic (see NOTES.md)
PARAPEGMA_UPPER = [
    ("Α", "ΙΣΗΜΕΡΙΑ ΕΑΡΙΝΗ"), ("Β", "ΠΛΕΙΑΔΕΣ ΔΥΝΟΥΣΙΝ ΕΣΠΕΡΙΑΙ"), ("Γ", "ΥΑΔΕΣ ΔΥΝΟΥΣΙΝ ΕΣΠΕΡΙΑΙ"),
    ("Δ", "ΚΡΙΟΣ ΑΡΧΕΤΑΙ ΕΠΙΤΕΛΛΕΙΝ"), ("Ε", "ΤΑΥΡΟΣ ΑΡΧΕΤΑΙ ΕΠΙΤΕΛΛΕΙΝ"), ("Ζ", "ΛΥΡΑ ΕΠΙΤΕΛΛΕΙ ΕΣΠΕΡΙΑ"),
    ("Η", "ΠΛΕΙΑΣ ΕΠΙΤΕΛΛΕΙ ΕΩΙΑ"), ("Θ", "ΥΑΣ ΕΠΙΤΕΛΛΕΙ ΕΩΙΑ"), ("Ι", "ΔΙΔΥΜΟΙ ΑΡΧΟΝΤΑΙ ΕΠΙΤΕΛΛΕΙΝ"),
    ("Κ", "ΑΕΤΟΣ ΕΠΙΤΕΛΛΕΙ ΕΣΠΕΡΙΟΣ"), ("Λ", "ΑΡΚΤΟΥΡΟΣ ΔΥΝΕΙ ΕΩΙΟΣ"), ("Μ", "ΤΡΟΠΑΙ ΘΕΡΙΝΑΙ"),
]
PARAPEGMA_LOWER = [
    ("Ν", "ΚΥΩΝ ΕΠΙΤΕΛΛΕΙ ΕΩΙΟΣ"), ("Ξ", "ΛΕΩΝ ΑΡΧΕΤΑΙ ΕΠΙΤΕΛΛΕΙΝ"), ("Ο", "ΑΕΤΟΣ ΔΥΝΕΙ ΕΩΙΟΣ"),
    ("Π", "ΑΡΚΤΟΥΡΟΣ ΕΠΙΤΕΛΛΕΙ ΕΩΙΟΣ"), ("Ρ", "ΙΣΗΜΕΡΙΑ ΦΘΙΝΟΠΩΡΙΝΗ"), ("Σ", "ΠΛΕΙΑΔΕΣ ΔΥΝΟΥΣΙΝ ΕΩΙΑΙ"),
    ("Τ", "ΥΑΔΕΣ ΔΥΝΟΥΣΙΝ ΕΩΙΑΙ"), ("Υ", "ΩΡΙΩΝ ΔΥΝΕΙ ΕΩΙΟΣ"), ("Φ", "ΤΡΟΠΑΙ ΧΕΙΜΕΡΙΝΑΙ"),
    ("Χ", "ΛΥΡΑ ΔΥΝΕΙ ΕΩΙΑ"), ("Ψ", "ΑΡΚΤΟΥΡΟΣ ΔΥΝΕΙ ΕΣΠΕΡΙΟΣ"), ("Ω", "ΙΧΘΥΕΣ ΑΡΧΟΝΤΑΙ ΕΠΙΤΕΛΛΕΙΝ"),
]


class Dial:
    """A square texture covering `span` mm centred on (cx, cy) mm."""

    def __init__(self, name, span, px=4096, cx=0.0, cy=0.0, back=False):
        self.name, self.span, self.px, self.cx, self.cy, self.back = name, span, px, cx, cy, back
        self.scale = px / span                        # px per mm
        self.img = Image.new("RGB", (px, px), BRONZE)
        self.bump = Image.new("L", (px, px), 200)
        self.d = ImageDraw.Draw(self.img)
        self.db = ImageDraw.Draw(self.bump)
        self._fonts = {}

    def font(self, mm, bold=False):
        key = (round(mm, 2), bold)
        if key not in self._fonts:
            self._fonts[key] = ImageFont.truetype(FONT_B if bold else FONT, max(6, int(mm * self.scale)))
        return self._fonts[key]

    def P(self, x, y):
        """mm (relative to centre, y up; back dials in BACK-view coordinates) -> px."""
        return ((x) * self.scale + self.px / 2, self.px / 2 - (y) * self.scale)

    def line(self, x0, y0, x1, y1, w_mm=0.12, ink=INK):
        w = max(1, int(w_mm * self.scale))
        self.d.line([self.P(x0, y0), self.P(x1, y1)], fill=ink, width=w)
        self.db.line([self.P(x0, y0), self.P(x1, y1)], fill=40, width=w)

    def arc(self, r, a0, a1, w_mm=0.12, ink=INK):
        """Arc of radius r (mm) from angle a0 to a1 (degrees, ccw, 0 = +x)."""
        box = [self.P(-r, r), self.P(r, -r)]
        w = max(1, int(w_mm * self.scale))
        # PIL angles are clockwise from +x in image coordinates -> negate
        self.d.arc(box, -a1, -a0, fill=ink, width=w)
        self.db.arc(box, -a1, -a0, fill=40, width=w)

    def circle(self, r, w_mm=0.15, ink=INK, fill=None):
        box = [self.P(-r, r), self.P(r, -r)]
        w = max(1, int(w_mm * self.scale))
        self.d.ellipse(box, outline=ink, width=w, fill=fill)
        self.db.ellipse(box, outline=40, width=w, fill=200 if fill else None)

    def text(self, x, y, s, mm, angle=0.0, bold=False, ink=INK, anchor="mm"):
        """Text centred at (x, y) mm, rotated by angle degrees (ccw)."""
        f = self.font(mm, bold)
        bbox = f.getbbox(s)
        w, h = bbox[2] - bbox[0] + 4, bbox[3] - bbox[1] + 4
        tile = Image.new("L", (w, h), 0)
        ImageDraw.Draw(tile).text((-bbox[0] + 2, -bbox[1] + 2), s, font=f, fill=255)
        tile = tile.rotate(angle, expand=True, resample=Image.BICUBIC)
        px, py = self.P(x, y)
        pos = (int(px - tile.width / 2), int(py - tile.height / 2))
        col = Image.new("RGB", tile.size, ink)
        self.img.paste(col, pos, tile)
        dark = Image.new("L", tile.size, 40)
        self.bump.paste(dark, pos, tile)

    def curved_text(self, r, a_center, s, mm, bold=False, ink=INK, inward=False):
        """Letters laid along a circle at radius r, centred on angle a_center (deg ccw)."""
        f = self.font(mm, bold)
        widths = [f.getlength(ch) / self.scale for ch in s]       # mm
        gap = 0.18 * mm
        total = sum(widths) + gap * (len(s) - 1)
        # angular extent
        a = a_center + math.degrees(total / 2 / r) * (1 if not inward else -1)
        for ch, w in zip(s, widths):
            step = math.degrees(w / r)
            am = a - step / 2 * (1 if not inward else -1)
            x, y = r * math.cos(math.radians(am)), r * math.sin(math.radians(am))
            rot = am - 90 if not inward else am + 90
            self.text(x, y, ch, mm, angle=rot, bold=bold, ink=ink)
            a -= (step + math.degrees(gap / r)) * (1 if not inward else -1)

    def finish(self, patina=True):
        if patina:
            # subtle mottling so the bronze does not look flat
            noise = Image.effect_noise((self.px, self.px), 18).filter(ImageFilter.GaussianBlur(3))
            noise = noise.point(lambda v: int(128 + (v - 128) * 0.35))
            self.img = Image.composite(self.img, Image.new("RGB", self.img.size, BRONZE_DARK), noise.point(lambda v: min(255, v + 60)))
        if self.back:
            self.img = self.img.transpose(Image.FLIP_LEFT_RIGHT)
            self.bump = self.bump.transpose(Image.FLIP_LEFT_RIGHT)
        self.img.save(os.path.join(OUT, self.name + ".png"))
        self.bump.filter(ImageFilter.GaussianBlur(0.6)).save(os.path.join(OUT, self.name + "_bump.png"))
        return {"name": self.name, "span_mm": self.span, "px": self.px, "centre_mm": [self.cx, self.cy], "back_view": self.back}


# ------------------------------------------------------------------ front dial
def front_dial(zodiac_r=(55.0, 66.5), cal_r=(67.5, 79.5), calendar_holes=365, zero_deg=0.0):
    """Zodiac ring + Egyptian calendar ring. Angles: the Sun pointer turns CLOCKWISE
    seen from the front (the machine's positive sense), so the signs run clockwise
    from the zero (Aries 0 at +x by default)."""
    D = Dial("front_dial", 165.0)
    ri, ro = zodiac_r
    ci, co = cal_r
    # ring edges
    for r in (ri, ro, ci, co):
        D.circle(r, 0.25)
    D.circle((ri + ro) / 2 - 2.5, 0.08)                        # inner degree band edge
    # zodiac: 12 signs clockwise; degree ticks
    for k in range(360):
        a = zero_deg - k                                       # clockwise
        L = 1.2 if k % 30 == 0 else 0.9 if k % 10 == 0 else 0.5
        rr = ri + 0.3
        D.line(rr * math.cos(math.radians(a)), rr * math.sin(math.radians(a)),
               (rr + L) * math.cos(math.radians(a)), (rr + L) * math.sin(math.radians(a)), 0.1)
    for i, name in enumerate(ZODIAC):
        a0 = zero_deg - 30 * i
        # sign boundary
        D.line(ri * math.cos(math.radians(a0)), ri * math.sin(math.radians(a0)),
               ro * math.cos(math.radians(a0)), ro * math.sin(math.radians(a0)), 0.22)
        D.curved_text(ri + 6.3, a0 - 15, name, 2.6, bold=True)
        # parapegma index letters at the boundary and mid-sign (schematic)
        D.text((ri + 9.2) * math.cos(math.radians(a0 - 2.2)), (ri + 9.2) * math.sin(math.radians(a0 - 2.2)),
               GREEK_LETTERS[(2 * i) % 24], 1.4, angle=a0 - 92.2)
        D.text((ri + 9.2) * math.cos(math.radians(a0 - 17.2)), (ri + 9.2) * math.sin(math.radians(a0 - 17.2)),
               GREEK_LETTERS[(2 * i + 1) % 24], 1.4, angle=a0 - 107.2)
    # Egyptian calendar ring: 365 days, 12 x 30 + 5 epagomenal, clockwise
    deg_per_day = 360.0 / calendar_holes
    for k in range(calendar_holes):
        a = zero_deg - k * deg_per_day
        L = 1.3 if k % 30 == 0 else 0.9 if k % 10 == 0 else 0.45
        D.line((ci + 0.3) * math.cos(math.radians(a)), (ci + 0.3) * math.sin(math.radians(a)),
               (ci + 0.3 + L) * math.cos(math.radians(a)), (ci + 0.3 + L) * math.sin(math.radians(a)), 0.09)
    for i, name in enumerate(EGYPT):
        a0 = zero_deg - 30 * i * deg_per_day
        D.line(ci * math.cos(math.radians(a0)), ci * math.sin(math.radians(a0)),
               co * math.cos(math.radians(a0)), co * math.sin(math.radians(a0)), 0.2)
        D.curved_text(ci + 6.8, a0 - 15 * deg_per_day, name, 2.4, bold=True)
    a_ep = zero_deg - 360 * deg_per_day
    D.line(ci * math.cos(math.radians(a_ep)), ci * math.sin(math.radians(a_ep)),
           co * math.cos(math.radians(a_ep)), co * math.sin(math.radians(a_ep)), 0.2)
    D.curved_text(ci + 6.8, a_ep - 2.5 * deg_per_day, "ΕΠΑΓ", 1.6, bold=True)
    return D.finish()


# ------------------------------------------------------------------ spirals
def spiral_dial(D, r0, pitch, turns, cells, label_fn=None, mm=1.15, glyph_fn=None):
    """Archimedean spiral r = r0 + pitch * t/(2pi), CLOCKWISE in back-view coordinates
    (angle decreasing), cells numbered from 1 at the inner start."""
    steps = int(turns * 720)
    pts = []
    for i in range(steps + 1):
        t = 2 * math.pi * turns * i / steps
        r = r0 + pitch * t / (2 * math.pi)
        a = -t                                                 # clockwise
        pts.append((r * math.cos(a), r * math.sin(a)))
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        D.line(x0, y0, x1, y1, 0.2)
    # closing outer arc back to the last turn
    for (x0, y0), (x1, y1) in zip(pts[-720:], pts[-719:]):
        pass
    cells_per_turn = cells / turns
    for k in range(cells + 1):
        t = 2 * math.pi * k / cells_per_turn
        r_in = r0 + pitch * t / (2 * math.pi)
        a = -t
        D.line(r_in * math.cos(a), r_in * math.sin(a), (r_in + pitch) * math.cos(a), (r_in + pitch) * math.sin(a), 0.16)
        if k < cells:
            tm = 2 * math.pi * (k + 0.5) / cells_per_turn
            rm = r0 + pitch * tm / (2 * math.pi) + pitch / 2
            am = -tm
            x, y = rm * math.cos(am), rm * math.sin(am)
            rot = math.degrees(am) + 90                        # text reads outward along the arc
            if label_fn:
                s = label_fn(k)
                if s:
                    D.text(x, y, s, mm, angle=rot)
            if glyph_fn:
                g = glyph_fn(k)
                if g:
                    D.text(x, y, g, mm * 1.05, angle=rot, bold=True)


def sub_dial(D, cx, cy, r, sectors, labels, mm=1.5, start_deg=90.0, clockwise=True):
    D.circle(r, 0.22)
    for i in range(sectors):
        a = start_deg + (-1 if clockwise else 1) * 360.0 * i / sectors
        D.line(cx, cy, cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)), 0.16)
        am = a + (-1 if clockwise else 1) * 180.0 / sectors
        for j, s in enumerate(labels[i]):
            rr = r * (0.66 - 0.28 * j)
            D.text(cx + rr * math.cos(math.radians(am)), cy + rr * math.sin(math.radians(am)), s, mm, angle=0, bold=True)


def back_upper(n_xy, o_xy, cal_xy):
    """Metonic 5-turn spiral centred on axis n, Games dial on o, Callippic on cal.
    Composed in BACK view: x_back = -x_front."""
    nx, ny = n_xy
    D = Dial("back_upper", 150.0, cx=nx, cy=ny, back=True)
    R0, PITCH = 36.0, 5.4
    months = [CORINTH[k % 12] for k in range(235)]
    # intercalary months in a 19-year cycle: mark with the same name; years of 13 months are
    # years 3, 5, 8, 11, 13, 16, 19 (Freeth 2008): handled in the label as a doubled month
    spiral_dial(D, R0, PITCH, 5, 235, label_fn=lambda k: months[k], mm=1.05)
    # Games dial (o) and Callippic (cal), positions relative to n, mirrored for back view
    ox, oy = -(o_xy[0] - nx), o_xy[1] - ny
    cxp, cyp = -(cal_xy[0] - nx), cal_xy[1] - ny
    # draw sub-dials with local origin shifts
    for (dx, dy, labels, sectors, start) in ((ox, oy, [list(g) for g in GAMES], 4, 90.0),
                                             (cxp, cyp, [["Α"], ["Β"], ["Γ"], ["Δ"]], 4, 90.0)):
        box = [D.P(dx - 9.5, dy + 9.5), D.P(dx + 9.5, dy - 9.5)]
        D.d.ellipse(box, outline=INK, width=max(1, int(0.22 * D.scale)))
        D.db.ellipse(box, outline=40, width=max(1, int(0.22 * D.scale)))
        for i in range(sectors):
            a = start - 360.0 * i / sectors * (1 if labels[0][0] != "Α" else -1)
            D.line(dx, dy, dx + 9.5 * math.cos(math.radians(a)), dy + 9.5 * math.sin(math.radians(a)), 0.16)
            am = a - 45.0 * (1 if labels[0][0] != "Α" else -1)
            for j, s in enumerate(labels[i]):
                rr = 9.5 * (0.62 - 0.30 * j)
                D.text(dx + rr * math.cos(math.radians(am)), dy + rr * math.sin(math.radians(am)), s, 1.35 if len(s) > 2 else 2.2, bold=True)
    return D.finish()


def back_lower(g_xy, i_xy):
    gx, gy = g_xy
    D = Dial("back_lower", 150.0, cx=gx, cy=gy, back=True)
    R0, PITCH = 36.0, 6.6
    glyphs = {g.month: g for g in glyph_table()}

    def glyph(k):
        g = glyphs.get(k + 1)
        if not g:
            return None
        parts = []
        if g.lunar:
            parts.append("Σ")
        if g.solar:
            parts.append("Η")
        hour = 1 + (k * 7) % 12                                # schematic hour letter
        return "".join(parts) + " ωρ" + GREEK_NUMERALS[hour] + "  " + GREEK_LETTERS[k % 24]

    spiral_dial(D, R0, PITCH, 4, 223, glyph_fn=glyph, mm=1.2)
    ix, iy = -(i_xy[0] - gx), i_xy[1] - gy
    box = [D.P(ix - 9.5, iy + 9.5), D.P(ix + 9.5, iy - 9.5)]
    D.d.ellipse(box, outline=INK, width=max(1, int(0.22 * D.scale)))
    D.db.ellipse(box, outline=40, width=max(1, int(0.22 * D.scale)))
    for i, s in enumerate(["", "Η", "ΙϚ"]):
        a = 90.0 - 120.0 * i
        D.line(ix, iy, ix + 9.5 * math.cos(math.radians(a)), iy + 9.5 * math.sin(math.radians(a)), 0.16)
        am = a - 60.0
        if s:
            D.text(ix + 5.5 * math.cos(math.radians(am)), iy + 5.5 * math.sin(math.radians(am)), s, 2.4, bold=True)
    return D.finish()


def parapegma(name, lines, w=150.0, h=44.0):
    D = Dial(name, max(w, h), px=2048)
    y = h / 2 - 5.0
    for letter, txt in lines:
        D.text(-w / 2 + 6, y, letter, 2.6, bold=True)
        D.text(-w / 2 + 12, y, txt, 2.4, anchor="lm")
        y -= 3.6
    return D.finish(patina=True)


def main():
    spec = load()
    L = solve_layout(spec)
    meta = [front_dial(),
            back_upper((L["n"].x, L["n"].y), (L["o"].x, L["o"].y), (L["cal"].x, L["cal"].y)),
            back_lower((L["g"].x, L["g"].y), (L["i"].x, L["i"].y)),
            parapegma("parapegma_upper", PARAPEGMA_UPPER),
            parapegma("parapegma_lower", PARAPEGMA_LOWER)]
    with open(os.path.join(OUT, "dials.json"), "w", encoding="utf-8") as fh:
        json.dump({"dials": meta, "spirals": {"metonic": {"r0": 36.0, "pitch": 5.4, "turns": 5, "cells": 235},
                                                "saros": {"r0": 36.0, "pitch": 6.6, "turns": 4, "cells": 223}}}, fh, indent=1)
    for m in meta:
        print(m)


if __name__ == "__main__":
    main()

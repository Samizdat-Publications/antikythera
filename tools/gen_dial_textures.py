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
# reconstructed (not attested) lettering: the same ink blended 45% back toward the plate
INK_FAINT = tuple(round(a + 0.45 * (b - a)) for a, b in zip(INK, BRONZE))

ZODIAC = ["ΚΡΙΟΣ", "ΤΑΥΡΟΣ", "ΔΙΔΥΜΟΙ", "ΚΑΡΚΙΝΟΣ", "ΛΕΩΝ", "ΠΑΡΘΕΝΟΣ",
          "ΧΗΛΑΙ", "ΣΚΟΡΠΙΟΣ", "ΤΟΞΟΤΗΣ", "ΑΙΓΟΚΕΡΩΣ", "ΥΔΡΟΧΟΟΣ", "ΙΧΘΥΕΣ"]
EGYPT = ["ΘΩΥΘ", "ΦΑΩΦΙ", "ΑΘΥΡ", "ΧΟΙΑΚ", "ΤΥΒΙ", "ΜΕΧΕΙΡ", "ΦΑΜΕΝΩΘ", "ΦΑΡΜΟΥΘΙ",
         "ΠΑΧΩΝ", "ΠΑΥΝΙ", "ΕΠΕΙΦΙ", "ΜΕΣΟΡΗ"]
CORINTH = ["ΦΟΙΝΙΚΑΙΟΣ", "ΚΡΑΝΕΙΟΣ", "ΛΑΝΟΤΡΟΠΙΟΣ", "ΜΑΧΑΝΕΥΣ", "ΔΩΔΕΚΑΤΕΥΣ", "ΕΥΚΛΕΙΟΣ",
           "ΑΡΤΕΜΙΣΙΟΣ", "ΨΥΔΡΕΥΣ", "ΓΑΜΕΙΛΙΟΣ", "ΑΓΡΙΑΝΙΟΣ", "ΠΑΝΑΜΟΣ", "ΑΠΕΛΛΑΙΟΣ"]
GREEK_LETTERS = list("ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ")
GREEK_NUMERALS = {1: "Α", 2: "Β", 3: "Γ", 4: "Δ", 5: "Ε", 6: "Ϛ", 7: "Ζ", 8: "Η", 9: "Θ", 10: "Ι",
                  11: "ΙΑ", 12: "ΙΒ", 13: "ΙΓ", 14: "ΙΔ", 15: "ΙΕ", 16: "ΙϚ", 17: "ΙΖ", 18: "ΙΗ",
                  19: "ΙΘ", 20: "Κ", 21: "ΚΑ", 22: "ΚΒ", 23: "ΚΓ", 24: "ΚΔ", 25: "ΚΕ"}
# Eclipse-glyph hours that actually survive on the Saros dial (Freeth 2014, Table S3):
# Saros cell number -> hour of day (1..24) of the lunar (Sigma) and/or solar (Eta) event.
# Keep this in exact step with OBSERVED_HOURS in web/src/astro/eym.ts.
OBSERVED_HOURS = {
    20: {"lunar": 18}, 25: {"solar": 6}, 26: {"lunar": 7}, 72: {"solar": 14}, 78: {"solar": 1},
    79: {"lunar": 10}, 114: {"lunar": 12}, 119: {"solar": 22}, 125: {"lunar": 2, "solar": 3},
    131: {"lunar": 14, "solar": 21}, 137: {"lunar": 5, "solar": 12}, 172: {"lunar": 18, "solar": 12},
    178: {"lunar": 21, "solar": 9}, 184: {"lunar": 4, "solar": 1}, 190: {"lunar": 9},
}

GAMES = [("ΙΣΘΜΙΑ", "ΟΛΥΜΠΙΑ"), ("ΝΕΜΕΑ", "ΝΑΑ"), ("ΙΣΘΜΙΑ", "ΠΥΘΙΑ"), ("ΝΕΜΕΑ", "ΑΛΙΕΙΑ")]

# ------------------------------------------------------------------- parapegma
# Bitsakis and Jones, "The Front Dial and Parapegma Inscriptions", Almagest 7.1 (2016).
# Two alphabetic sequences, one per plate, in four columns of one season each running clockwise
# round the dial: PP1, above the dial, carries col. i (Capricorn to Pisces, Α to Θ) and col. ii
# (Aries to Gemini, Ι to Σ); PP2, below, carries col. iii (Libra to Sagittarius, Α to Λ) and
# col. iv (Cancer to Virgo, Μ to Ω). The same letter therefore stands in two of the columns.
#
# The index letters on the zodiac scale: plate, column, letter, sign (Aries 0), graduation,
# status. A letter is cut immediately clockwise of its graduation mark, and the sign boundary is
# graduation 1, so the degree into the sign is the graduation less one. Status: `scale` read on
# the bronze of Fragment C, `numeral` from the number written after the parapegma line,
# `restored` by the editors, `lost` for a letter whose place is gone, which is not drawn.
# Keep this in exact step with PARAPEGMA in web/src/astro/parapegma.ts, which carries the same
# table with each line's event in English.
PARAPEGMA_LETTERS = [
    ("PP1", 1, "Α", 9, 1, "restored"),
    ("PP1", 1, "Β", None, None, "lost"), ("PP1", 1, "Γ", None, None, "lost"),
    ("PP1", 1, "Δ", None, None, "lost"), ("PP1", 1, "Ε", None, None, "lost"),
    ("PP1", 1, "Ζ", None, None, "lost"), ("PP1", 1, "Η", None, None, "lost"),
    ("PP1", 1, "Θ", None, None, "lost"),
    ("PP1", 2, "Ι", 0, 1, "restored"), ("PP1", 2, "Κ", 0, None, "lost"),
    ("PP1", 2, "Λ", 0, 21, "numeral"), ("PP1", 2, "Μ", 1, 1, "numeral"),
    ("PP1", 2, "Ν", 1, 11, "numeral"), ("PP1", 2, "Ξ", 1, 17, "numeral"),
    ("PP1", 2, "Ο", 1, 25, "numeral"), ("PP1", 2, "Π", 2, 1, "restored"),
    ("PP1", 2, "Ρ", 2, None, "lost"), ("PP1", 2, "Σ", 2, 10, "numeral"),
    ("PP2", 3, "Α", 6, 1, "scale"), ("PP2", 3, "Β", 6, 11, "scale"),
    ("PP2", 3, "Γ", 6, 14, "scale"), ("PP2", 3, "Δ", 6, 16, "scale"),
    ("PP2", 3, "Ε", 7, 1, "scale"), ("PP2", 3, "Ζ", 7, 4, "scale"),
    ("PP2", 3, "Η", 7, 17, "scale"), ("PP2", 3, "Θ", 7, 22, "scale"),
    ("PP2", 3, "Ι", 8, 1, "scale"), ("PP2", 3, "Κ", 8, 3, "scale"),
    ("PP2", 3, "Λ", 8, 7, "scale"),
    ("PP2", 4, "Μ", 3, 1, "restored"), ("PP2", 4, "Ν", 3, None, "lost"),
    ("PP2", 4, "Ξ", 3, None, "lost"), ("PP2", 4, "Ο", 3, None, "lost"),
    ("PP2", 4, "Π", 4, 1, "restored"), ("PP2", 4, "Ρ", None, None, "lost"),
    ("PP2", 4, "Σ", None, None, "lost"), ("PP2", 4, "Τ", None, None, "lost"),
    ("PP2", 4, "Υ", None, None, "lost"), ("PP2", 4, "Φ", None, None, "lost"),
    ("PP2", 4, "Χ", None, None, "lost"), ("PP2", 4, "Ψ", 5, 19, "scale"),
    ("PP2", 4, "Ω", 5, 21, "scale"),
]


def num(n, restored=False):
    """A day/degree numeral in Greek, in brackets where the editors supply it."""
    return "[%s]" % GREEK_NUMERALS[n] if restored else GREEK_NUMERALS[n]


# The four columns as they are read out: index letter, the line, the day/degree numeral.
# The events are those of the publication; the Greek wording is a reconstruction throughout, in
# the vocabulary this file already uses, since the surviving text is too broken to copy. Square
# brackets keep the editors' convention: what they mark is restored, and is cut in the faint
# ink. A line whose text is wholly lost is written with no text at all and is drawn as the
# letter followed by a short rule, with its numeral where the dial or the inscription gives one.
PP1_COL_I = [
    ("[Α]", "[ΑΙΓΟΚΕΡΩΣ ΑΡΧΕΤΑΙ ΕΠΙΤΕΛΛΕΙΝ]", ""),
    ("", "[ΤΡΟΠΑΙ ΧΕΙΜΕΡΙΝΑΙ]", num(1, True)),
    ("[Β]", "", ""), ("[Γ]", "", ""), ("[Δ]", "", ""), ("[Ε]", "", ""),
    ("[Ζ]", "", ""), ("[Η]", "", ""), ("[Θ]", "", ""),
]
PP1_COL_II = [
    ("[Ι]", "[ΚΡΙΟΣ ΑΡΧΕΤΑΙ ΕΠΙΤΕΛΛΕΙΝ]", ""),
    ("", "[ΙΣΗΜΕΡΙΑ ΕΑΡΙΝΗ]", num(1, True)),
    ("[Κ]", "[ΠΛΕΙΑΔΕΣ ΔΥΝΟΥΣΙΝ] ΕΣΠΕΡΙΑΙ", ""),
    ("Λ", "ΥΑΔΕΣ ΔΥΝΟΥΣΙΝ ΕΣΠΕΡΙΑΙ", num(21)),
    ("Μ", "ΤΑΥΡΟΣ ΑΡΧΕΤΑΙ ΕΠΙΤΕΛΛΕΙΝ", num(1)),
    ("[Ν]", "ΛΥΡΑ ΕΠΙΤΕΛΛΕΙ ΕΣΠΕΡΙΑ", num(11)),
    ("Ξ", "ΠΛΕΙΑΣ ΕΠΙΤΕΛΛΕΙ ΕΩΙΑ", num(17)),
    ("Ο", "ΥΑΣ ΕΠΙΤΕΛΛΕΙ ΕΩΙΑ", num(25)),
    ("Π", "ΔΙΔΥΜΟΙ ΑΡΧΟΝΤΑΙ ΕΠΙΤΕΛΛΕΙΝ", num(1, True)),
    ("Ρ", "ΑΕΤΟΣ ΕΠΙΤΕΛΛΕΙ ΕΣΠΕΡΙΟΣ", ""),
    ("Σ", "ΑΡΚΤΟΥΡΟΣ ΔΥΝΕΙ ΕΩΙΟΣ", num(10)),
]
PP2_COL_III = [
    ("[Α]", "ΧΗΛΑΙ ΑΡΧΟΝΤΑΙ ΕΠΙΤΕΛΛΕΙΝ", ""),
    ("", "ΙΣΗΜΕΡΙΑ ΦΘΙΝΟΠΩΡΙΝΗ", num(1)),
    ("[Β]", "[ΕΡΙΦΟΙ] ΕΠΙΤΕΛΛΟΥΣΙΝ ΕΣΠΕΡΙΟΙ", num(11)),
    ("[Γ]", "[ΠΛΕΙΑΣ] ΕΠΙΤΕΛΛΕΙ ΕΣΠΕΡΙΑ", num(14)),
    ("[Δ]", "[ΣΤΕΦΑΝΟΣ] ΕΠΙΤΕΛΛΕΙ [ΕΩΙΟΣ]", num(16)),
    ("[Ε]", "[ΣΚΟΡΠΙΟΣ ΑΡΧΕΤΑΙ] ΕΠΙΤΕΛΛΕΙΝ", num(1)),
    ("Ζ", "", num(4, True)), ("Η", "", num(17, True)), ("Θ", "", num(22, True)),
    ("Ι", "[ΤΟΞΟΤΗΣ ΑΡΧΕΤΑΙ ΕΠΙΤΕΛΛΕΙΝ]", num(1, True)),
    ("Κ", "", num(3, True)), ("Λ", "", num(7, True)),
]
PP2_COL_IV = [
    ("Μ", "ΚΑΡΚΙΝΟΣ [ΑΡΧΕΤΑΙ ΕΠΙΤΕΛΛΕΙΝ]", ""),
    ("", "[ΤΡΟΠΑΙ ΘΕΡΙΝΑΙ]", num(1, True)),
    ("Ν", "ΩΡΙΩΝ [ΕΠΙΤΕΛΛΕΙ ΕΩΙΟΣ]", ""),
    ("Ξ", "ΚΥΩΝ [ΕΠΙΤΕΛΛΕΙ ΕΩΙΟΣ]", ""),
    ("Ο", "ΑΕΤΟΣ [ΔΥΝΕΙ ΕΩΙΟΣ]", ""),
    ("Π", "ΛΕΩΝ [ΑΡΧΕΤΑΙ ΕΠΙΤΕΛΛΕΙΝ]", num(1, True)),
    ("[Ρ]", "", ""), ("[Σ]", "", ""), ("[Τ]", "", ""),
    ("[Υ]", "", ""), ("[Φ]", "", ""), ("[Χ]", "", ""),
    ("[Ψ]", "[ΑΙΞ ΕΠΙΤΕΛΛΕΙ ΕΣΠΕΡΙΑ]", num(19, True)),
    ("[Ω]", "[ΑΡΚΤΟΥΡΟΣ ΕΠΙΤΕΛΛΕΙ ΕΩΙΟΣ]", num(21, True)),
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

    def text(self, x, y, s, mm, angle=0.0, bold=False, ink=INK, anchor="mm", faint=False):
        """Text centred at (x, y) mm, rotated by angle degrees (ccw).

        faint=True marks reconstructed lettering: lighter ink and a shallower cut.
        """
        if faint and ink is INK:
            ink = INK_FAINT
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
        dark = Image.new("L", tile.size, 112 if faint else 40)
        self.bump.paste(dark, pos, tile)

    def text_run(self, x, y, parts, mm, angle=0.0, bold=False):
        """One line built from [(text, faint), ...] segments, centred at (x, y)."""
        f = self.font(mm, bold)
        widths = [f.getlength(s) / self.scale for s, _ in parts]
        ux, uy = math.cos(math.radians(angle)), math.sin(math.radians(angle))
        off = -sum(widths) / 2
        for (s, faint), w in zip(parts, widths):
            c = off + w / 2
            self.text(x + ux * c, y + uy * c, s, mm, angle=angle, bold=bold, faint=faint)
            off += w

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
        bump = self.bump.filter(ImageFilter.GaussianBlur(0.6))
        bump.save(os.path.join(OUT, self.name + "_bump.png"))
        # a real tangent-space normal map for the engraving (the glTF exporter cannot export a Bump node)
        import numpy as np
        from gen_surface_maps import height_to_normal
        h = np.asarray(bump, dtype=np.float64) / 255.0
        Image.fromarray(height_to_normal(h, strength=5.0, wrap=False), "RGB").save(os.path.join(OUT, self.name + "_normal.png"), optimize=True)
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
    # parapegma index letters, each one immediately clockwise of its graduation mark: read on
    # the bronze in the full ink, resting on a numeral or on the editors' restoration in the
    # faint ink, and a letter whose place is lost not drawn at all.
    for _plate, _column, letter, sign, grad, status in PARAPEGMA_LETTERS:
        if grad is None:
            continue
        a = zero_deg - 30 * sign - (grad - 1) - 0.55
        D.text((ri + 9.2) * math.cos(math.radians(a)), (ri + 9.2) * math.sin(math.radians(a)),
               letter, 1.4, angle=a - 90, faint=status != "scale")
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
                if isinstance(g, list):
                    D.text_run(x, y, g, mm * 1.05, angle=rot, bold=True)
                elif g:
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
        """Label for Saros cell k+1. Only the 15 cells in OBSERVED_HOURS carry the hours that
        survive on the fragments; every other hour is schematic and is cut in the faint ink."""
        g = glyphs.get(k + 1)
        if not g:
            return None
        obs = OBSERVED_HOURS.get(k + 1)
        tail = [("  " + GREEK_LETTERS[k % 24], False)]
        if obs:
            out = []
            if g.lunar and "lunar" in obs:
                out.append(("Σωρ" + GREEK_NUMERALS[obs["lunar"]], False))
            elif g.lunar:
                out.append(("Σ", False))
            if g.solar and "solar" in obs:
                # the cell is too narrow for a second "ωρ": the hour letter follows Η directly
                out.append(((" " if out else "") + "Η"
                            + ("" if out else "ωρ") + GREEK_NUMERALS[obs["solar"]], False))
            elif g.solar:
                out.append(((" " if out else "") + "Η", False))
            return out + tail
        head = ("Σ" if g.lunar else "") + ("Η" if g.solar else "")
        hour = 1 + (k * 7) % 12                                # schematic hour letter
        return [(head + " ", False), ("ωρ" + GREEK_NUMERALS[hour], True)] + tail

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


def segments(s):
    """Split a line on the editors' brackets, so that what they restore comes back faint."""
    parts, faint = [], False
    for chunk in s.replace("[", "]").split("]"):
        if chunk:
            parts.append((chunk, faint))
        faint = not faint
    return parts


def parapegma(name, left, right, w=150.0, h=44.0):
    """One plate: its two columns side by side, each line letter, text, day/degree numeral."""
    D = Dial(name, max(w, h), px=2048)
    margin, gap, mm, step = 5.0, 5.0, 2.1, 2.9
    col_w = (w - 2 * margin - gap) / 2                         # about 70 mm to a column

    def put(x, y, s, size, bold=False, faint=False):
        """A string set from x, since the Dial's own text is centred on its point."""
        s_mm = D.font(size, bold).getlength(s) / D.scale
        D.text(x + s_mm / 2, y, s, size, bold=bold, faint=faint)

    for c, lines in enumerate((left, right)):
        x0 = -w / 2 + margin + c * (col_w + gap)
        y = (len(lines) - 1) * step / 2                        # the column sits centred on the plate
        for letter, txt, numeral in lines:
            if letter:
                put(x0, y, letter.strip("[]"), 2.2, bold=True, faint=letter.startswith("["))
            if txt:
                parts = segments(txt)
                run = sum(D.font(mm).getlength(s) for s, _ in parts) / D.scale
                D.text_run(x0 + 4.5 + run / 2, y, parts, mm)
            else:
                run = 14.0
                D.line(x0 + 4.5, y, x0 + 4.5 + run, y, 0.12, ink=INK_FAINT)   # the line is lost
            if numeral:                                        # the day or degree, after its line
                put(x0 + 7.0 + run, y, numeral.strip("[]"), mm, faint=numeral.startswith("["))
            y -= step
    return D.finish(patina=True)


def main():
    spec = load()
    L = solve_layout(spec)
    meta = [front_dial(),
            back_upper((L["n"].x, L["n"].y), (L["o"].x, L["o"].y), (L["cal"].x, L["cal"].y)),
            back_lower((L["g"].x, L["g"].y), (L["i"].x, L["i"].y)),
            parapegma("parapegma_upper", PP1_COL_I, PP1_COL_II),
            parapegma("parapegma_lower", PP2_COL_III, PP2_COL_IV)]
    with open(os.path.join(OUT, "dials.json"), "w", encoding="utf-8") as fh:
        json.dump({"dials": meta, "spirals": {"metonic": {"r0": 36.0, "pitch": 5.4, "turns": 5, "cells": 235},
                                                "saros": {"r0": 36.0, "pitch": 6.6, "turns": 4, "cells": 223}}}, fh, indent=1)
    for m in meta:
        print(m)


if __name__ == "__main__":
    main()

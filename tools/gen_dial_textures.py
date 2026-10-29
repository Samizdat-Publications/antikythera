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
SLOT = (14, 10, 6)             # the spiral slot, a cut right through to shadow
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

# The Metonic calendar (Freeth et al. 2008 SI 3.2, 3.3): 19 years, the seven 13-month ones being years
# 1, 3, 6, 9, 11, 14 and 17, the one intercalary-year pattern the inscriptions allow; the repeated month
# is taken as month 6 (Eukleios) every time, the SI's "simple hypothesis", which puts Eukleios in both
# cells 31 and 32. The first cell of each year carries the L-shaped etos sign and the year's numeral.
# Keep in exact step with METONIC_* in web/src/mech/mechanism.ts.
METONIC_LONG_YEARS = (1, 3, 6, 9, 11, 14, 17)
METONIC_R0, METONIC_PITCH = 39.0, 5.0          # inner turn as in the 2008 SI Fig. 15, scaled to the model's dial
# Each month name split over two or three lines as the 2008 reconstruction (SI Fig. 15) writes them.
METONIC_LINES = {"ΦΟΙΝΙΚΑΙΟΣ": ["ΦΟΙΝΙ", "ΚΑΙΟΣ"], "ΚΡΑΝΕΙΟΣ": ["ΚΡΑ", "ΝΕΙ", "ΟΣ"],
                 "ΛΑΝΟΤΡΟΠΙΟΣ": ["ΛΑΝΟ", "ΤΡΟ", "ΠΙΟΣ"], "ΜΑΧΑΝΕΥΣ": ["ΜΑΧΑ", "ΝΕΥΣ"],
                 "ΔΩΔΕΚΑΤΕΥΣ": ["ΔΩΔΕ", "ΚΑΤΕ", "ΥΣ"], "ΕΥΚΛΕΙΟΣ": ["ΕΥ", "ΚΛΕΙ", "ΟΣ"],
                 "ΑΡΤΕΜΙΣΙΟΣ": ["ΑΡΤΕ", "ΜΙΣΙ", "ΟΣ"], "ΨΥΔΡΕΥΣ": ["ΨΥ", "ΔΡΕΥΣ"],
                 "ΓΑΜΕΙΛΙΟΣ": ["ΓΑΜΕ", "ΙΛΙΟΣ"], "ΑΓΡΙΑΝΙΟΣ": ["ΑΓΡΙ", "ΑΝΙΟΣ"],
                 "ΠΑΝΑΜΟΣ": ["ΠΑΝΑ", "ΜΟΣ"], "ΑΠΕΛΛΑΙΟΣ": ["ΑΠΕΛ", "ΛΑΙΟΣ"]}
METONIC_REPEATED_MONTH = 6


def metonic_cells():
    """(year 1..19, month 1..12, first cell of its year) for each of the 235 cells."""
    out = []
    for y in range(1, 20):
        months = list(range(1, 13))
        if y in METONIC_LONG_YEARS:
            months.insert(METONIC_REPEATED_MONTH, METONIC_REPEATED_MONTH)
        out += [(y, m, i == 0) for i, m in enumerate(months)]
    assert len(out) == 235
    return out


# Numerals for the excluded days cut inside (below) cells of the innermost turn (2008 SI 3.2): cell -> numeral,
# and whether the reading is only probable (cell 1), which is cut in the faint ink.
METONIC_EXCLUDED = {1: ("Α", True), 33: ("Β", False), 35: ("Ϛ", False), 37: ("ΙΑ", False), 39: ("ΙΕ", False),
                    41: ("ΙΘ", False), 43: ("ΚΓ", False), 45: ("ΚΖ", False)}

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

    def line(self, x0, y0, x1, y1, w_mm=0.12, ink=INK, depth=40):
        """depth is the bump value cut under the line: 40 an engraved line, lower a deeper cut."""
        w = max(1, int(w_mm * self.scale))
        self.d.line([self.P(x0, y0), self.P(x1, y1)], fill=ink, width=w)
        self.db.line([self.P(x0, y0), self.P(x1, y1)], fill=depth, width=w)

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

    def text(self, x, y, s, mm, angle=0.0, bold=False, ink=INK, anchor="mm", faint=False, fit=None):
        """Text centred at (x, y) mm, rotated by angle degrees (ccw).

        faint=True marks reconstructed lettering: lighter ink and a shallower cut.
        fit: the most the line may run, in mm; a longer one is set smaller to fit, as a letter
        cutter squeezes a long month name into a short cell on the inner turns.
        """
        if faint and ink is INK:
            ink = INK_FAINT
        f = self.font(mm, bold)
        bbox = f.getbbox(s)
        if fit is not None and (bbox[2] - bbox[0]) > fit * self.scale:
            mm *= fit * self.scale / (bbox[2] - bbox[0])
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
# The Cosmos display of Freeth et al. 2021, Fig. 7, measured off the figure with the calendar's
# outer edge taken as 80 mm: from the centre, rings for Mercury, Venus, the true Sun, Mars, Jupiter,
# Saturn and the date, then the Zodiac and the Egyptian calendar. Inner and outer radii in mm.
# dials.py builds the rings from this table (it is written into dials.json).
FRONT_RINGS = {
    "mercury": (34.3, 38.4), "venus": (38.7, 43.3), "true_sun": (43.6, 49.8), "mars": (50.1, 54.6),
    "jupiter": (54.9, 59.4), "saturn": (59.7, 63.9), "date": (64.2, 66.5),
}
ZODIAC_R = (66.7, 73.9)
# 0 degrees of Aries stands at the top of the dial (12 o'clock): the parapegma plate above the dial carries
# Capricorn to Gemini and the one below Libra to Sagittarius and Cancer to Virgo, and "each column corresponds
# to the adjacent quarter of the Zodiac Dial" (Freeth et al. 2021 SI); Fig. 7 has KRIOS just right of the top.
# Keep in step with ZODIAC_ZERO_DEG in web/src/mech/gearGraph.ts.
ZODIAC_ZERO_DEG = 90.0
CALENDAR_R = (74.1, 80.0)

# The Index Letter Scheme (Freeth et al. 2021, Fig. 8): one alphabet run through the synodic events
# of the planets in the order of the Front Cover Inscription. Each scale mark sits where the Sun
# pointer stands on that planet's ring at the event, so it was measured on this machine itself:
# turned through 40 years, the Sun's place on each ring at every event, in degrees clockwise from
# the planet's stone, averaged (a scatter of a degree or two; the gearing is exact, the events are
# not quite evenly spaced). Letter, degrees, whether the letter is inferred (Mercury's first three
# lines of the inscription are lost, so their letters are cut in the faint ink).
RING_EVENTS = {
    "mercury": [("Α", -0.44, True), ("Β", -24.55, True), ("Γ", -20.02, True),
                ("Δ", 0.97, False), ("Ε", 21.37, False), ("Ζ", 16.83, False)],
    "venus": [("Η", -0.13, False), ("Θ", -46.37, False), ("Ι", -28.57, False),
              ("Κ", 0.82, False), ("Λ", 45.84, False), ("Μ", 28.04, False)],
    "mars": [("Ν", -131.71, False), ("Ξ", 0.19, False), ("Ο", 139.98, False), ("Π", -179.33, False)],
    "jupiter": [("Ρ", -118.69, False), ("Σ", 0.39, False), ("Τ", 112.57, False), ("Υ", -179.43, False)],
    "saturn": [("Φ", -109.73, False), ("Χ", 0.41, False), ("Ψ", 108.12, False), ("Ω", -179.5, False)],
}
STONE_R = 1.8                   # the planet's stone on its ring (dials.py)
OPP_R = 0.9                     # the smaller marker for opposition, opposite a superior planet's stone
SYNODIC_DEG_PER_DAY = 360.0 / 29.530589
# Eclipse limits as the Sun's distance from the node, from the eclipse-year model (python/mech/eym.py):
# 20 and 7 of the 446 eclipse-year units in an eclipse year (180 degrees is 223 of them), either side of
# the Sun pointer: with a double-ended Dragon Hand the narrow solar limit falls on one side for the Head and on
# the other for the Tail, so both sides carry both marks.
ECLIPSE_LIMITS_DEG = (16.1, 5.65)


def front_dial(zodiac_r=ZODIAC_R, cal_r=CALENDAR_R, calendar_holes=365, zero_deg=ZODIAC_ZERO_DEG):
    """Zodiac ring + Egyptian calendar ring. Angles: the Sun pointer turns CLOCKWISE
    seen from the front (the machine's positive sense), so the signs run clockwise
    from the zero, 0 Aries at the top. The calendar ring is drawn from the same zero
    (1 Thoth there) and is turned to the epoch at runtime (gearGraph.ts)."""
    D = Dial("front_dial", 165.0)
    ri, ro = zodiac_r
    ci, co = cal_r
    # ring edges
    for r in (ri, ro, ci, co):
        D.circle(r, 0.25)
    D.circle(ri + 1.35, 0.08)                                  # the degree band's outer edge
    # zodiac: 12 signs clockwise; degree ticks along the inner edge, where the pointers end
    for k in range(360):
        a = zero_deg - k                                       # clockwise
        L = 1.15 if k % 30 == 0 else 0.85 if k % 10 == 0 else 0.5
        rr = ri + 0.2
        D.line(rr * math.cos(math.radians(a)), rr * math.sin(math.radians(a)),
               (rr + L) * math.cos(math.radians(a)), (rr + L) * math.sin(math.radians(a)), 0.1)
    for i, name in enumerate(ZODIAC):
        a0 = zero_deg - 30 * i
        # sign boundary
        D.line(ri * math.cos(math.radians(a0)), ri * math.sin(math.radians(a0)),
               ro * math.cos(math.radians(a0)), ro * math.sin(math.radians(a0)), 0.22)
        D.curved_text(ri + 4.7, a0 - 15, name, 2.1, bold=True)
    # parapegma index letters, each one immediately clockwise of its graduation mark: read on
    # the bronze in the full ink, resting on a numeral or on the editors' restoration in the
    # faint ink, and a letter whose place is lost not drawn at all.
    for _plate, _column, letter, sign, grad, status in PARAPEGMA_LETTERS:
        if grad is None:
            continue
        a = zero_deg - 30 * sign - (grad - 1) - 0.55
        D.text((ri + 2.15) * math.cos(math.radians(a)), (ri + 2.15) * math.sin(math.radians(a)),
               letter, 1.2, angle=a - 90, faint=status != "scale")
    # Egyptian calendar ring: 365 days, 12 x 30 + 5 epagomenal, clockwise
    deg_per_day = 360.0 / calendar_holes
    for k in range(calendar_holes):
        a = zero_deg - k * deg_per_day
        L = 1.15 if k % 30 == 0 else 0.85 if k % 10 == 0 else 0.45
        D.line((ci + 0.2) * math.cos(math.radians(a)), (ci + 0.2) * math.sin(math.radians(a)),
               (ci + 0.2 + L) * math.cos(math.radians(a)), (ci + 0.2 + L) * math.sin(math.radians(a)), 0.09)
    for i, name in enumerate(EGYPT):
        a0 = zero_deg - 30 * i * deg_per_day
        D.line(ci * math.cos(math.radians(a0)), ci * math.sin(math.radians(a0)),
               co * math.cos(math.radians(a0)), co * math.sin(math.radians(a0)), 0.2)
        D.curved_text(ci + 3.5, a0 - 15 * deg_per_day, name, 1.9, bold=True)
    a_ep = zero_deg - 360 * deg_per_day
    D.line(ci * math.cos(math.radians(a_ep)), ci * math.sin(math.radians(a_ep)),
           co * math.cos(math.radians(a_ep)), co * math.sin(math.radians(a_ep)), 0.2)
    D.curved_text(ci + 3.5, a_ep - 2.5 * deg_per_day, "ΕΠΑΓ", 1.4, bold=True)
    return D.finish()


def front_rings():
    """The planet rings and the true Sun ring, one texture for all of them: each ring is a
    separate mesh with planar UVs in its own frame, so it carries its own band of this picture
    round with it. The stone (or the Sun's golden sphere) sits at local +x, angle 0; marks are
    laid out clockwise from it, as the machine turns."""
    D = Dial("front_rings", 134.0)

    def at(r, deg_cw):
        a = math.radians(-deg_cw)
        return r * math.cos(a), r * math.sin(a)

    def tick(r0, deg_cw, length, w=0.16):
        x0, y0 = at(r0, deg_cw)
        x1, y1 = at(r0 + length, deg_cw)
        D.line(x0, y0, x1, y1, w)

    for name, (ri, ro) in FRONT_RINGS.items():
        if name == "date":
            continue
        D.circle(ri + 0.12, 0.2)
        D.circle(ro - 0.12, 0.2)
    # planets: a scale mark across the inner part of the ring at each synodic event and its index
    # letter beside it, clockwise of the mark; for a conjunction the stone is in the way, so the
    # letter stands beside the stone on the side the mark falls, and for an opposition beside the marker
    for name, events in RING_EVENTS.items():
        ri, ro = FRONT_RINGS[name]
        rm = (ri + ro) / 2
        for letter, deg, inferred in events:
            tick(ri + 0.1, deg, 1.4, 0.18)
            if abs(deg) < 5:
                off = math.degrees((STONE_R + 1.0) / rm) * (1 if deg >= 0 else -1)
            elif abs(abs(deg) - 180) < 5:
                off = math.degrees((OPP_R + 1.0) / rm)
            else:
                off = math.degrees(1.0 / rm)
            x, y = at(rm + 0.3, deg + off)
            D.text(x, y, letter, 1.7, angle=-(deg + off) - 90, bold=True, faint=inferred)
    # the true Sun ring: the Age of the Moon in days, counted clockwise from the Sun pointer and read
    # by the Moon pointer, and the eclipse-limit triangles either side of the pointer
    ri, ro = FRONT_RINGS["true_sun"]
    for d in range(1, 30):
        tick(ri + 0.6, d * SYNODIC_DEG_PER_DAY, 3.6, 0.14)
        x, y = at(ri + 2.6, (d - 0.5) * SYNODIC_DEG_PER_DAY)
        D.text(x, y, GREEK_NUMERALS[d] if d <= 25 else "Κ" + GREEK_NUMERALS[d - 20], 1.55,
               angle=-(d - 0.5) * SYNODIC_DEG_PER_DAY - 90, bold=True)
    for lim in ECLIPSE_LIMITS_DEG:
        for side in (-1, 1):
            deg = side * lim
            half = math.degrees(0.7 / (ro - 1.0))
            pts = [D.P(*at(ro - 0.35, deg - half)), D.P(*at(ro - 0.35, deg + half)), D.P(*at(ro - 1.65, deg))]
            D.d.polygon(pts, fill=INK)                         # apex in, toward the Sun's sphere
            D.db.polygon(pts, fill=40)
    return D.finish()


# ------------------------------------------------------------------ spirals
def spiral_dial(D, r0, pitch, turns, cells, label_fn=None, mm=1.15, glyph_fn=None, labels_outward=False):
    """Archimedean spiral r = r0 + pitch * t/(2pi), CLOCKWISE in back-view coordinates
    (angle decreasing), cells numbered from 1 at the inner start, which is at the top: both
    scales begin there, following the correction received on 29 October 2026. The 2008 SI agrees for the Saros
    (its Fig. 25) but began the Metonic at the inside bottom (its Fig. 15)."""
    # The spiral is a slot the pointer's follower pin rides in, so it is cut as one: a dark groove
    # 0.8 mm wide, deep in the bump, that reads as a spiral from across the room. A hairline
    # vanished once the texture was brought down to 2048 px. One turn more, drawn as a plain rule,
    # closes the outside of the last turn of cells.
    steps = int((turns + 1) * 720)
    pts = []
    for i in range(steps + 1):
        t = 2 * math.pi * (turns + 1) * i / steps
        r = r0 + pitch * t / (2 * math.pi)
        a = math.pi / 2 - t                                    # clockwise from the top
        pts.append((t, r * math.cos(a), r * math.sin(a)))
    for (t, x0, y0), (_, x1, y1) in zip(pts, pts[1:]):
        if t < 2 * math.pi * turns:
            D.line(x0, y0, x1, y1, 0.8, ink=SLOT, depth=8)
        else:
            D.line(x0, y0, x1, y1, 0.3)
    cells_per_turn = cells / turns
    for k in range(cells + 1):
        t = 2 * math.pi * k / cells_per_turn
        r_in = r0 + pitch * t / (2 * math.pi)
        a = math.pi / 2 - t
        D.line(r_in * math.cos(a), r_in * math.sin(a), (r_in + pitch) * math.cos(a), (r_in + pitch) * math.sin(a), 0.24)
        if k < cells:
            tm = 2 * math.pi * (k + 0.5) / cells_per_turn
            rm = r0 + pitch * tm / (2 * math.pi) + pitch / 2
            am = math.pi / 2 - tm
            x, y = rm * math.cos(am), rm * math.sin(am)
            width = 0.9 * rm * 2 * math.pi / cells_per_turn
            for fn, size, bold, outward in ((label_fn, mm, False, labels_outward), (glyph_fn, mm * 1.05, True, False)):
                lines = fn(k) if fn else None
                if not lines:
                    continue
                if isinstance(lines, str):
                    lines = [lines]
                # tops of the letters toward the centre (line 0 nearest it), or outward (line 0 outermost)
                rot = math.degrees(am) + (-90 if outward else 90)
                lh = size * 1.25
                for j, line in enumerate(lines):
                    rr = rm + ((len(lines) - 1) / 2 - j if outward else j - (len(lines) - 1) / 2) * lh
                    lx, ly = rr * math.cos(am), rr * math.sin(am)
                    text, bar = (line, False) if isinstance(line, str) else line
                    D.text(lx, ly, text, size, angle=rot, bold=bold, fit=width)
                    if bar:                                    # a bar over the letter (second alphabet)
                        ux, uy = -math.cos(am), -math.sin(am)
                        tx, ty = -math.sin(am), math.cos(am)
                        cx, cy = lx + ux * 0.62 * size, ly + uy * 0.62 * size
                        D.line(cx - tx * 0.35 * size, cy - ty * 0.35 * size, cx + tx * 0.35 * size, cy + ty * 0.35 * size, 0.1)


def sub_dial(D, cx, cy, r, sectors, labels, mm=1.5, start_deg=90.0, clockwise=True):
    D.circle(r, 0.22)
    for i in range(sectors):
        a = start_deg + (-1 if clockwise else 1) * 360.0 * i / sectors
        D.line(cx, cy, cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)), 0.16)
        am = a + (-1 if clockwise else 1) * 180.0 / sectors
        for j, s in enumerate(labels[i]):
            rr = r * (0.66 - 0.28 * j)
            D.text(cx + rr * math.cos(math.radians(am)), cy + rr * math.sin(math.radians(am)), s, mm, angle=0, bold=True)


GAMES_TILT = 8.0                # degrees anticlockwise, seen from the back


SUBDIAL_R = 11.0                # the subsidiary dials' rim, near the 2008 SI Fig. 15's 12 mm (dials.py ends the pointers there)


def games_dial(D, dx, dy, r=SUBDIAL_R):
    """The Olympiad (Games) dial, seen from the back (Freeth et al. 2008 SI 3.5): quarter k (year k + 1)
    spans the 90-degree sector anticlockwise from -90 + GAMES_TILT + 90k, so year 1 is the lower right.
    Inside the rim, the year: the L-shaped etos sign and its numeral. Outside the rim, the year's games,
    reading outward in the order they were held. All with the tops of the letters toward the centre."""
    box = [D.P(dx - r, dy + r), D.P(dx + r, dy - r)]
    D.d.ellipse(box, outline=INK, width=max(1, int(0.22 * D.scale)))
    D.db.ellipse(box, outline=40, width=max(1, int(0.22 * D.scale)))
    for k in range(4):
        a = -90.0 + GAMES_TILT + 90.0 * k
        D.line(dx, dy, dx + r * math.cos(math.radians(a)), dy + r * math.sin(math.radians(a)), 0.16)
        am = math.radians(a + 45.0)
        rot = math.degrees(am) + 90
        D.text(dx + 0.62 * r * math.cos(am), dy + 0.62 * r * math.sin(am), "L " + GREEK_NUMERALS[k + 1], 1.2, angle=rot, bold=True)
        for j, name in enumerate(GAMES[k]):
            rr = r + 0.8 + 1.1 * j
            D.text(dx + rr * math.cos(am), dy + rr * math.sin(am), name, 0.9, angle=rot, bold=True, fit=1.4 * rr)


def back_upper(n_xy, o_xy, cal_xy):
    """Metonic 5-turn spiral centred on axis n, Games dial on o, Callippic on cal.
    Composed in BACK view: x_back = -x_front."""
    nx, ny = n_xy
    D = Dial("back_upper", 150.0, cx=nx, cy=ny, back=True)
    R0, PITCH = METONIC_R0, METONIC_PITCH
    cells = metonic_cells()

    def label(k):
        y, m, first = cells[k]
        lines = METONIC_LINES[CORINTH[m - 1]]
        return ["L " + GREEK_NUMERALS[y]] + lines if first else lines

    # the month names are cut with the tops of the letters outward, as in the 2008 reconstruction
    spiral_dial(D, R0, PITCH, 5, 235, label_fn=label, mm=0.95, labels_outward=True)
    for cell, (numeral, probable) in METONIC_EXCLUDED.items():   # inside the innermost turn
        tm = 2 * math.pi * (cell - 0.5) / 47
        rr = R0 + PITCH * tm / (2 * math.pi) - 1.4
        am = math.pi / 2 - tm
        D.text(rr * math.cos(am), rr * math.sin(am), numeral, 1.15, angle=math.degrees(am) + 90, faint=probable)
    # Games dial (o) and Callippic (cal), positions relative to n, mirrored for back view
    ox, oy = -(o_xy[0] - nx), o_xy[1] - ny
    cxp, cyp = -(cal_xy[0] - nx), cal_xy[1] - ny
    # The Games dial (Freeth et al. 2008 SI): its quarters are turned about 8 degrees anticlockwise
    # from square, year 1 is the lower right and the years run anticlockwise, as its pointer turns.
    games_dial(D, ox, oy)
    # The Callippic dial (no physical evidence survives for it): "placed symmetrically to the Olympiad
    # Dial, driven by the mirror image of the gearing" (2008 SI 3.7), so its quarters are the Games dial's
    # mirrored: turned 8 degrees clockwise from square, the first at the lower left, running clockwise as
    # its pointer turns. Each quarter is one 19-year Metonic cycle.
    r = SUBDIAL_R
    box = [D.P(cxp - r, cyp + r), D.P(cxp + r, cyp - r)]
    D.d.ellipse(box, outline=INK, width=max(1, int(0.22 * D.scale)))
    D.db.ellipse(box, outline=40, width=max(1, int(0.22 * D.scale)))
    for k, letter in enumerate("ΑΒΓΔ"):
        a = 262.0 - 90.0 * k
        D.line(cxp, cyp, cxp + r * math.cos(math.radians(a)), cyp + r * math.sin(math.radians(a)), 0.16)
        am = math.radians(a - 45.0)
        D.text(cxp + 0.6 * r * math.cos(am), cyp + 0.6 * r * math.sin(am), letter, 1.6, angle=math.degrees(am) + 90, bold=True)
    return D.finish()


def back_lower(g_xy, i_xy):
    gx, gy = g_xy
    D = Dial("back_lower", 150.0, cx=gx, cy=gy, back=True)
    R0, PITCH = 36.0, 6.6
    glyphs = {g.month: g for g in glyph_table()}

    order = {m: i for i, m in enumerate(sorted(glyphs))}

    def glyph(k):
        """The glyph in Saros cell k+1, one line to a prediction and the index letter at the bottom
        (Freeth et al. 2008 SI 4.1, 4.4; Freeth 2014). The index letters run in alphabetical order through
        the glyphs, one alphabet and then a second whose letters carry a bar (Freeth 2014, Fig. 6); the last three
        glyphs have symbols that are not letters, not drawn. Times are on a 12-hour scale: H over M ("of the
        day") marks a lunar eclipse in daylight, N over Y ("of the night") a solar one at night. Only the 15
        cells in OBSERVED_HOURS keep their times; the reconstructed glyphs carry none, as in the 2008
        reconstruction ("the process of their generation has not been discovered")."""
        g = glyphs.get(k + 1)
        if not g:
            return None
        obs = OBSERVED_HOURS.get(k + 1, {})
        lines = []
        for kind, sym, mark in (("lunar", "Σ", "ΗΜ"), ("solar", "Η", "ΝΥ")):
            if not getattr(g, kind):
                continue
            v = obs.get(kind)
            if v is None:
                lines.append(sym)
                continue
            day = v <= 12                                      # stored 1..24 from dawn: 1..12 day, 13..24 night
            flag = (kind == "lunar" and day) or (kind == "solar" and not day)
            lines.append(sym + (" " + mark if flag else "") + " ωρ" + GREEK_NUMERALS[v if day else v - 12])
        i = order[k + 1]
        if i < 48:
            lines.append((GREEK_LETTERS[i % 24], i >= 24))
        return lines

    spiral_dial(D, R0, PITCH, 4, 223, glyph_fn=glyph, mm=1.2)
    # the quarter turns of the Saros dial, each a Full Moon Cycle, marked inside the first turn at 3, 6 and 9
    # o'clock (2008 SI 4.7 and Fig. 25; the start is at 12)
    for a in (0.0, -90.0, 180.0):
        D.line((R0 - 0.6) * math.cos(math.radians(a)), (R0 - 0.6) * math.sin(math.radians(a)),
               (R0 - 6.5) * math.cos(math.radians(a)), (R0 - 6.5) * math.sin(math.radians(a)), 0.2)
    ix, iy = -(i_xy[0] - gx), i_xy[1] - gy
    r = SUBDIAL_R
    box = [D.P(ix - r, iy + r), D.P(ix + r, iy - r)]
    D.d.ellipse(box, outline=INK, width=max(1, int(0.22 * D.scale)))
    D.db.ellipse(box, outline=40, width=max(1, int(0.22 * D.scale)))
    # The 2008 SI (4.8, Fig. 24) reads H (8) at 7 o'clock and IS (16) at 11 o'clock with "a faint horizontal
    # scale division": three sectors divided at 60, 180 and 300 degrees, the blank one centred at 3 o'clock,
    # in the order 0, 8, 16 the way the pointer turns (clockwise seen from the back).
    for i, s in enumerate(["", "Η", "ΙϚ"]):
        a = 60.0 - 120.0 * i
        D.line(ix, iy, ix + r * math.cos(math.radians(a)), iy + r * math.sin(math.radians(a)), 0.16)
        am = a - 60.0
        if s:
            D.text(ix + 0.6 * r * math.cos(math.radians(am)), iy + 0.6 * r * math.sin(math.radians(am)), s, 2.6, bold=True)
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
    meta = [front_dial(), front_rings(),
            back_upper((L["n"].x, L["n"].y), (L["o"].x, L["o"].y), (L["cal"].x, L["cal"].y)),
            back_lower((L["g"].x, L["g"].y), (L["i"].x, L["i"].y)),
            parapegma("parapegma_upper", PP1_COL_I, PP1_COL_II),
            parapegma("parapegma_lower", PP2_COL_III, PP2_COL_IV)]
    with open(os.path.join(OUT, "dials.json"), "w", encoding="utf-8") as fh:
        json.dump({"dials": meta, "front_rings": FRONT_RINGS, "zodiac_r": ZODIAC_R, "calendar_r": CALENDAR_R,
                   "spirals": {"metonic": {"r0": METONIC_R0, "pitch": METONIC_PITCH, "turns": 5, "cells": 235},
                                                "saros": {"r0": 36.0, "pitch": 6.6, "turns": 4, "cells": 223}}}, fh, indent=1)
    for m in meta:
        print(m)


if __name__ == "__main__":
    main()

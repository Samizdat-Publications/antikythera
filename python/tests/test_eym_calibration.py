"""Calibrate the Eclipse Year Model against the glyphs actually observed on
the Saros dial (Freeth 2014, Tables S1 and S2, CC-BY)."""
from mech.eym import glyph_table, counts

# Table S2: months of observed lunar / solar glyphs
OBSERVED_LUNAR = {26, 120, 131, 178, 190, 20, 67, 79, 114, 125, 137, 172, 184}
OBSERVED_SOLAR = {13, 25, 72, 119, 131, 178, 78, 125, 137, 172, 184}
# Table S1: index-letter groups -> glyph cells (red observed + blue reconstructed)
TABLE_S1 = {55: "SH", 154: "H", 8: "SH", 201: "H", 25: "H", 31: "H", 184: "SH", 72: "H",
            90: "SH", 213: "H", 172: "SH", 37: "SH", 125: "SH", 84: "SH", 78: "H",
            131: "SH", 178: "SH", 207: "H"}


def test_observed_glyphs_are_reproduced():
    g = {x.month: x for x in glyph_table()}
    missing_l = sorted(m for m in OBSERVED_LUNAR if m not in g or not g[m].lunar)
    missing_s = sorted(m for m in OBSERVED_SOLAR if m not in g or not g[m].solar)
    assert not missing_l, f"lunar glyphs not reproduced: {missing_l}"
    assert not missing_s, f"solar glyphs not reproduced: {missing_s}"


def test_index_letter_groups():
    g = {x.month: x for x in glyph_table()}
    bad = {}
    for m, kind in TABLE_S1.items():
        want = ("S" in kind, "H" in kind)
        got = (g[m].lunar, g[m].solar) if m in g else (False, False)
        if want != got:
            bad[m] = (kind, got)
    assert not bad, bad


def test_counts():
    assert counts(glyph_table()) == (51, 38, 28)

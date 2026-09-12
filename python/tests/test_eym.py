from mech.eym import glyph_table, counts


def test_freeth_2014_counts():
    g = glyph_table()
    assert counts(g) == (51, 38, 28)


def test_known_cells():
    g = {x.month: x for x in glyph_table()}
    assert g[78].solar and not g[78].lunar        # "Glyph 78 shows a predicted solar eclipse"
    assert 1 not in g or not g[1].lunar           # epoch full moon is not itself an eclipse cell? (checked in calibration)


def test_pattern_intervals():
    lun = [x.month for x in glyph_table() if x.lunar]
    gaps = {b - a for a, b in zip(lun, lun[1:])}
    assert gaps <= {5, 6}                          # Babylonian 8-7-8-7-8 rhythm in 6/5-month steps

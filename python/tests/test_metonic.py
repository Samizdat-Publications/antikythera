"""The Metonic calendar's month structure against the constraints of Freeth et al. 2008 SI 3.3."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools"))
from gen_dial_textures import metonic_cells  # noqa: E402

CELLS = metonic_cells()


def first_cells():
    return [i + 1 for i, (_y, _m, first) in enumerate(CELLS) if first]


def intercalary_cells():
    """The cell of each repeated month: the second of two consecutive cells with the same month."""
    return [i + 1 for i in range(1, 235) if CELLS[i][1] == CELLS[i - 1][1]]


def test_235_months_19_years():
    assert len(CELLS) == 235
    assert len(first_cells()) == 19


def test_intercalations_where_the_inscriptions_put_them():
    ic = intercalary_cells()
    assert len(ic) == 7
    assert sum(2 < c <= 37 for c in ic) == 2          # "two intercalary months fell between cells 2 and 37"
    assert sum(49 < c <= 87 for c in ic) == 1         # "one between cells 49 and 87"
    assert sum(96 < c <= 133 for c in ic) == 2        # "two between cells 96 and 133"
    assert sum(142 < c <= 175 for c in ic) == 1       # "one between cells 142 and 175"
    assert sum(c > 189 for c in ic) == 1              # "and one after cell 189"


def test_simple_hypothesis_and_year_12():
    assert CELLS[30][1] == CELLS[31][1] == 6          # cells 31 and 32 both Eukleios
    assert 137 not in first_cells()                    # year 12 must not begin in cell 137

import math
from mech.pinslot import slot_angle, correction, amplitude, follower_angle, LUNAR_D_MM, LUNAR_R_MM


def test_amplitude_matches_literature():
    assert abs(math.degrees(amplitude(LUNAR_D_MM, LUNAR_R_MM)) - 6.53) < 0.01


def test_correction_bounded_by_amplitude():
    amp = amplitude(LUNAR_D_MM, LUNAR_R_MM)
    worst = max(abs(correction(t * 2 * math.pi / 3600, LUNAR_D_MM, LUNAR_R_MM)) for t in range(3600))
    assert worst <= amp + 1e-12
    assert worst > amp - 1e-4


def test_zero_offset_is_identity():
    for t in (0.1, 1.0, 3.0, -2.0):
        assert abs(correction(t, 0.0, 10.0)) < 1e-12


def test_one_turn_per_turn():
    # the slotted gear completes exactly one turn per turn of the pin gear
    a0 = slot_angle(0.0, LUNAR_D_MM, LUNAR_R_MM)
    assert abs(a0) < 1e-12
    assert abs(correction(math.pi, LUNAR_D_MM, LUNAR_R_MM)) < 1e-12


def test_follower_reduces_to_carrier_when_pin_on_centreline():
    assert abs(follower_angle(0.7, 0.7, 30.0, 10.0) - 0.7) < 1e-12

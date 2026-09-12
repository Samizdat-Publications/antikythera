"""The pin-and-slot device (k1/k2 and the superior-planet modules) and the
pin-and-follower device (inferior planets, true sun). All angles in radians.

Geometry, in the carrier's frame: the slotted gear's axis at the origin, the pin
gear's axis at (d, 0). The pin sits at radius r from the pin gear's axis. The
slot forces the slotted gear to point at the pin, so
    theta_slot = atan2(r sin theta_pin, d + r cos theta_pin)
which is exact and singularity-free for d < r. The correction
    delta = theta_slot - theta_pin
has amplitude asin(d / r).
"""
from __future__ import annotations
import math

TAU = 2 * math.pi


def slot_angle(theta_pin: float, d: float, r: float) -> float:
    return math.atan2(r * math.sin(theta_pin), d + r * math.cos(theta_pin))


def correction(theta_pin: float, d: float, r: float) -> float:
    """Signed deviation of the slotted gear from uniform rotation, in (-pi, pi]."""
    delta = slot_angle(theta_pin, d, r) - theta_pin
    return (delta + math.pi) % TAU - math.pi


def amplitude(d: float, r: float) -> float:
    return math.asin(d / r)


def follower_angle(theta_carrier: float, theta_epicycle: float, i: float, d: float) -> float:
    """Pin-and-follower: a pin at radius d on an epicycle whose centre sits at
    radius i from the central axis; a slotted follower pivoting on the central
    axis points at the pin.  theta_epicycle is the epicycle's WORLD angle."""
    x = i * math.cos(theta_carrier) + d * math.cos(theta_epicycle)
    y = i * math.sin(theta_carrier) + d * math.sin(theta_epicycle)
    return math.atan2(y, x)


# Lunar anomaly as built (Freeth 2006/2012): axes 1.1 mm apart, pin near the
# pitch circle of a 50-tooth gear. r = 9.67 mm reproduces the 6.53 deg amplitude
# quoted in the literature; k1's pitch radius (13.0 mm) would give 4.85 deg.
LUNAR_D_MM = 1.1
LUNAR_R_MM = 9.67

"""Procedural surface maps for the bronze, drawn in millimetres so the same texel
density lands on every part (Pillow + numpy, no downloads).

    python tools/gen_surface_maps.py

Writes to assets/textures:
    bronze_spun_normal.png     lathe-turned bronze: concentric brushing about the tile centre.
                               Meant for gears, rings and discs whose UVs are centred on the axis
                               (blender/surface.py projects local XY / SPAN_MM + 0.5).
    bronze_brushed_normal.png  hand-scraped plate: linear brushing along X plus hammered undulation.
                               Tileable (built in the frequency domain).
    bronze_rough.png           roughness variation (tarnish blotches, polishing zones), tileable.
    bronze_albedo.png          warm bronze with faint mottling, tileable.
    <dial>_normal.png          tangent-space normals derived from each <dial>_bump.png so the
                               engravings shade correctly (the glTF exporter cannot export a Bump node).

Normal maps use the OpenGL convention (+Y up), which is what both Blender and three.js expect.
"""
from __future__ import annotations

import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "textures")
os.makedirs(OUT, exist_ok=True)

PX = 2048
SPAN_MM = 160.0                 # one tile covers 160 mm; keep in step with blender/surface.py
PX_PER_MM = PX / SPAN_MM
rng = np.random.default_rng(20260913)


# ----------------------------------------------------------------------------- noise
def fft_noise(n: int, sigma_px: float, aniso: tuple[float, float] = (1.0, 1.0)) -> np.ndarray:
    """Periodic Gaussian-filtered white noise, unit variance. aniso stretches the blur (x, y)."""
    white = rng.standard_normal((n, n))
    f = np.fft.fft2(white)
    kx = np.fft.fftfreq(n)[None, :]
    ky = np.fft.fftfreq(n)[:, None]
    sx, sy = sigma_px * aniso[0], sigma_px * aniso[1]
    w = np.exp(-2 * np.pi ** 2 * ((sx * kx) ** 2 + (sy * ky) ** 2))
    out = np.real(np.fft.ifft2(f * w))
    return out / (out.std() + 1e-9)


def noise_1d(n: int, sigma_px: float) -> np.ndarray:
    white = rng.standard_normal(n)
    f = np.fft.fft(white)
    k = np.fft.fftfreq(n)
    out = np.real(np.fft.ifft(f * np.exp(-2 * np.pi ** 2 * (sigma_px * k) ** 2)))
    return out / (out.std() + 1e-9)


def height_to_normal(h: np.ndarray, strength: float, wrap: bool = True) -> np.ndarray:
    """h in arbitrary units; strength = dz per unit of slope. Returns uint8 RGB."""
    if wrap:
        dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5
        dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * 0.5
    else:
        dy, dx = np.gradient(h)
    nx = -dx * strength
    ny = dy * strength          # image rows go down; +Y in tangent space is up
    nz = np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    rgb = np.stack([nx / l, ny / l, nz / l], axis=-1)
    return np.clip((rgb * 0.5 + 0.5) * 255.0 + 0.5, 0, 255).astype(np.uint8)


def save(name: str, arr: np.ndarray, mode: str = "RGB") -> str:
    path = os.path.join(OUT, name)
    Image.fromarray(arr, mode).save(path, optimize=True)
    return path


# ----------------------------------------------------------------------------- bronze
def spun_normal() -> np.ndarray:
    """Concentric turning marks about the tile centre, pitch ~0.3 mm, plus fine grain."""
    yy, xx = np.mgrid[0:PX, 0:PX].astype(np.float64)
    c = (PX - 1) / 2
    r = np.hypot(xx - c, yy - c)
    rings = noise_1d(4096, 1.6 * PX_PER_MM / 12.8)       # ~2 px features at 12.8 px/mm
    zones = noise_1d(4096, 14.0)                            # polishing zones, ~1 mm
    rr = np.clip(r, 0, 4095)
    h = 0.55 * np.interp(rr, np.arange(4096), rings) + 0.35 * np.interp(rr, np.arange(4096), zones)
    h += 0.22 * fft_noise(PX, 0.7)                          # grain
    h *= 0.9
    return height_to_normal(h, strength=0.16, wrap=False)


def brushed_normal() -> np.ndarray:
    """Linear brushing along X (streaks vary along Y) over a hammered, softly undulating plate."""
    streaks = fft_noise(PX, 0.9, aniso=(28.0, 1.0))         # long along X, fine along Y
    breaks = fft_noise(PX, 6.0, aniso=(1.0, 3.0))           # streak segments
    hammered = fft_noise(PX, 9.0 * PX_PER_MM / 12.8 * 1.2)  # dents ~9 mm
    undulation = fft_noise(PX, 26.0 * PX_PER_MM / 12.8)     # slow warp ~26 mm
    grain = fft_noise(PX, 0.7)
    h = 0.5 * streaks * (0.6 + 0.4 * np.tanh(breaks)) + 0.9 * hammered + 1.6 * undulation + 0.18 * grain
    return height_to_normal(h, strength=0.075, wrap=True)


def tarnish_mask() -> np.ndarray:
    """Rare, soft dull patches (~30 mm) with ragged edges; shared by roughness and albedo."""
    blotch = fft_noise(PX, 30.0 * PX_PER_MM / 12.8) + 0.35 * fft_noise(PX, 6.0 * PX_PER_MM / 12.8)
    return np.clip((blotch - 1.35) * 0.9, 0, 1)


TARNISH = None


def roughness() -> np.ndarray:
    global TARNISH
    TARNISH = tarnish_mask() if TARNISH is None else TARNISH
    fine = fft_noise(PX, 3.0 * PX_PER_MM / 12.8)
    zones = fft_noise(PX, 60.0 * PX_PER_MM / 12.8)
    r = 0.40 + 0.035 * fine + 0.06 * zones + 0.20 * TARNISH
    r = np.clip(r, 0.26, 0.74)
    g = np.clip(r * 255 + 0.5, 0, 255).astype(np.uint8)
    return np.stack([g, g, g], axis=-1)


def albedo() -> np.ndarray:
    global TARNISH
    TARNISH = tarnish_mask() if TARNISH is None else TARNISH
    base = np.array([0.78, 0.55, 0.28])                     # sRGB-ish warm bronze
    dark = np.array([0.50, 0.34, 0.17])
    fine = fft_noise(PX, 2.5 * PX_PER_MM / 12.8)
    mott = 1.0 + 0.035 * fine + 0.04 * fft_noise(PX, 9.0 * PX_PER_MM / 12.8) + 0.04 * fft_noise(PX, 60.0 * PX_PER_MM / 12.8)
    col = base[None, None, :] * mott[..., None]
    # the tarnish shows mainly as dullness (roughness); in the colour it is only a faint shadow
    col = col * (1 - 0.14 * TARNISH[..., None]) + dark[None, None, :] * (0.14 * TARNISH[..., None])
    return np.clip(col * 255 + 0.5, 0, 255).astype(np.uint8)


# ----------------------------------------------------------------------------- dials
def dial_normals() -> list[str]:
    """Derive a normal map from every dial bump map (white = raised bronze, dark = engraved)."""
    spec_path = os.path.join(OUT, "dials.json")
    names = [d["name"] for d in json.load(open(spec_path, encoding="utf-8"))["dials"]] if os.path.exists(spec_path) \
        else ["front_dial", "back_upper", "back_lower", "parapegma_upper", "parapegma_lower"]
    written = []
    for name in names:
        src = os.path.join(OUT, name + "_bump.png")
        if not os.path.exists(src):
            continue
        h = np.asarray(Image.open(src).convert("L"), dtype=np.float64) / 255.0
        # engraved lines are 2-4 px wide at 4096 px; strength 5 gives ~60 deg walls
        written.append(save(name + "_normal.png", height_to_normal(h, strength=5.0, wrap=False)))
    return written


def main() -> None:
    paths = [
        save("bronze_spun_normal.png", spun_normal()),
        save("bronze_brushed_normal.png", brushed_normal()),
        save("bronze_rough.png", roughness()),
        save("bronze_albedo.png", albedo()),
    ]
    paths += dial_normals()
    for p in paths:
        print(os.path.relpath(p, ROOT), os.path.getsize(p) // 1024, "KB")


if __name__ == "__main__":
    main()

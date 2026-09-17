"""The launch icons and the share image (Pillow, no downloads).

    python tools/gen_icons.py

Writes to web/public:
    icons/icon-180.png           the apple-touch-icon
    icons/icon-192.png           manifest icon, purpose "any"
    icons/icon-512.png           manifest icon, purpose "any"
    icons/icon-512-maskable.png  the same motif inside the central 80 %, so a round mask keeps it whole
    og.jpg                       the 1200x630 share image, cut from docs/renders/hero.jpg

The motif is the one web/index.html already carries as an SVG data URI: a bronze ring of
radius 13/32, stroked 3/32 wide and dashed 2.6 on, 1.5 off, with a filled bronze disc of
radius 4/32 at the centre, on a lamp-black square. Everything is drawn at four times its
final size and downsampled with LANCZOS, which is where the smooth edges come from.
Re-running writes the same files again.
"""
from __future__ import annotations

import math
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "web", "public")
ICONS = os.path.join(PUBLIC, "icons")
HERO = os.path.join(ROOT, "docs", "renders", "hero.jpg")

LAMP_BLACK = (0x17, 0x12, 0x0E)
BRONZE = (0xC9, 0x97, 0x3F)
SS = 4                      # drawn at four times the final size, then downsampled

# the favicon's own numbers, in units where the square is 32 across
RING_R = 13 / 32
RING_W = 3 / 32
DASH_ON = 2.6 / 32
DASH_OFF = 1.5 / 32
DISC_R = 4 / 32

OG_W, OG_H = 1200, 630
OG_QUALITY = 88


def motif(size: int, inset: float = 1.0) -> Image.Image:
    """The dashed ring and its centre disc on lamp-black, `size` pixels square.

    `inset` shrinks the motif about the centre without shrinking the square, which is what
    a maskable icon needs: the launcher bites the corners off and the ring still comes through.
    """
    n = size * SS
    im = Image.new("RGB", (n, n), LAMP_BLACK)
    draw = ImageDraw.Draw(im)
    c = n / 2
    r = RING_R * n * inset
    w = RING_W * n * inset
    # Pillow grows a stroke inward from the bounding box, so the box is the ring's outer edge
    outer = r + w / 2
    box = (c - outer, c - outer, c + outer, c + outer)
    # the dash pattern is a length along the circumference; turn it into degrees of arc
    circumference = 2 * math.pi * r
    on = DASH_ON * n * inset / circumference * 360
    period = (DASH_ON + DASH_OFF) * n * inset / circumference * 360
    angle = 0.0
    while angle < 360:
        draw.arc(box, angle, min(angle + on, 360), fill=BRONZE, width=round(w))
        angle += period
    disc = DISC_R * n * inset
    draw.ellipse((c - disc, c - disc, c + disc, c + disc), fill=BRONZE)
    return im.resize((size, size), Image.Resampling.LANCZOS)


def share_image() -> str:
    """The hero render scaled until its short side fills the 1200x630 window, then centre-cropped."""
    with Image.open(HERO) as src:
        im = src.convert("RGB")
    scale = max(OG_W / im.width, OG_H / im.height)
    w, h = round(im.width * scale), round(im.height * scale)
    im = im.resize((w, h), Image.Resampling.LANCZOS)
    left, top = (w - OG_W) // 2, (h - OG_H) // 2
    im = im.crop((left, top, left + OG_W, top + OG_H))
    path = os.path.join(PUBLIC, "og.jpg")
    im.save(path, "JPEG", quality=OG_QUALITY, progressive=True)
    return path


def main() -> None:
    os.makedirs(ICONS, exist_ok=True)
    written = [os.path.join(ICONS, "icon-%d.png" % s) for s in (180, 192, 512)]
    for size, path in zip((180, 192, 512), written):
        motif(size).save(path)
    maskable = os.path.join(ICONS, "icon-512-maskable.png")
    motif(512, inset=0.8).save(maskable)
    written.append(maskable)
    written.append(share_image())
    for path in written:
        with Image.open(path) as im:
            print(os.path.relpath(path, ROOT).replace(os.sep, "/"),
                  "%dx%d" % im.size, os.path.getsize(path) // 1024, "KB")


if __name__ == "__main__":
    main()
